/**
 * NETTUNO — Sistema de Treino (Cloud Functions, Gen 2)
 * ---------------------------------------------------------------------------
 * Aprende com os votos REAIS da comunidade e calibra as heurísticas locais.
 * Tudo offline/agendado — NÃO afeta o caminho de voto em tempo real.
 *
 * Produz UM documento público de configuração: `config/learned`
 *   {
 *     weights:   { <signalType>: <predictiveness 0..1> },  // reponderação
 *     baselines: { <fingerprint>: { median, n } },          // preço por produto
 *     updatedAt, sampleCount
 *   }
 * A extensão lê este doc (leitura pública) e aplica via Heuristics.applyLearned().
 *
 * PRÉ-REQUISITO DE DEPLOY: plano Blaze. Enquanto não fizeres deploy, isto fica
 * inerte (zero custo). Deploy: `firebase deploy --only functions:trainHeuristics`.
 * ---------------------------------------------------------------------------
 */

const { onSchedule } = require('firebase-functions/v2/scheduler');
const { onCall, HttpsError } = require('firebase-functions/v2/https');
const { logger } = require('firebase-functions');
const { getFirestore, FieldValue } = require('firebase-admin/firestore');

// initializeApp() já é chamado em index.js (mesmo processo).
const db = getFirestore();

const MIN_SAMPLES_SIGNAL = 20;   // nº mínimo de votos com o sinal p/ confiar
const MIN_SAMPLES_PRICE  = 5;    // nº mínimo de anúncios por fingerprint
const MAX_BASELINES      = 5000; // teto do doc de config
const VOTES_SCAN_LIMIT   = 20000;

function median(nums) {
  if (!nums.length) return 0;
  const s = nums.slice().sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
}

/**
 * Núcleo do treino — partilhado pelo agendamento e pelo gatilho manual (admin).
 * Lê `votes`, cruza heuristicFlags × verdicto, e agrega preços por fingerprint.
 */
async function runTraining() {
  const snap = await db.collection('votes').limit(VOTES_SCAN_LIMIT).get();
  if (snap.empty) {
    logger.info('[train] sem votos — nada a treinar');
    return { ok: true, sampleCount: 0 };
  }

  // ── 1. Reponderação de sinais (PONDERADA PELA TEIA DE VOTOS) ──
  // Para cada sinal, P(dislike | sinal) — mas cada voto pesa pela CONFIANÇA do
  // votante (userTrustAtVote/trustWeight). Um votante veterano vale mais que uma
  // conta nova → resistente a brigading. `n` (contagem crua) gate de amostra.
  const signalStats = {};                 // type -> { n, wTotal, wDislikes }
  let gW = 0, gWDis = 0, globalTotal = 0;

  // ── 1b. SINAIS HUMANOS (botões que o utilizador clica: "Preço fora da
  // realidade", "Fotos geradas por IA", "MB Way"...). São os melhores labels —
  // o humano diz a RAZÃO, não só o veredicto. Vêm de topSignalsAtVote. ──
  const humanStats = {};                  // signal -> { n, wTotal, wDislikes }

  // ── 2. Baselines de preço por produto (fingerprint) ──
  const priceByFp = {};                   // fp -> [prices]

  const trustOf = (d) => Math.max(0, Math.min(1.5,
    Number(d.trustWeight != null ? d.trustWeight : (d.userTrustAtVote != null ? d.userTrustAtVote : 1)) || 1));

  snap.forEach(doc => {
    const d = doc.data() || {};
    // Ignora votos removidos (toggle-off): voteType neutralizado para null.
    if (d.removed || (d.voteType !== 'like' && d.voteType !== 'dislike')) return;
    const isDislike = d.voteType === 'dislike' || d.value === -1;
    const t = trustOf(d);
    globalTotal++;
    gW += t; if (isDislike) gWDis += t;

    const flags = Array.isArray(d.heuristicFlags) ? d.heuristicFlags : [];
    flags.forEach(type => {
      const s = signalStats[type] || (signalStats[type] = { n: 0, wTotal: 0, wDislikes: 0 });
      s.n++; s.wTotal += t;
      if (isDislike) s.wDislikes += t;
    });

    // sinais humanos clicados no anúncio no momento do voto
    const hs = Array.isArray(d.topSignalsAtVote) ? d.topSignalsAtVote : [];
    hs.forEach(o => {
      const name = o && o.signal;
      if (!name) return;
      const s = humanStats[name] || (humanStats[name] = { n: 0, wTotal: 0, wDislikes: 0 });
      s.n++; s.wTotal += t;
      if (isDislike) s.wDislikes += t;
    });

    const fp = d.fingerprint;
    const price = Number(d.price);
    if (fp && price > 0) (priceByFp[fp] || (priceByFp[fp] = [])).push(price);
  });

  // baseRate ponderada pela confiança (não pela contagem crua)
  const baseRate = gW ? gWDis / gW : 0.5;

  // Posterior Beta (Bayes): predictividade = (dislikes + prior) / (total + força).
  // Prior centrado na baseRate global com força K → poucos dados ficam perto
  // da base (não tira conclusões precipitadas); com muitos dados, domina o real.
  const K = 5;
  const beta = (s) => (s.wDislikes + baseRate * K) / (s.wTotal + K);

  // pesos das HEURÍSTICAS automáticas
  const weights = {};
  for (const [type, s] of Object.entries(signalStats)) {
    if (s.n < MIN_SAMPLES_SIGNAL) continue;
    weights[type] = Number(Math.max(0, Math.min(1, beta(s))).toFixed(3));
  }

  // pesos dos SINAIS HUMANOS (botões clicados) — os melhores labels
  const signalWeights = {};
  for (const [name, s] of Object.entries(humanStats)) {
    if (s.n < MIN_SAMPLES_SIGNAL) continue;
    signalWeights[name] = Number(Math.max(0, Math.min(1, beta(s))).toFixed(3));
  }

  // baselines: mediana de preço por fingerprint com amostra suficiente
  const baselines = {};
  let count = 0;
  for (const [fp, prices] of Object.entries(priceByFp)) {
    if (prices.length < MIN_SAMPLES_PRICE) continue;
    if (count++ >= MAX_BASELINES) break;
    baselines[fp] = { median: Math.round(median(prices)), n: prices.length };
  }

  await db.collection('config').doc('learned').set({
    weights,
    signalWeights,
    baselines,
    baseRate: Number(baseRate.toFixed(3)),
    sampleCount: globalTotal,
    updatedAt: FieldValue.serverTimestamp()
  }, { merge: true });

  logger.info(`[train] OK — votos=${globalTotal} heur=${Object.keys(weights).length} sinais=${Object.keys(signalWeights).length} baselines=${Object.keys(baselines).length}`);
  return { ok: true, sampleCount: globalTotal, heuristics: Object.keys(weights).length, signals: Object.keys(signalWeights).length, baselines: Object.keys(baselines).length };
}

// Agendado: 1x por semana (domingo 04:00 Europe/Lisbon).
exports.trainHeuristics = onSchedule(
  { schedule: 'every sunday 04:00', timeZone: 'Europe/Lisbon', region: 'europe-west1' },
  async () => { await runTraining(); }
);

// Gatilho manual para o admin forçar treino (ex: a partir do dashboard).
exports.trainHeuristicsNow = onCall(
  { region: 'europe-west1', cors: true },
  async (req) => {
    const isAdmin = req.auth && req.auth.token && req.auth.token.admin === true;
    if (!isAdmin) {
      throw new HttpsError('permission-denied', 'Apenas admin.');
    }
    return await runTraining();
  }
);
