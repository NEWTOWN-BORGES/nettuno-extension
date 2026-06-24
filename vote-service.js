/**
 * NETTUNO — Vote Service (ROUTER PURO no cliente).
 *
 * Regra absoluta: o cliente NÃO decide lógica de negócio nem calcula score.
 * Este módulo só decide POR ONDE enviar o voto (server vs legacy) com base no
 * kill switch remoto, e delega. Nenhum cálculo de reputação aqui.
 *
 * Routing determinístico por utilizador (NÃO Math.random por voto): um mesmo
 * uid fica sempre do MESMO lado durante o rollout, evitando dual-write no mesmo
 * anúncio (server + legacy a escrever o mesmo ad = dual-truth).
 *
 * Dual-mode: global na extensão (content-script) + importável em Node (testes).
 */

// Mapa cor → tipo de voto legacy (like/dislike). Yellow é NOVO: só existe no
// caminho server. No legacy, yellow não tem equivalente → não é enviado.
const COLOR_TO_LEGACY = { green: 'like', red: 'dislike' };
// Mapa inverso (legacy → cor) para o caminho server quando a UI ainda emite like/dislike.
const LEGACY_TO_COLOR = { like: 'green', dislike: 'red' };

/**
 * Hash determinístico de uma string → bucket [0,99]. (djb2, estável.)
 */
function hashToBucket(str) {
  let h = 5381;
  const s = String(str || '');
  for (let i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) >>> 0;
  return h % 100;
}

/**
 * Decisão de routing PURA (testável). Sem efeitos colaterais.
 * @param {{useServerVotes?:boolean, rolloutPct?:number}} config  doc config/system
 * @param {string} uid
 * @returns {'server'|'legacy'}
 */
function voteRouteDecision(config, uid) {
  if (!config || !config.useServerVotes || !uid) return 'legacy';
  const pct = Math.max(0, Math.min(100, Number(config.rolloutPct) || 0));
  if (pct >= 100) return 'server';
  if (pct <= 0) return 'legacy';
  return hashToBucket(uid) < pct ? 'server' : 'legacy';   // bucket estável por uid
}

// ── Abaixo: orquestração (só corre no browser; depende de globais Firebase) ──
if (typeof window !== 'undefined') {
  const CONFIG_TTL_MS = 5 * 60 * 1000;
  let _cfg = null;
  let _cfgAt = 0;

  async function getSystemConfig() {
    if (_cfg && Date.now() - _cfgAt < CONFIG_TTL_MS) return _cfg;
    try {
      const snap = await db.collection('config').doc('system').get();
      _cfg = snap.exists ? snap.data() : { useServerVotes: false, rolloutPct: 0 };
    } catch {
      _cfg = { useServerVotes: false, rolloutPct: 0 };   // fail-safe → legacy
    }
    _cfgAt = Date.now();
    return _cfg;
  }

  function serverFunctionsAvailable() {
    return typeof firebase !== 'undefined'
      && typeof firebase.functions === 'function';
  }

  async function serverVote({ adId, color, platform, deviceFingerprint }) {
    const fn = firebase.functions('europe-west1').httpsCallable('submitVote');
    const idempotencyKey = `${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
    const res = await fn({ adId, voteColor: color, platform, deviceFingerprint, idempotencyKey });
    return res.data;
  }

  // Caminho LEGACY: comportamento byte-idêntico ao atual (escrita direta),
  // incluindo platform + metadata (remoção de voto, etc.).
  async function legacyVote({ adId, voteType, platform, metadata }) {
    if (typeof vote !== 'function') throw new Error('Função legacy vote() indisponível.');
    return vote(adId, voteType, platform, metadata);
  }

  /**
   * API ÚNICA de voto. O resto da app chama SÓ isto.
   * Aceita cor (novo) e/ou voteType (legacy) — resolve o que faltar.
   * @param {{adId:string, color?:string, voteType?:string, platform?:string,
   *          metadata?:object, deviceFingerprint?:string}} p
   */
  async function submitAdVote(p) {
    const adId = p.adId;
    const color = p.color || LEGACY_TO_COLOR[p.voteType] || null;
    const voteType = p.voteType || COLOR_TO_LEGACY[p.color] || null;

    const uid = (typeof auth !== 'undefined' && auth.currentUser) ? auth.currentUser.uid : null;
    const cfg = await getSystemConfig();
    let route = voteRouteDecision(cfg, uid);

    // Fail-safe: se a rota é server mas o SDK functions não está carregado,
    // degrada para legacy (nunca parte a votação por falta de dependência).
    if (route === 'server' && !serverFunctionsAvailable()) {
      console.warn('[VoteService] functions SDK ausente → fallback legacy.');
      route = 'legacy';
    }

    try {
      if (route === 'server') {
        // O modelo novo é append-only por cor: não suporta "remover voto".
        if (p.metadata && p.metadata.isRemoval) {
          console.warn('[VoteService] remoção de voto não existe no modelo server; ignorada.');
          return { ok: false, reason: 'removal_not_supported_server' };
        }
        if (!color) return { ok: false, reason: 'cor_em_falta' };
        return await serverVote({ adId, color, platform: p.platform, deviceFingerprint: p.deviceFingerprint });
      }
      return await legacyVote({ adId, voteType, platform: p.platform, metadata: p.metadata });
    } catch (e) {
      console.error(`[VoteService] voto falhou (rota=${route}):`, e && e.message);
      throw e;
    }
  }

  window.VoteService = { submitAdVote, voteRouteDecision, _getSystemConfig: getSystemConfig };
}

// Export para testes (Node CommonJS) — não quebra o content-script.
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { voteRouteDecision, hashToBucket, COLOR_TO_LEGACY, LEGACY_TO_COLOR };
}
