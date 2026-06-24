/**
 * NETTUNO — Profile Validation (pure, sem dependências)
 *
 * Fonte única de verdade para a sanitização de dados de perfil do utilizador
 * (RGPD + anti data-bloat + anti-injeção). Extraído de auth-service.js para
 * ser testável de forma isolada.
 *
 * Dual-mode: corre como content-script global na extensão E é importável em
 * Node (CommonJS) para testes. Não usa `import`/`export` para não quebrar o
 * contexto de content-script clássico (MV3).
 */

const PROFILE_ALLOWED_AGE    = ['', '18-24', '25-34', '35-44', '45-54', '55-64', '65+'];
const PROFILE_ALLOWED_GENDER = ['', 'f', 'm', 'x']; // valores do formulário popup.html
const PROFILE_ALLOWED_LANG   = ['pt', 'en', 'de', 'fr', 'es', 'it'];

/**
 * Valida e sanitiza um patch de perfil. Whitelist explícita por campo.
 * Devolve um objeto `safe` apenas com os campos válidos presentes no patch.
 * NÃO adiciona timestamps nem escreve em DB — isso fica a cargo do chamador.
 *
 * @param {object} patch
 * @returns {object} safe — campos sanitizados
 * @throws {Error} se patch não for objeto, nickname > 30 chars, ou interests não-array
 */
function sanitizeProfilePatch(patch) {
  if (!patch || typeof patch !== 'object' || Array.isArray(patch)) {
    throw new Error('Patch de perfil inválido');
  }

  const safe = {};

  if ('nickname' in patch) {
    // Remove caracteres perigosos para HTML/atributos (defesa-em-profundidade
    // contra XSS armazenado — o nickname é renderizado no dashboard e no perfil).
    const nick = String(patch.nickname || '').trim().replace(/[<>"'`\\]/g, '');
    if (nick.length > 30) throw new Error('Alcunha demasiado longa (máx 30 caracteres)');
    safe.nickname = nick;
  }
  if ('ageRange' in patch) {
    safe.ageRange = PROFILE_ALLOWED_AGE.includes(patch.ageRange) ? patch.ageRange : '';
  }
  if ('gender' in patch) {
    safe.gender = PROFILE_ALLOWED_GENDER.includes(patch.gender) ? patch.gender : '';
  }
  if ('language' in patch) {
    safe.language = PROFILE_ALLOWED_LANG.includes(patch.language) ? patch.language : 'pt';
  }
  if ('country' in patch) {
    safe.country = String(patch.country || '').toUpperCase().replace(/[^A-Z]/g, '').slice(0, 5);
  }
  if ('interests' in patch) {
    if (!Array.isArray(patch.interests)) throw new Error('Interesses inválidos');
    safe.interests = patch.interests
      .slice(0, 10)
      .map(v => String(v).replace(/[^a-zA-Z0-9_\-]/g, '').slice(0, 50))
      .filter(Boolean);
  }
  if ('consents' in patch && patch.consents && typeof patch.consents === 'object') {
    safe.consents = {
      analytics:        !!patch.consents.analytics,
      marketing:        !!patch.consents.marketing,
      categoryTracking: !!patch.consents.categoryTracking,
    };
  }

  return safe;
}

// ── Export dual: Node (testes) sem quebrar o content-script no browser ──
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    sanitizeProfilePatch,
    PROFILE_ALLOWED_AGE,
    PROFILE_ALLOWED_GENDER,
    PROFILE_ALLOWED_LANG,
  };
}
