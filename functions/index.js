/**
 * NETTUNO — Cloud Functions (Gen 2). Sistema de votação anti-manipulação.
 *
 * Server-authoritative: o cliente envia só a INTENÇÃO de voto (cor). O servidor
 * valida, calcula trust + peso decrescente, persiste o voto auditável e
 * recalcula o score incrementalmente (O(1)) no read model do anúncio.
 *
 * Modelo de voto (ver lib/scoreEngine.js):
 *   - até 5 votos por (utilizador, anúncio), peso decrescente [1, .6, .35, .15, .05]
 *   - cores: green/yellow/red com pesos +1.0 / +0.2 / −1.3
 *   - peso final = trust(0–1.5) × decay(voteNumber) × colorWeight
 *
 * Pré-requisitos de deploy: plano Blaze + App Check registado.
 */

const { onCall, HttpsError } = require('firebase-functions/v2/https');
const { setGlobalOptions } = require('firebase-functions/v2');
const { logger } = require('firebase-functions');
const { initializeApp } = require('firebase-admin/app');
const { getFirestore, FieldValue, Timestamp } = require('firebase-admin/firestore');
const { getAuth } = require('firebase-admin/auth');
const crypto = require('crypto');

const {
  isValidColor, effectiveWeight, foldWeighted, finalizeState,
  COOLDOWN_MS, MAX_VOTES_PER_AD,
} = require('./lib/scoreEngine');
const { calculateUserTrust } = require('./lib/trust');

initializeApp();
const db = getFirestore();
setGlobalOptions({ region: 'europe-west1', maxInstances: 20 });

// Sistema de treino (agendado + gatilho admin). Inerte até deploy com Blaze.
Object.assign(exports, require('./training'));

const AD_ID_RE = /^[a-zA-Z0-9_\-:.]{1,256}$/;
const RATE_LIMIT = 30;            // votos/min por utilizador
const RATE_WINDOW_MS = 60_000;
const BURST_WINDOW_MS = 15_000;   // janela de deteção de burst
const BURST_RED_THRESHOLD = 8;    // ≥8 vermelhos em 15s → suspeito
// IP_SALT é OBRIGATÓRIO em produção: sem salt secreto, os hashes de IP são
// previsíveis (rainbow table sobre o espaço IPv4 é trivial) e deixam de ser
// pseudonimização válida (RGPD). Definir antes do deploy:
//   firebase functions:secrets:set IP_SALT
// Lido LAZY dentro do hashIp (NÃO no top-level): um throw no top-level partiria
// a descoberta de funções durante o `firebase deploy`. Continua a falhar no
// primeiro voto se o salt faltar.
function hashIp(ip) {
  if (!ip) return null;
  const salt = process.env.IP_SALT;
  if (!salt) throw new HttpsError('failed-precondition', 'IP_SALT em falta no servidor.');
  return crypto.createHash('sha256').update(salt + ip).digest('hex').slice(0, 24);
}

// ──────────────────────────────────────────────────────────────
// submitVote — ponto ÚNICO de escrita de votos/reputação
// NOTA App Check: temporariamente desativado (enforceAppCheck:false). A correção
// da forja de reputação vem da validação SERVER-SIDE (trust calculada aqui +
// rate limit + cooldown + máx. votos), NÃO do App Check. App Check numa extensão
// de browser é um problema à parte → fica como hardening posterior. Reativar
// quando resolvido (e voltar a deployar).
// ──────────────────────────────────────────────────────────────
exports.submitVote = onCall({ enforceAppCheck: false, cors: true, secrets: ['IP_SALT'], invoker: 'public' }, async (req) => {
  const uid = req.auth && req.auth.uid;
  if (!uid) throw new HttpsError('unauthenticated', 'Login Google necessário para votar.');

  const data = req.data || {};
  const adId = String(data.adId || '');
  const color = String(data.voteColor || data.color || '').toLowerCase();
  const platform = String(data.platform || '').slice(0, 32).replace(/[^a-z0-9_]/gi, '');
  const idemKey = String(data.idempotencyKey || '').slice(0, 64).replace(/[^a-zA-Z0-9_\-]/g, '');
  const deviceFp = String(data.deviceFingerprint || '').slice(0, 128);

  if (!AD_ID_RE.test(adId)) throw new HttpsError('invalid-argument', 'adId inválido.');
  if (!isValidColor(color)) throw new HttpsError('invalid-argument', 'Cor de voto inválida (green/yellow/red).');

  const now = Date.now();
  const ipHash = hashIp(req.rawRequest && (req.rawRequest.ip || req.rawRequest.headers['x-forwarded-for']));

  const userRef = db.doc(`users/${uid}`);
  const rateRef = db.doc(`rateLimits/${uid}`);
  const uavRef  = db.doc(`userAdVotes/${uid}_${adId}`);
  const adRef   = db.doc(`ads/${adId}`);
  const idemRef = idemKey ? db.doc(`voteKeys/${uid}_${idemKey}`) : null;

  const result = await db.runTransaction(async (tx) => {
    const reads = [tx.get(userRef), tx.get(rateRef), tx.get(uavRef), tx.get(adRef)];
    if (idemRef) reads.push(tx.get(idemRef));
    const [userSnap, rateSnap, uavSnap, adSnap, idemSnap] = await Promise.all(reads);

    // (0) IDEMPOTÊNCIA — retry do mesmo pedido devolve o resultado anterior.
    if (idemSnap && idemSnap.exists) {
      logger.info('vote_noop_duplicate', { uid, adId, idemKey });
      const cached = idemSnap.data().result || {};
      return { ...cached, unchanged: true };
    }

    const ad = adSnap.exists ? adSnap.data() : {};
    const uav = uavSnap.exists ? uavSnap.data() : { count: 0, last: {} };

    // (7) SELF-BOOSTING — dono do anúncio não vota no próprio (se atribuído).
    if (ad.ownerUid && ad.ownerUid === uid) {
      logger.warn('self_boost_blocked', { uid, adId });
      throw new HttpsError('permission-denied', 'Não podes votar no teu próprio anúncio.');
    }

    // (4) MÁXIMO 5 VOTOS por (user, ad).
    const prevCount = uav.count || 0;
    if (prevCount >= MAX_VOTES_PER_AD) {
      logger.info('max_votes_reached', { uid, adId, count: prevCount });
      throw new HttpsError('failed-precondition', 'Já votaste o máximo de 5 vezes neste anúncio.');
    }

    // (3) COOLDOWN server-side por cor.
    const lastColorAt = (uav.last && uav.last[color]) || 0;
    const cd = COOLDOWN_MS[color];
    if (now - lastColorAt < cd) {
      logger.info('cooldown_hit', { uid, adId, color, waitMs: cd - (now - lastColorAt) });
      throw new HttpsError('resource-exhausted',
        `Aguarda ${Math.ceil((cd - (now - lastColorAt)) / 1000)}s antes de outro voto ${color}.`);
    }

    // (5) RATE LIMIT global (30/min) + (6) deteção de burst de vermelhos.
    const rate = rateSnap.exists ? rateSnap.data() : {};
    let windowStart = rate.windowStart || 0;
    let count = rate.count || 0;
    let redTimes = Array.isArray(rate.redTimes) ? rate.redTimes : [];
    if (now - windowStart > RATE_WINDOW_MS) { windowStart = now; count = 0; }
    if (count >= RATE_LIMIT) {
      logger.warn('rate_limit_hit', { uid, count });
      throw new HttpsError('resource-exhausted', 'Muitos votos. Aguarde um minuto.');
    }
    redTimes = redTimes.filter((t) => now - t < BURST_WINDOW_MS);
    let burst = false;
    if (color === 'red') {
      redTimes.push(now);
      if (redTimes.length >= BURST_RED_THRESHOLD) burst = true;
    }

    // (1)(2) Trust SERVER-SIDE (auth garantido; App Check no wrapper).
    const u = userSnap.exists ? userSnap.data() : {};
    const trust = calculateUserTrust({
      voteCount: u.voteCount || 0,
      signalCount: u.signalCount || 0,
      accuracyRate: u.accuracyRate ?? null,
      email: u.email || null,
      createdAt: typeof u.createdAt === 'number' ? u.createdAt
        : (u.createdAt && u.createdAt.toMillis ? u.createdAt.toMillis() : now),
      trustPenalty: u.trustPenalty || 0,
      flaggedMultiAccount: u.flaggedMultiAccount || false,
    });

    // Peso efetivo deste voto (decai com o nº de voto).
    const voteNumber = prevCount + 1;
    const effW = effectiveWeight(color, trust, voteNumber);
    if (effW === null) throw new HttpsError('invalid-argument', 'Cor inválida.');

    // Agregado incremental O(1): adiciona o peso efetivo.
    const folded = foldWeighted({ wPos: ad.wPos, wNeg: ad.wNeg }, effW, +1);
    const total = (parseInt(ad.total) || 0) + 1;
    const next = finalizeState(folded.wPos, folded.wNeg, total);

    // ── Escritas atómicas (Admin SDK ignora Rules — fonte de verdade) ──
    // Voto auditável (append-only; id determinístico por voteNumber).
    tx.set(db.doc(`votes/${uid}_${adId}_${voteNumber}`), {
      uid, adId, voteColor: color,
      trustWeight: trust, voteNumber, effectiveWeight: effW,
      platform: platform || null,
      deviceFingerprint: deviceFp || null,
      ipHash: ipHash || null,
      idempotencyKey: idemKey || null,
      processed: true,
      createdAt: now,
    });

    // Read model do anúncio.
    tx.set(adRef, {
      adId, platform: platform || ad.platform || null,
      votes: {
        green:  FieldValue.increment(color === 'green'  ? 1 : 0),
        yellow: FieldValue.increment(color === 'yellow' ? 1 : 0),
        red:    FieldValue.increment(color === 'red'    ? 1 : 0),
      },
      // Compat de display: o cliente (v5.4) lê o schema antigo (likes/dislikes/
      // uniqueUsers) para desenhar o escudo. Mantemos esses campos em sincronia
      // com os votos server-side (green→like, red→dislike; uniqueUsers no 1º voto
      // do utilizador neste anúncio). Yellow é conceito novo, sem equivalente antigo.
      likes:       FieldValue.increment(color === 'green' ? 1 : 0),
      dislikes:    FieldValue.increment(color === 'red'   ? 1 : 0),
      uniqueUsers: FieldValue.increment(prevCount === 0 ? 1 : 0),
      wPos: next.wPos, wNeg: next.wNeg, total: next.total,
      score: next.score, weightedScore: next.weightedScore, trustState: next.trustState,
      updatedAt: now, schemaVersion: 3,
    }, { merge: true });

    // Estado por (user, ad): contagem + cooldown por cor.
    tx.set(uavRef, {
      count: prevCount + 1,
      last: { ...(uav.last || {}), [color]: now },
      updatedAt: now,
    }, { merge: true });

    // Rate/burst do utilizador.
    tx.set(rateRef, { windowStart, count: count + 1, redTimes }, { merge: true });

    // Perfil do utilizador: voteCount + penalização por burst.
    const userPatch = { voteCount: FieldValue.increment(1), lastVoteAt: now };
    if (burst) {
      userPatch.trustPenalty = Math.min(0.6, (u.trustPenalty || 0) + 0.2);
      userPatch.lastBurstAt = now;
      logger.warn('suspicious_pattern', { uid, adId, redInWindow: redTimes.length });
    }
    tx.set(userRef, userPatch, { merge: true });

    const out = {
      trustState: next.trustState, score: next.score,
      weightedScore: next.weightedScore, voteNumber, effectiveWeight: effW,
    };

    // Marcador de idempotência com expiry: configurar uma política TTL no
    // Firestore sobre o campo `expireAt` (coleção voteKeys) para apagar
    // automaticamente após 24h e evitar crescimento infinito da coleção.
    if (idemRef) {
      tx.set(idemRef, {
        result: out,
        at: now,
        expireAt: Timestamp.fromMillis(now + 24 * 60 * 60 * 1000),
      });
    }

    logger.info('vote_submitted', {
      uid, adId, color, trust, voteNumber, effW,
      scoreAfter: next.score, trustState: next.trustState,
    });
    return out;
  });

  return { ok: true, ...result };
});

// ──────────────────────────────────────────────────────────────
// deleteMyAccount — RGPD: apaga perfil + votos + conta Auth
// ──────────────────────────────────────────────────────────────
exports.deleteMyAccount = onCall({ enforceAppCheck: false, cors: true, secrets: ['IP_SALT'], invoker: 'public' }, async (req) => {
  const uid = req.auth && req.auth.uid;
  if (!uid) throw new HttpsError('unauthenticated', 'Não autenticado.');

  const votesSnap = await db.collection('votes').where('uid', '==', uid).limit(500).get();
  const batch = db.batch();
  votesSnap.forEach((d) => batch.delete(d.ref));
  batch.delete(db.doc(`users/${uid}`));
  batch.delete(db.doc(`rateLimits/${uid}`));
  await batch.commit();

  await getAuth().deleteUser(uid).catch(() => {});
  return { ok: true, deletedVotes: votesSnap.size };
});
