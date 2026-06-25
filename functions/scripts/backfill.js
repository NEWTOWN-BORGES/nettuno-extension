/**
 * Backfill one-off — reconstrói o read model `ads/{id}` (pos/neg/total/score/state)
 * a partir dos votos existentes, e repõe `weightedValue` em cada voto (necessário
 * para o voto mutável reverter corretamente após a migração).
 *
 * Porque é preciso: os anúncios atuais têm o schema antigo (likes/dislikes/
 * effectiveLikes) mas NÃO têm pos/neg/total/score. Sem este backfill, o primeiro
 * voto pós-migração começa do zero e a reputação histórica perde-se.
 *
 * COMO CORRER (local ou Cloud Shell, com Admin):
 *   1. Descarregar uma service account key (Console → Definições → Contas de serviço)
 *   2. export GOOGLE_APPLICATION_CREDENTIALS=/caminho/serviceAccount.json
 *   3. cd functions && npm i firebase-admin
 *   4. node scripts/backfill.js            # dry-run (não escreve)
 *      node scripts/backfill.js --commit   # escreve a sério
 *
 * Idempotente: pode correr-se várias vezes (recalcula a partir dos votos).
 */

const admin = require('firebase-admin');
const { effectiveWeight, finalizeState, foldWeighted } = require('../lib/scoreEngine');

// Mapeia o schema antigo (voteType like/dislike) para o novo modelo de cor.
const VOTE_TYPE_TO_COLOR = { like: 'green', dislike: 'red' };

const COMMIT = process.argv.includes('--commit');

admin.initializeApp(); // usa GOOGLE_APPLICATION_CREDENTIALS
const db = admin.firestore();

async function run() {
  console.log(`[backfill] modo: ${COMMIT ? 'COMMIT (escreve)' : 'DRY-RUN (não escreve)'}`);

  // 1. Ler todos os votos, paginado por createdAt.
  const PAGE = 500;
  let last = null;
  const adAgg = new Map();        // adId → { pos, neg, total, platform }
  const voteWeights = [];          // { ref, weightedValue } p/ repor nos votos
  let totalVotes = 0;

  while (true) {
    let q = db.collection('votes').orderBy('createdAt').limit(PAGE);
    if (last) q = q.startAfter(last);
    const snap = await q.get();
    if (snap.empty) break;

    for (const doc of snap.docs) {
      const v = doc.data();
      // Mapeia schema antigo (like/dislike) → cor; aceita já-novo (voteColor).
      const color = v.voteColor || VOTE_TYPE_TO_COLOR[v.voteType] || null;
      if (!color) continue;                            // tipo desconhecido → ignora
      const trust = Math.max(0, Math.min(1.5, v.trustWeight ?? v.userTrustAtVote ?? 1.0));
      // Respeita o voteNumber real (novo modelo). Schema antigo = 1 voto/(user,ad) → 1.
      // Crítico: sem isto, re-correr o backfill após votos do novo modelo aplicaria
      // peso total a votos 2-5 (deviam decair) → agregado errado.
      const voteNumber = v.voteNumber || 1;
      const e = effectiveWeight(color, trust, voteNumber);
      if (e === null || e === 0) continue;  // cor inválida ou peso nulo (voto >5)

      const adId = v.adId;
      if (!adId) continue;
      const agg = adAgg.get(adId)
        || { wPos: 0, wNeg: 0, total: 0, votes: { green: 0, yellow: 0, red: 0 }, platform: v.platform || null };
      const folded = foldWeighted({ wPos: agg.wPos, wNeg: agg.wNeg }, e, +1);
      agg.wPos = folded.wPos; agg.wNeg = folded.wNeg; agg.total += 1;
      agg.votes[color] = (agg.votes[color] || 0) + 1;
      adAgg.set(adId, agg);

      voteWeights.push({ ref: doc.ref, effectiveWeight: e, voteColor: color, voteNumber });
      totalVotes++;
    }
    last = snap.docs[snap.docs.length - 1];
    if (snap.size < PAGE) break;
  }

  console.log(`[backfill] ${totalVotes} votos → ${adAgg.size} anúncios`);

  if (!COMMIT) {
    let i = 0;
    for (const [adId, agg] of adAgg) {
      const s = finalizeState(agg.wPos, agg.wNeg, agg.total);
      console.log(`  ${adId}: ${s.trustState} score=${s.score} (g=${agg.votes.green} y=${agg.votes.yellow} r=${agg.votes.red})`);
      if (++i >= 10) { console.log('  …'); break; }
    }
    console.log('[backfill] DRY-RUN terminado. Use --commit para escrever.');
    return;
  }

  // 2. Escrever read model dos anúncios (em lotes de 400).
  const ads = [...adAgg.entries()];
  for (let i = 0; i < ads.length; i += 400) {
    const batch = db.batch();
    for (const [adId, agg] of ads.slice(i, i + 400)) {
      const s = finalizeState(agg.wPos, agg.wNeg, agg.total);
      batch.set(db.doc(`ads/${adId}`), {
        adId, platform: agg.platform || null,
        votes: agg.votes,
        wPos: s.wPos, wNeg: s.wNeg, total: s.total,
        score: s.score, weightedScore: s.weightedScore, trustState: s.trustState,
        updatedAt: Date.now(), schemaVersion: 3,
      }, { merge: true });
    }
    await batch.commit();
    console.log(`[backfill] ads ${Math.min(i + 400, ads.length)}/${ads.length}`);
  }

  // 3. Repor effectiveWeight/voteColor em cada voto (lotes de 400).
  for (let i = 0; i < voteWeights.length; i += 400) {
    const batch = db.batch();
    for (const { ref, effectiveWeight: ew, voteColor, voteNumber } of voteWeights.slice(i, i + 400)) {
      batch.set(ref, { effectiveWeight: ew, voteColor, voteNumber, processed: true }, { merge: true });
    }
    await batch.commit();
    console.log(`[backfill] votes ${Math.min(i + 400, voteWeights.length)}/${voteWeights.length}`);
  }

  console.log('[backfill] CONCLUÍDO.');
}

run().catch((e) => { console.error('[backfill] ERRO:', e); process.exit(1); });
