/**
 * Tipos partilhados pelo service layer.
 *
 * @typedef {Object} PageMetadata
 * @property {string} [title]       - Título do anúncio (max 200 chars).
 * @property {string} [thumbnail]   - URL da imagem principal (max 500).
 * @property {string} [site]        - Plataforma origem (default = platform param).
 * @property {string} [url]         - URL canónica do anúncio.
 * @property {string} [description] - Descrição (max 280 chars).
 * @property {string} [country]     - ISO-2 (PT/ES/FR/DE/IT/GB/BR/OTHER).
 * @property {string} [category]    - Categoria detectada (imoveis/carros/...).
 * @property {string} [priceRange]  - Faixa de preço normalizada.
 * @property {string} [hostname]    - Hostname (sem subdomain).
 * @property {number} [photoCount]  - Nº de fotos (convertido para bucket).
 * @property {string} [sellerName]  - Nome do vendedor.
 *
 * @typedef {Object} AdMetrics
 * @property {number} likes
 * @property {number} dislikes
 * @property {number} uniqueUsers
 * @property {number} totalVotes
 * @property {number} fraudScore   - Score agregado dos sinais (com peso).
 * @property {number} confidence   - 0-1, sobe com nº total de votos.
 * @property {number} riskScore    - 0-1, dislikes/total.
 * @property {('RISK'|'WARNING'|'SAFE'|'TRUSTED')} badgeState
 * @property {Object<string,number>} [signals]      - Mapping signal → count.
 * @property {number} [totalSignals]
 * @property {Array<{signal: string, count: number}>} [top_signals]
 */

// Firebase Configuration - Versão Compatível (não modular)
//
// NOTA SOBRE SEGURANÇA — esta config NÃO contém segredos.
// Apesar do nome "apiKey", a Firebase Web API key é um IDENTIFICADOR PÚBLICO
// do projeto, não um secret. Pode ser embebida no cliente sem risco.
// Ref: https://firebase.google.com/docs/projects/api-keys
//
// A segurança real do projeto vem de:
//   1. Firestore Security Rules (firestore.rules) — exigem auth + valida writes
//   2. Firebase Auth (Google Sign-In via chrome.identity)
//   3. App Check (opcional — anti-abuse)
//
// Se vires esta chave num scan de segredos, é falso positivo.
const firebaseConfig = {
  apiKey: "AIzaSyAEVFnwSIAwvowOYXAF3ITAsFYUbkvg9PM",
  authDomain: "nettuno-e6036.firebaseapp.com",
  projectId: "nettuno-e6036",
  storageBucket: "nettuno-e6036.firebasestorage.app",
  messagingSenderId: "610650936846",
  appId: "1:610650936846:web:e4d6ece615305c4fe00e5f"
  // measurementId (G-2WYBRCZTYZ) removido: Firebase Analytics requer
  // consentimento RGPD explícito antes de ser ativado. Implementar em
  // Fase 4 com consent banner.
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db = firebase.firestore();

// Offline persistence desativada intencionalmente:
// enablePersistence({synchronizeTabs:true}) causa "Failed to obtain primary lease"
// em múltiplos tabs MV3 e crashava o content script antes do badge injetar.

// Auth state
let currentUser = null;
let authReady = false;
// Cache de trust score do utilizador actual (refresh on auth change + lazy on vote)
let currentUserTrust       = 1.0;
let currentUserVoteCount   = 0;
let currentUserSignalCount = 0;

async function refreshUserTrust() {
  if (!currentUser) { currentUserTrust = 1.0; return; }
  try {
    const snap = await db.collection('users').doc(currentUser.uid).get();
    if (snap.exists) {
      const d = snap.data();
      currentUserVoteCount   = d.voteCount   || 0;
      currentUserSignalCount = d.signalCount || 0;
      const accuracyRate     = d.accuracyRate ?? null;
      if (typeof calculateUserTrust === 'function') {
        currentUserTrust = calculateUserTrust({
          voteCount:    currentUserVoteCount,
          signalCount:  currentUserSignalCount,
          accuracyRate
        });
      }
    }
  } catch (e) { /* keep default */ }
}

function initAuth() {
  // Garante que todos os contextos (popup + content script) convergem para a mesma
  // conta Google: cada `firebase.auth()` tem persistência isolada por origin, mas o
  // chrome.identity (via background) mantém um único token partilhado e é a fonte
  // da verdade. Na primeira callback alinhamos este contexto com esse token —
  // mesmo que já estivesse autenticado (pode estar numa conta antiga persistida).
  let initialResolved = false;
  return new Promise((resolve) => {
    auth.onAuthStateChanged(async (user) => {
      currentUser = user || null;

      if (!initialResolved && typeof scmGetGoogleAuthToken === 'function') {
        try {
          const token = await scmGetGoogleAuthToken({ interactive: false });
          if (token) {
            // Há um token em cache no chrome.identity. Faz signInWithCredential
            // mesmo que já haja sessão — se for a mesma conta é idempotente; se
            // for diferente, troca para a conta correcta.
            const credential = firebase.auth.GoogleAuthProvider.credential(null, token);
            const result = await auth.signInWithCredential(credential);
            currentUser = result.user;
          } else if (currentUser) {
            // Não há token cached mas este contexto tem sessão antiga: fazer
            // sign-out para não mostrar uma conta que já não está autorizada.
            await auth.signOut().catch(() => {});
            currentUser = null;
          }
        } catch (e) { /* sem token / falha de rede: mantém estado actual */ }
      }

      if (!initialResolved) {
        initialResolved = true;
        authReady = true;
        // Aguardar trust score antes de resolver: garante que o primeiro voto/sinal
        // já usa o trust real do utilizador (não o default 1.0).
        try { await refreshUserTrust(); } catch (_) {}
        resolve(currentUser);
      } else {
        // Login change após o inicial: refresh trust em background
        refreshUserTrust().catch(() => {});
      }
    });
  });
}

function getCurrentUser() {
  return currentUser;
}

function isAuthReady() {
  return authReady;
}

// ── Security helpers ──────────────────────────────────────
const _AD_ID_RE = /^[a-zA-Z0-9_\-]{1,200}$/;
function _validateAdId(adId) {
  if (typeof adId !== 'string' || !_AD_ID_RE.test(adId)) throw new Error('Invalid ad ID');
}

// Sanitiza um segmento de field-path dinâmico do Firestore (ex: `byPlatform.${x}`).
// Sem isto, um valor com '.' criava campos aninhados espúrios e caracteres como
// '`' ou '[' fazem a escrita inteira falhar. Whitelist conservadora.
function _safeFieldKey(s, fallback = 'unknown') {
  const k = String(s || '').replace(/[^a-zA-Z0-9_\-+]/g, '').slice(0, 40);
  return k || fallback;
}

function _computeVoteStats({ likes, dislikes, uniqueUsers, fraudScore = 0 }) {
  const total = likes + dislikes;
  const badgeState = (typeof fraudScoreToBadgeState === 'function')
    ? fraudScoreToBadgeState(fraudScore, likes, dislikes, uniqueUsers)
    : (() => {
        // Fallback quando fraud-intelligence.js não está carregado (ex: popup)
        if (total === 0) return BADGE_STATES.WARNING;
        if (uniqueUsers >= 3 && likes / total > 0.75) return BADGE_STATES.TRUSTED;
        if (likes / total >= 0.5) return BADGE_STATES.SAFE;
        if (dislikes / total > 0.3) return BADGE_STATES.RISK;
        return BADGE_STATES.WARNING;
      })();
  return {
    likes, dislikes, uniqueUsers,
    totalVotes: total,
    fraudScore,
    confidence: total > 0 ? Math.min(1, total / 10) : 0,
    riskScore: total > 0 ? dislikes / total : 0.5,
    badgeState
  };
}

// Vote functions
/**
 * Regista um voto (like/dislike) num anúncio, atualizando estatísticas agregadas
 * em transação Firestore. Apenas 1 voto por utilizador/anúncio — voto novo substitui
 * o anterior. Também alimenta seller fingerprint, snapshots e contadores globais.
 *
 * @async
 * @param {string} adId - ID único do anúncio (formato `platform_id`, validado por regex).
 * @param {('like'|'dislike')} voteType - Tipo de voto (use VOTE_TYPES.LIKE/DISLIKE).
 * @param {string} [platform='unknown'] - Slug da plataforma (olx, vinted, ebay, ...).
 * @param {PageMetadata} [metadata={}] - Metadados do anúncio (sanitizados antes de gravar).
 * @returns {Promise<void>}
 * @throws {Error} 'Requer conta Google' se utilizador não autenticado.
 * @throws {Error} 'Tipo de voto inválido' se voteType ∉ VOTE_TYPES.
 * @throws {Error} Se adId não passar regex de validação.
 */
async function vote(adId, voteType, platform = 'unknown', metadata = {}) {
  if (!currentUser) throw new Error('Requer conta Google para votar');
  if (!Object.values(VOTE_TYPES).includes(voteType)) throw new Error(`Tipo de voto inválido: ${voteType}`);
  _validateAdId(adId);
  platform = _safeFieldKey(platform); // usado em field-paths dinâmicos (byPlatform.*)

  const userId = currentUser.uid;
  const voteRef = db.collection('votes').doc(`${userId}_${adId}`);
  const adRef  = db.collection('ads').doc(adId);

  // Sanitize metadata
  const safeTitle       = String(metadata.title       || '').slice(0, 200);
  const safeThumbnail   = String(metadata.thumbnail   || '').slice(0, 500);
  const safeSite        = String(metadata.site || platform).slice(0, 50);
  const safeUrl         = String(metadata.url         || '').slice(0, 500);
  const safeDescription = String(metadata.description || '').slice(0, 280);
  const safeCountry     = String(metadata.country     || '').toUpperCase().slice(0, 5);
  const safeCategory    = String(metadata.category    || '').slice(0, 30);
  const safePriceRange  = String(metadata.priceRange  || '').slice(0, 20);
  const safeHostname    = String(metadata.hostname    || '').slice(0, 100);
  const safePhotoCount  = metadata.photoCount !== undefined ? _photoCountBucket(metadata.photoCount) : null;
  const safeSellerName  = String(metadata.sellerName  || '').slice(0, 60);
  // Campos de TREINO (heurística local no momento do voto). São os "labels"
  // cruzados com o verdicto → calibram pesos e baselines no backend.
  const safeHeuristicFlags = Array.isArray(metadata.heuristicFlags)
    ? metadata.heuristicFlags.filter(f => typeof f === 'string').slice(0, 20).map(f => f.slice(0, 24))
    : [];
  const safeHeuristicScore = (typeof metadata.heuristicScore === 'number' && isFinite(metadata.heuristicScore))
    ? Math.max(0, Math.min(1, metadata.heuristicScore)) : null;
  const safePrice       = (typeof metadata.price === 'number' && metadata.price > 0 && metadata.price < 1e9)
    ? Math.round(metadata.price) : null;
  const safeFingerprint = /^fp_[a-z0-9]{1,12}$/.test(String(metadata.fingerprint || ''))
    ? String(metadata.fingerprint) : null;
  const safeTitleNorm   = String(metadata.titleNorm || '').slice(0, 80) || null;

  // Seller fingerprint
  const sellerFp = (typeof computeSellerFingerprint === 'function')
    ? computeSellerFingerprint({
        sellerName: safeSellerName,
        platform,
        country:    safeCountry,
        hostname:   safeHostname,
      })
    : null;

  await db.runTransaction(async (tx) => {
    // Firestore transactions: TODOS os reads têm de acontecer antes de qualquer write.
    const existing   = await tx.get(voteRef);
    const adSnap     = await tx.get(adRef);
    const sellerRef  = sellerFp ? db.collection('sellers').doc(sellerFp.id) : null;
    const sellerSnap = sellerRef ? await tx.get(sellerRef) : null;
    const now = firebase.firestore.FieldValue.serverTimestamp();

    // From adSnap - community state AT THE MOMENT OF THIS VOTE
    const adAtVote = adSnap.exists ? adSnap.data() : {};
    const likesAtVote    = adAtVote.likes    || 0;
    const dislikesAtVote = adAtVote.dislikes || 0;
    const totalAtVote    = likesAtVote + dislikesAtVote;
    const signalCountAtVote = adAtVote.totalSignals || 0;

    // Weighted fraud score at the moment of this vote (fraud-intelligence.js)
    const fraudScoreAtVote          = adAtVote.fraudScore          || 0;
    const effectiveFraudScoreAtVote = adAtVote.effectiveFraudScore || 0;
    const fraudPatternCountsAtVote  = adAtVote.fraudPatternCounts  || {};
    const topFraudPatternAtVote = Object.entries(fraudPatternCountsAtVote)
      .sort((a, b) => b[1] - a[1])[0]?.[0] ?? null;
    // Combo bonus snapshot (multi-pattern presence)
    const comboBonusAtVote = (typeof computeComboBonus === 'function')
      ? computeComboBonus(fraudPatternCountsAtVote) : 0;
    // Top 3 most-weighted signals on this ad at vote time
    const topSignalsAtVote = (typeof getTopSignals === 'function')
      ? getTopSignals(adAtVote.signals || {}, 3).map(s => ({
          signal: s.id, count: s.count, weight: s.weight, fraudType: s.fraudType
        }))
      : [];
    // Trust score of THIS voter (graph-feature: who is voting matters)
    const userTrustAtVote = currentUserTrust || 1.0;

    // How long since the ad was first seen by the community (seconds)
    let timeToThisVote = null;
    if (adAtVote.firstSeenAt && adAtVote.firstSeenAt.toMillis) {
      timeToThisVote = Math.round((Date.now() - adAtVote.firstSeenAt.toMillis()) / 1000);
    }

    // Community disagreement ratio (0 = full consensus, 1 = max disagreement)
    // High disagreement = controversial listing = interesting signal
    const disagreementRatio = totalAtVote > 0
      ? parseFloat((1 - Math.abs(likesAtVote - dislikesAtVote) / totalAtVote).toFixed(3))
      : null;

    let likeDelta = 0, dislikeDelta = 0, uniqueDelta = 0;

    if (!existing.exists) {
      uniqueDelta = 1;
      if (voteType === 'like') likeDelta = 1;
      else dislikeDelta = 1;
    } else {
      const prev = existing.data();
      const prevType = prev.voteType;
      if (prevType === voteType) return; // voto idêntico — nada a fazer
      if (prevType !== 'like' && prevType !== 'dislike') {
        // Voto anterior foi REMOVIDO (voteType null) → tratar como voto novo.
        // Sem isto, o ramo abaixo subtraía o tipo oposto que já não existe.
        uniqueDelta = 1;
        if (voteType === 'like') likeDelta = 1; else dislikeDelta = 1;
      } else {
        // Troca de like↔dislike: soma o novo, subtrai o antigo.
        if (voteType === 'like') { likeDelta = 1; dislikeDelta = -1; }
        else                      { dislikeDelta = 1; likeDelta = -1; }
      }
    }

    tx.set(voteRef, {
      adId, userId, voteType,
      value:        voteType === 'like' ? 1 : -1,
      platform,
      title:        safeTitle,
      thumbnail:    safeThumbnail,
      site:         safeSite,
      url:          safeUrl         || null,
      description:  safeDescription || null,
      // Campos de enriquecimento para treino de AI
      country:      safeCountry     || null,
      category:     safeCategory    || null,
      priceRange:   safePriceRange  || null,
      photoCount:   safePhotoCount,
      hostname:     safeHostname    || null,
      sellerName:   safeSellerName  || null,
      // Dados de TREINO: heurística local + preço exato + fingerprint do anúncio
      heuristicFlags: safeHeuristicFlags,
      heuristicScore: safeHeuristicScore,
      price:          safePrice,
      fingerprint:    safeFingerprint,
      titleNorm:      safeTitleNorm,
      // Community state at the moment of this vote (fraud-predictive signals)
      signalCountAtVote,
      timeToThisVote,
      disagreementRatio,
      communityLikesAtVote:  likesAtVote,
      communityDislikesAtVote: dislikesAtVote,
      // Weighted fraud intelligence snapshot
      fraudScoreAtVote,
      effectiveFraudScoreAtVote,
      comboBonusAtVote,
      topFraudPatternAtVote,
      topSignalsAtVote,
      // Voter identity weight (for ML graph features + anti-brigading)
      userTrustAtVote,
      // Voter profile snapshot — denormalizado para o painel de votos mostrar
      // avatares dos participantes sem ter de ler /users de outros (regras
      // Firestore só deixam o dono ler o seu próprio doc de utilizador).
      voterName:    currentUser.displayName || null,
      voterPhoto:   currentUser.photoURL    || null,
      // Seller fingerprint — cross-ad/cross-platform tracking
      sellerFingerprintId: sellerFp?.id || null,
      createdAt:    existing.exists ? existing.data().createdAt : now,
      updatedAt:    now
    });

    const adUpdate = {
      id:           adId,
      platform,
      url:          safeUrl       || null,
      title:        safeTitle     || null,
      thumbnail:    safeThumbnail || null,
      site:         safeSite      || null,
      // Campos de contexto para queries de AI (gravados na primeira vez, merge não sobrescreve)
      country:      safeCountry   || null,
      category:     safeCategory  || null,
      hostname:     safeHostname  || null,
      priceRange:   safePriceRange|| null,
      lastVoteType: voteType,
      updatedAt:    now
    };
    // firstSeenAt gravado apenas uma vez — quando o anúncio ainda não existe
    if (!adSnap.exists) adUpdate.firstSeenAt = now;
    if (likeDelta    !== 0) adUpdate.likes       = firebase.firestore.FieldValue.increment(likeDelta);
    if (dislikeDelta !== 0) adUpdate.dislikes    = firebase.firestore.FieldValue.increment(dislikeDelta);
    if (uniqueDelta  !== 0) adUpdate.uniqueUsers = firebase.firestore.FieldValue.increment(uniqueDelta);
    // Trust-weighted likes/dislikes (anti-brigading): voto vale × userTrust
    if (likeDelta    !== 0) adUpdate.effectiveLikes    = firebase.firestore.FieldValue.increment(+(likeDelta    * userTrustAtVote).toFixed(2));
    if (dislikeDelta !== 0) adUpdate.effectiveDislikes = firebase.firestore.FieldValue.increment(+(dislikeDelta * userTrustAtVote).toFixed(2));
    // Seller fingerprint
    if (sellerFp) {
      adUpdate.sellerFingerprint = {
        id:             sellerFp.id,
        normalizedName: sellerFp.normalizedName,
        platform:       sellerFp.components.platform,
        country:        sellerFp.components.country,
        hostname:       sellerFp.components.hostname,
      };
    }
    tx.set(adRef, adUpdate, { merge: true });

    // Atualiza colecção sellers/ (cross-ad intelligence: o mesmo nome em múltiplos anúncios)
    if (sellerFp && sellerRef) {
      const sellerUpdate = {
        id:             sellerFp.id,
        normalizedName: sellerFp.normalizedName,
        platform:       sellerFp.components.platform,
        country:        sellerFp.components.country,
        [`adsTouched.${adId}`]: true,
        lastSeenAt:     now,
      };
      if (sellerSnap && !sellerSnap.exists) sellerUpdate.firstSeenAt = now;
      if (likeDelta    !== 0) sellerUpdate.likes    = firebase.firestore.FieldValue.increment(likeDelta);
      if (dislikeDelta !== 0) sellerUpdate.dislikes = firebase.firestore.FieldValue.increment(dislikeDelta);
      tx.set(sellerRef, sellerUpdate, { merge: true });
    }

    // Incrementar voteCount no perfil do utilizador (para badge tier + trust refresh)
    const userRef = db.collection('users').doc(userId);
    tx.set(userRef, {
      voteCount:  firebase.firestore.FieldValue.increment(uniqueDelta > 0 ? 1 : 0),
      lastVoteAt: now
    }, { merge: true });

    // Contadores globais — global_summary/stats
    const month = new Date().toISOString().slice(0, 7);
    const globalUpdate = { lastUpdated: now };
    if (likeDelta    !== 0) globalUpdate.totalLikes    = firebase.firestore.FieldValue.increment(likeDelta);
    if (dislikeDelta !== 0) globalUpdate.totalDislikes = firebase.firestore.FieldValue.increment(dislikeDelta);
    if (uniqueDelta   > 0) {
      globalUpdate.totalVotes                        = firebase.firestore.FieldValue.increment(1);
      globalUpdate[`byPlatform.${platform}`]         = firebase.firestore.FieldValue.increment(1);
      globalUpdate[`byMonth.${month}`]               = firebase.firestore.FieldValue.increment(1);
      if (safeCountry)  globalUpdate[`byCountry.${_safeFieldKey(safeCountry)}`]   = firebase.firestore.FieldValue.increment(1);
      if (safeCategory) globalUpdate[`byCategory.${_safeFieldKey(safeCategory)}`] = firebase.firestore.FieldValue.increment(1);
    }
    if (voteType === 'dislike') globalUpdate.totalFraudVotes = firebase.firestore.FieldValue.increment(1);
    tx.set(db.collection('global_summary').doc('stats'), globalUpdate, { merge: true });
  });

  // Refresh trust local após o commit (fora da transaction)
  refreshUserTrust().catch(() => {});
  return true;
}

/**
 * Remove o voto do utilizador num anúncio (toggle-off). Decrementa os
 * contadores e marca o voto como removido (voteType:null). NÃO apaga o doc
 * (regra Firestore: delete:false) — em vez disso neutraliza-o, o que também
 * o exclui do treino (queries filtram voteType ∈ {like,dislike}).
 */
async function removeVote(adId, platform = 'unknown') {
  if (!currentUser) throw new Error('Requer conta para remover voto');
  _validateAdId(adId);
  const userId  = currentUser.uid;
  const inc     = firebase.firestore.FieldValue.increment;
  const voteRef = db.collection('votes').doc(`${userId}_${adId}`);
  const adRef   = db.collection('ads').doc(adId);

  await db.runTransaction(async (tx) => {
    const existing = await tx.get(voteRef);
    if (!existing.exists) return;
    const prev = existing.data();
    const prevType = prev.voteType;
    if (prevType !== 'like' && prevType !== 'dislike') return; // já removido
    const now   = firebase.firestore.FieldValue.serverTimestamp();
    const trust = prev.userTrustAtVote || 1.0;
    const likeDelta    = prevType === 'like'    ? -1 : 0;
    const dislikeDelta = prevType === 'dislike' ? -1 : 0;

    // Neutraliza o voto (não apagável por regra)
    tx.set(voteRef, { voteType: null, value: 0, removed: true, updatedAt: now }, { merge: true });

    // Decrementa contadores do anúncio
    const adUpdate = { updatedAt: now, uniqueUsers: inc(-1) };
    if (likeDelta)    { adUpdate.likes    = inc(-1); adUpdate.effectiveLikes    = inc(+(likeDelta * trust).toFixed(2)); }
    if (dislikeDelta) { adUpdate.dislikes = inc(-1); adUpdate.effectiveDislikes = inc(+(dislikeDelta * trust).toFixed(2)); }
    tx.set(adRef, adUpdate, { merge: true });

    // voteCount do utilizador -1
    tx.set(db.collection('users').doc(userId), { voteCount: inc(-1), lastVoteAt: now }, { merge: true });

    // Contadores globais
    const g = { lastUpdated: now, totalVotes: inc(-1) };
    if (likeDelta)    g.totalLikes    = inc(-1);
    if (dislikeDelta) g.totalDislikes = inc(-1);
    tx.set(db.collection('global_summary').doc('stats'), g, { merge: true });
  });

  refreshUserTrust().catch(() => {});
  return true;
}

// Get vote for current user
async function getUserVote(adId) {
  if (!currentUser) return null;
  _validateAdId(adId);
  const voteDoc = await db.collection('votes').doc(`${currentUser.uid}_${adId}`).get();
  return voteDoc.exists ? voteDoc.data() : null;
}

// Calcula finalFraudScore a partir do doc do anúncio (effectiveFraudScore + combo bonus
// quando o score é positivo). Centralizado para evitar inconsistências entre as várias
// funções que devolvem badgeState — bug histórico: getAdMetrics omitia fraudScore e por
// isso o painel mostrava SAFE enquanto o card (via listenToAdData) mostrava TRUSTED.
function _finalFraudScoreFromDoc(d) {
  const effFraud = d.effectiveFraudScore || 0;
  const patternCounts = d.fraudPatternCounts || {};
  const comboBonus = (typeof computeComboBonus === 'function') ? computeComboBonus(patternCounts) : 0;
  return effFraud + (effFraud > 0 ? comboBonus : 0);
}

// Get ad metrics — reads pre-computed counters from 'ads' doc (O(1), not O(votes))
async function getAdMetrics(adId) {
  _validateAdId(adId);
  const doc = await db.collection('ads').doc(adId).get();
  if (!doc.exists) {
    return _computeVoteStats({ likes: 0, dislikes: 0, uniqueUsers: 0 });
  }
  const d = doc.data();
  return _computeVoteStats({
    likes:       d.likes       || 0,
    dislikes:    d.dislikes    || 0,
    uniqueUsers: d.uniqueUsers || 0,
    fraudScore:  _finalFraudScoreFromDoc(d)
  });
}

// Real-time listener for ad metrics — single doc listener, no collection scan
function listenToAdMetrics(adId, callback) {
  _validateAdId(adId);
  return db.collection('ads').doc(adId).onSnapshot(doc => {
    if (!doc.exists) { callback(_computeVoteStats({ likes: 0, dislikes: 0, uniqueUsers: 0 })); return; }
    const d = doc.data();
    callback(_computeVoteStats({
      likes:       d.likes       || 0,
      dislikes:    d.dislikes    || 0,
      uniqueUsers: d.uniqueUsers || 0,
      fraudScore:  _finalFraudScoreFromDoc(d)
    }));
  });
}

// Record a signal (event) with optimistic counters
// Agrupa contagem de fotos em baldes legíveis
function _photoCountBucket(n) {
  if (n === 0)  return '0';
  if (n <= 3)   return '1-3';
  if (n <= 10)  return '4-10';
  return '10+';
}

/**
 * Marca ou desmarca um sinal de fraude num anúncio. Atualiza contagens por:
 * sinal, fase, plataforma, país, categoria, preço, hora, dia-da-semana, mês.
 * Cada chamada é idempotente: chamar com isRemoval=true desfaz o efeito.
 *
 * @async
 * @param {string} adId - ID do anúncio (validado).
 * @param {string} signalType - Chave do sinal (ex: 'ai_photos', 'price_low'). Regex `[a-zA-Z0-9_\-]{1,80}`.
 * @param {('contact'|'interaction'|'result')} phase - Fase do sinal (use PHASES.*).
 * @param {string} [platform='unknown'] - Slug da plataforma.
 * @param {boolean} [isRemoval=false] - true desfaz; false adiciona.
 * @param {Object} [meta={}] - Metadados adicionais (priceRange, photoCount, country, category, ...).
 * @returns {Promise<void>}
 * @throws {Error} Se utilizador não autenticado.
 * @throws {Error} Se signalType não passa o regex.
 * @throws {Error} 'Phase inválida' se phase ∉ PHASES.
 */
async function recordSignal(adId, signalType, phase, platform = 'unknown', isRemoval = false, meta = {}) {
  if (!currentUser) throw new Error('Requer conta Google para sinalizar');
  _validateAdId(adId);
  platform = _safeFieldKey(platform); // usado em doc ids e field-paths dinâmicos
  if (typeof signalType !== 'string' || !/^[a-zA-Z0-9_\-]{1,80}$/.test(signalType)) throw new Error('Invalid signal type');
  // Validar phase contra enum: previne typos (ex: 'contac' em vez de 'contact') que
  // gravariam dados não-queryáveis no Firestore e só seriam detetados semanas depois.
  if (!Object.values(PHASES).includes(phase)) throw new Error(`Phase inválida: ${phase} (esperado: ${Object.values(PHASES).join('|')})`);

  const userId   = currentUser.uid;
  const now      = firebase.firestore.FieldValue.serverTimestamp();
  const inc      = firebase.firestore.FieldValue.increment;
  const delta    = isRemoval ? -1 : 1;

  // Variáveis temporais calculadas uma vez
  const d        = new Date();
  const month    = d.toISOString().slice(0, 7);   // "2026-05"
  const date     = d.toISOString().slice(0, 10);  // "2026-05-11"
  const hour     = String(d.getHours());           // "22"
  const dow      = String(d.getDay());             // "0"=domingo … "6"=sábado

  // Peso e tipo de fraude do sinal (fraud-intelligence.js)
  const sigWeight    = (typeof getSignalWeight    === 'function') ? getSignalWeight(signalType)    : 0;
  const sigFraudType = (typeof getSignalFraudType === 'function') ? getSignalFraudType(signalType) : 'unknown';
  const weightDelta  = sigWeight * delta;

  // User trust weight: voto de utilizador veterano vale mais que de conta nova.
  const userTrust = currentUserTrust || 1.0;
  const effectiveWeightDelta = +(sigWeight * userTrust * delta).toFixed(2);

  // ── Seller fingerprint ──
  const fp = (typeof computeSellerFingerprint === 'function')
    ? computeSellerFingerprint({
        sellerName: meta.sellerName,
        platform,
        country:  meta.country,
        hostname: meta.hostname,
      })
    : null;

  // ── Pre-fetch: lê doc do anúncio (e do vendedor se aplicável) em paralelo.
  // Necessário para (a) signal chronology e (b) evitar sobrescrever firstSeenAt/firstSignalAt.
  // Requer Firestore Rule: `match /ads/{id} { allow read: if request.auth != null; }`
  let adData = {};
  let sellerExisted = false;
  if (!isRemoval) {
    try {
      const reads = [db.collection('ads').doc(adId).get()];
      if (fp) reads.push(db.collection('sellers').doc(fp.id).get());
      const [adSnap, sellerSnap] = await Promise.all(reads);
      adData        = adSnap.exists ? adSnap.data() : {};
      sellerExisted = !!(sellerSnap && sellerSnap.exists);
    } catch (e) { /* prossegue com defaults */ }
  }

  // Signal chronology — sequence analysis e behavioral modeling
  const sequenceNumber       = !isRemoval ? (adData.totalSignals || 0) + 1 : null;
  const prevSignal           = adData.lastSignal    || null;
  const prevFraudType        = adData.lastFraudType || null;
  const timeSinceFirstSignal = adData.firstSignalAt?.toMillis
    ? Math.round((Date.now() - adData.firstSignalAt.toMillis()) / 1000) : null;
  const timeSincePrevSignal  = adData.lastSignalAt?.toMillis
    ? Math.round((Date.now() - adData.lastSignalAt.toMillis()) / 1000) : null;

  const batch = db.batch();

  // ── 1. Estado do utilizador por anúncio ──────────────────
  batch.set(db.collection('userEvents').doc(`${userId}_${adId}`), {
    userId, adId,
    events: { [signalType]: !isRemoval },
    updatedAt: now
  }, { merge: true });

  // ── 2. Contadores do anúncio (+ fraudScore ponderado + chronology) ────
  const adUpdate = {
    signals:             { [signalType]: inc(delta) },
    totalSignals:        inc(delta),
    fraudScore:          inc(weightDelta),
    effectiveFraudScore: inc(effectiveWeightDelta),
    updatedAt:           now
  };
  if (sigFraudType !== 'unknown') {
    adUpdate[`fraudPatternCounts.${sigFraudType}`] = inc(sigWeight > 0 ? delta : 0);
  }
  // Chronology state: último sinal e tempo do primeiro sinal — para sequence analysis
  if (!isRemoval) {
    adUpdate.lastSignal    = signalType;
    adUpdate.lastFraudType = sigFraudType;
    adUpdate.lastSignalAt  = now;
    // firstSignalAt só é escrito quando o doc do anúncio ainda não o tem
    // (merge:true do Firestore NÃO faz dedup — escreve incondicionalmente se o campo estiver presente)
    if (!adData.firstSignalAt) adUpdate.firstSignalAt = now;
  }
  // Seller fingerprint (se houver nome de vendedor)
  if (fp) {
    adUpdate.sellerFingerprint = {
      id:              fp.id,
      normalizedName:  fp.normalizedName,
      platform:        fp.components.platform,
      country:         fp.components.country,
      hostname:        fp.components.hostname,
    };
  }
  batch.set(db.collection('ads').doc(adId), adUpdate, { merge: true });

  // ── 2c. Seller profile collection (cross-ad intelligence) ──
  if (fp && !isRemoval) {
    const sellerUpdate = {
      id:             fp.id,
      normalizedName: fp.normalizedName,
      platform:       fp.components.platform,
      country:        fp.components.country,
      totalSignals:   inc(1),
      fraudScore:     inc(weightDelta),
      [`fraudPatternCounts.${sigFraudType}`]: inc(sigWeight > 0 ? 1 : 0),
      [`adsTouched.${adId}`]: true,
      lastSeenAt:     now,
    };
    // firstSeenAt apenas na criação inicial do doc (sellerExisted = false)
    if (!sellerExisted) sellerUpdate.firstSeenAt = now;
    batch.set(db.collection('sellers').doc(fp.id), sellerUpdate, { merge: true });
  }

  // ── 2b. Incrementar signalCount no perfil do utilizador ──
  if (!isRemoval) {
    batch.set(db.collection('users').doc(userId), {
      signalCount: inc(1),
      lastSignalAt: now
    }, { merge: true });
  }

  // ── 3. Log de eventos imutável (raw events para BigQuery + ML) ──
  // Cada evento é uma linha completa, auto-suficiente: permite reconstruir
  // timelines, fazer sequence analysis e treinar transformers temporais.
  if (!isRemoval) {
    batch.set(db.collection('events').doc(), {
      adId, userId,
      eventType:       signalType,
      phase,
      platform,
      weight:          sigWeight,
      fraudType:       sigFraudType,
      userTrust,                                            // snapshot trust (ML retroactivo)
      effectiveWeight: +(sigWeight * userTrust).toFixed(2),
      // Chronology — sequence analysis
      sequenceNumber,        // 1, 2, 3... este é o Nº ___ sinal no anúncio
      prevSignal,            // sinal anterior (cadeia de comportamento)
      prevFraudType,         // padrão de fraude anterior
      timeSinceFirstSignal,  // segundos desde 1º sinal no anúncio
      timeSincePrevSignal,   // segundos desde sinal anterior
      // Seller fingerprint — cross-ad/cross-platform tracking
      sellerFingerprintId: fp?.id || null,
      // Contexto da página
      country:    meta.country    || '',
      category:   meta.category   || '',
      priceRange: meta.priceRange || '',
      photoCount: meta.photoCount !== undefined ? _photoCountBucket(meta.photoCount) : '',
      hourOfDay:  d.getHours(),
      dayOfWeek:  d.getDay(),
      createdAt:  now
    });
  }

  // ── 4. Analytics agregados por sinal + plataforma ────────
  const analyticsDoc = {
    platform, signalType,
    fraudType:             sigFraudType,
    weight:                sigWeight,
    lastUpdated:           now,
    totalCount:            inc(delta),
    [`byMonth.${month}`]:  inc(delta),
    [`byHour.${hour}`]:    inc(delta),
    [`byDayOfWeek.${dow}`]:inc(delta)
  };
  if (meta.priceRange) analyticsDoc[`byPriceRange.${_safeFieldKey(meta.priceRange)}`] = inc(delta);
  if (meta.category)   analyticsDoc[`byCategory.${_safeFieldKey(meta.category)}`]    = inc(delta);
  if (meta.country)    analyticsDoc[`byCountry.${_safeFieldKey(meta.country)}`]      = inc(delta);
  if (meta.photoCount !== undefined)
    analyticsDoc[`byPhotoCount.${_photoCountBucket(meta.photoCount)}`] = inc(delta);

  batch.set(db.collection('signals_analytics').doc(`${platform}_${signalType}`), analyticsDoc, { merge: true });

  // ── 5. Trending diário por plataforma ───────────────────
  batch.set(db.collection('platform_daily').doc(`${platform}_${date}`), {
    platform, date,
    [`signals.${signalType}`]: inc(delta),
    totalSignals:              inc(delta),
    lastUpdated:               now
  }, { merge: true });

  // ── 6. Contador global de sinais (+ por padrão de fraude) ─
  const globalUpdate = {
    totalSignals:                    inc(delta),
    [`bySignalPlatform.${platform}`]:inc(delta),
    [`bySignalMonth.${month}`]:      inc(delta),
    lastUpdated:                     now
  };
  if (sigFraudType !== 'unknown') {
    globalUpdate[`byFraudPattern.${sigFraudType}`] = inc(delta);
  }
  batch.set(db.collection('global_summary').doc('stats'), globalUpdate, { merge: true });

  try {
    await batch.commit();
  } catch (err) {
    console.error('[Firebase] recordSignal ERROR:', err);
    throw err;
  }

  return true;
}

// Helper para migrar chaves geradas pelo bug do dot-notation (ex: "events.signal") para mapas
function migrateLegacyFields(data, mapName) {
  const map = { ...(data[mapName] || {}) };
  Object.keys(data).forEach(key => {
    if (key.startsWith(`${mapName}.`)) {
      const nestedKey = key.split('.')[1];
      if (typeof data[key] === 'number') {
        map[nestedKey] = (map[nestedKey] || 0) + data[key];
      } else {
        map[nestedKey] = data[key]; // para booleanos em userEvents
      }
    }
  });
  return map;
}

// Listen to signals for an ad (real-time)
function listenToAdSignals(adId, callback) {
  return db.collection('ads').doc(adId)
    .onSnapshot(doc => {
      if (doc.exists) {
        const data = doc.data();
        const signals = migrateLegacyFields(data, 'signals');
        callback({
          signals: signals,
          totalSignals: data.totalSignals || 0,
          heuristics: data.heuristics || {}
        });
      } else {
        callback({ signals: {}, totalSignals: 0, heuristics: {} });
      }
    }, err => {
      console.error('[Firebase] Signals listener error:', err);
      callback({ signals: {}, totalSignals: 0, heuristics: {} });
    });
}

// Get user's events for an ad
async function getUserEvents(adId, forceFresh = false) {
  if (!currentUser) return {};
  _validateAdId(adId);
  try {
    const options = forceFresh ? { source: 'server' } : undefined;
    const doc = await db.collection('userEvents').doc(`${currentUser.uid}_${adId}`).get(options);
    if (doc.exists) {
      const data = doc.data();
      const events = migrateLegacyFields(data, 'events');
      return events;
    }
    return {};
  } catch (err) {
    console.error('[Firebase] Error getting userEvents:', err);
    return {};
  }
}

// NOTA: removeSignal foi removido — estava partido (passava phase 'unknown',
// que falha a validação de PHASES) e nunca era chamado. Para desfazer um sinal,
// usa-se recordSignal(adId, signalType, phase, platform, /*isRemoval=*/true).

/**
 * Lê todos os dados consolidados de um anúncio: métricas de voto + sinais agregados
 * + top signals. Usa cache do Firestore por defeito; passar forceFresh ignora cache
 * e força round-trip ao servidor (útil após escrita para evitar stale reads).
 *
 * @async
 * @param {string} adId - ID do anúncio (validado).
 * @param {boolean} [forceFresh=false] - true força { source: 'server' } no .get().
 * @returns {Promise<AdMetrics>} Dados consolidados. Se anúncio não existir, devolve
 *   estrutura vazia com signals={}, totalSignals=0, top_signals=[].
 * @throws {Error} Se adId não passar regex de validação.
 */
async function getAdData(adId, forceFresh = false) {
  _validateAdId(adId);
  // [FIX] Se forceFresh=true, buscar directamente do servidor para evitar cache stale
  const getOptions = forceFresh ? { source: 'server' } : undefined;
  const doc = await db.collection('ads').doc(adId).get(getOptions);
  const metrics = await getAdMetrics(adId);
  
  if (!doc.exists) {
    return {
      ...metrics,
      signals: {},
      totalSignals: 0,
      top_signals: [],
      percentages: { safe: 0, warning: 0, risk: 0 }
    };
  }
  
  const data = doc.data();
  const signals    = migrateLegacyFields(data, 'signals');
  const totalSignals = data.totalSignals || 0;
  const fraudScore          = data.fraudScore          || 0;
  const effectiveFraudScore = data.effectiveFraudScore || 0;
  const fraudPatternCounts  = data.fraudPatternCounts  || {};
  const effectiveLikes      = data.effectiveLikes      || 0;
  const effectiveDislikes   = data.effectiveDislikes   || 0;

  // Padrão dominante
  const topFraudPattern = Object.entries(fraudPatternCounts)
    .sort((a, b) => b[1] - a[1])[0]?.[0] ?? null;

  // Combo bonus + score final (raw + trust-weighted + combo) — usa helper DRY
  const finalFraudScore = _finalFraudScoreFromDoc(data);
  const comboBonus = finalFraudScore - effectiveFraudScore;

  const percentages = calculateSignalPercentages(signals, totalSignals);
  const top_signals = getTopSignals(signals, 10);

  return {
    ...data,
    ...metrics,
    signals,
    totalSignals,
    fraudScore,
    effectiveFraudScore,
    comboBonus,
    finalFraudScore,
    topFraudPattern,
    fraudPatternCounts,
    effectiveLikes,
    effectiveDislikes,
    top_signals,
    percentages
  };
}

// Calcular percentagens de sinais (Safe/Warning/Risk)
function calculateSignalPercentages(signals, totalSignals) {
  if (totalSignals === 0) {
    return { safe: 0, warning: 0, risk: 0 };
  }
  
  let safe = 0, warning = 0, risk = 0;
  
  Object.entries(signals).forEach(([key, count]) => {
    // Ignorar contagens negativas (erro de sincronização)
    if (count <= 0) return;
    
    const info = getSignalInfo('default', key); // Fallback para default
    if (info) {
      if (info.positive) safe += count;
      else if (info.negative) risk += count;
      else warning += count;
    } else {
      // Se não encontrar info, assumir neutro
      warning += count;
    }
  });
  
  // Se não conseguimos categorizar nenhum, mostrar tudo como warning
  const totalCategorized = safe + warning + risk;
  if (totalCategorized === 0) {
    return { safe: 0, warning: 100, risk: 0 };
  }
  
  return {
    safe: Math.round((safe / totalCategorized) * 100),
    warning: Math.round((warning / totalCategorized) * 100),
    risk: Math.round((risk / totalCategorized) * 100)
  };
}

// Obter top signals ordenados por weighted score (count × weight)
function getTopSignals(signals, limit = 10) {
  return Object.entries(signals)
    .filter(([, count]) => count > 0)
    .map(([key, count]) => {
      const info      = getSignalInfo('default', key);
      const weight    = (typeof getSignalWeight    === 'function') ? getSignalWeight(key)    : 0;
      const fraudType = (typeof getSignalFraudType === 'function') ? getSignalFraudType(key) : 'unknown';
      const pattern   = (typeof FRAUD_PATTERN_LABELS !== 'undefined') ? FRAUD_PATTERN_LABELS[fraudType] : null;
      return {
        id:          key,
        count,
        weight,
        weightedScore: weight * count,
        fraudType,
        patternLabel:  pattern?.label  || null,
        patternIcon:   pattern?.icon   || null,
        patternColor:  pattern?.color  || null,
        label:    info ? info.label    : key,
        icon:     info ? info.icon     : '▪️',
        positive: info ? info.positive : false,
        negative: info ? info.negative : false
      };
    })
    .sort((a, b) => b.weightedScore - a.weightedScore) // ordenar por impacto real
    .slice(0, limit);
}

// Real-time listener for full ad data — single 'ads' doc listener (counters + signals)
// Counters (likes, dislikes, uniqueUsers) are maintained atomically by vote() transactions
function listenToAdData(adId, callback) {
  _validateAdId(adId);
  return db.collection('ads').doc(adId).onSnapshot(doc => {
    const data = doc.exists ? doc.data() : {};
    const likes        = data.likes              || 0;
    const dislikes     = data.dislikes           || 0;
    const uniqueUsers  = data.uniqueUsers        || 0;
    const fraudScore   = data.fraudScore         || 0;
    const finalFraudScore = _finalFraudScoreFromDoc(data);
    const voteStats   = _computeVoteStats({ likes, dislikes, uniqueUsers, fraudScore: finalFraudScore });

    const signals      = migrateLegacyFields(data, 'signals');
    const totalSignals = data.totalSignals || 0;
    const percentages  = calculateSignalPercentages(signals, totalSignals);
    const top_signals  = getTopSignals(signals, 10);

    let positiveSignals = 0, negativeSignals = 0;
    Object.entries(signals).forEach(([key, count]) => {
      const info = getSignalInfo('default', key);
      if (info) {
        if (info.positive)  positiveSignals += count;
        else if (info.negative) negativeSignals += count;
      }
    });

    const topFraudPattern = Object.entries(data.fraudPatternCounts || {}).sort((a, b) => b[1] - a[1])[0]?.[0] ?? null;
    const effFraud   = data.effectiveFraudScore || 0;
    const comboBonus = (typeof computeComboBonus === 'function') ? computeComboBonus(data.fraudPatternCounts || {}) : 0;

    callback({
      ...data,
      ...voteStats,
      totalSignals,
      positiveSignals,
      negativeSignals,
      fraudScore,
      effectiveFraudScore: effFraud,
      comboBonus,
      finalFraudScore,
      topFraudPattern,
      fraudPatternCounts: data.fraudPatternCounts || {},
      confidence: totalSignals > 0 ? Math.min(1, totalSignals / 20) : voteStats.confidence,
      percentages,
      top_signals
    });
  });
}
// Get user voting history
async function getUserHistory(limitCount = 50) {
  if (!currentUser) return [];

  // Tenta primeiro ordenado por updatedAt (requer composite index userId+updatedAt).
  // Se Firestore se queixar de falta de índice, cai para query simples sem ordenação
  // e ordena client-side — o erro inclui um link para criar o índice.
  try {
    const snapshot = await db.collection('votes')
      .where('userId', '==', currentUser.uid)
      .orderBy('updatedAt', 'desc')
      .limit(limitCount)
      .get();
    return snapshot.docs.map(doc => doc.data());
  } catch (err) {
    if (err && (err.code === 'failed-precondition' || /index/i.test(err.message || ''))) {
      console.warn('[Firebase] getUserHistory sem índice composto, fallback sem orderBy:', err.message);
      try {
        const snap = await db.collection('votes')
          .where('userId', '==', currentUser.uid)
          .limit(limitCount)
          .get();
        return snap.docs.map(doc => doc.data());
      } catch (e) {
        console.error('[Firebase] Error getting history (fallback):', e);
        return [];
      }
    }
    console.error('[Firebase] Error getting history:', err);
    return [];
  }
}

/**
 * Devolve os últimos N votos de um anúncio com perfil do votante (nome + foto).
 * Usado pelo painel para mostrar avatares dos participantes em vez de um número.
 * Lê só /votes (read público) — não toca em /users por causa das regras.
 *
 * @param {string} adId
 * @param {number} [limit=6]
 * @returns {Promise<Array<{userId:string, voterName:string|null, voterPhoto:string|null, voteType:string}>>}
 */
async function getRecentVoters(adId, limit = 6) {
  _validateAdId(adId);
  try {
    let snap;
    try {
      snap = await db.collection('votes')
        .where('adId', '==', adId)
        .orderBy('updatedAt', 'desc')
        .limit(limit)
        .get();
    } catch (e) {
      // Sem índice composto adId+updatedAt cai para query sem orderBy
      snap = await db.collection('votes')
        .where('adId', '==', adId)
        .limit(limit)
        .get();
    }
    return snap.docs
      .map(d => d.data())
      // Excluir votos removidos (voteType:null, removed:true) — já não contam
      // como participação e não devem aparecer no stack de avatares.
      .filter(v => v.voteType === VOTE_TYPES.LIKE || v.voteType === VOTE_TYPES.DISLIKE)
      .map(v => ({
        userId:     v.userId,
        voterName:  v.voterName  || null,
        voterPhoto: v.voterPhoto || null,
        voteType:   v.voteType
      }));
  } catch (err) {
    console.warn('[NETTUNO] getRecentVoters failed:', err?.message || err);
    return [];
  }
}
