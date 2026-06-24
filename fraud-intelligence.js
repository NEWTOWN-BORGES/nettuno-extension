/**
 * NETTUNO v4.0 — Fraud Intelligence
 * Peso real por sinal + categorias de fraude
 * Cada sinal tem um peso numérico e um tipo de padrão de fraude.
 *
 * ESCALA DE PESOS:
 *   +5  Crítico — risco directo de perda financeira ou roubo de identidade
 *   +4  Alto    — forte indicador de fraude consumada ou iminente
 *   +3  Médio-alto — padrão claro de engano
 *   +2  Médio   — suspeito mas ambíguo
 *   +1  Baixo   — sinal fraco / ruído
 *   -1  Positivo fraco
 *   -2  Positivo
 *   -3  Positivo forte — vendedor verificado / transação bem-sucedida
 *
 * TIPOS DE FRAUDE (topFraudPattern no Firestore):
 *   payment_fraud         — pagamento fora da plataforma, links falsos, MBWay
 *   fake_listing          — fotos IA, anúncio clonado, perfil falso
 *   communication_redirect — redireccionou para WhatsApp/Telegram
 *   identity_theft        — pediu NIF, IBAN, dados pessoais
 *   delivery_fraud        — produto nunca chegou, tracking morto
 *   product_fraud         — produto falsificado, diferente do anunciado
 *   confirmed_fraud       — burla confirmada, dinheiro perdido
 *   account_suspicion     — conta nova, sem reviews, feedback baixo
 *   pressure_tactic       — urgência, "outro comprador"
 *   evasion               — recusou encontro, parou de responder
 *   vehicle_fraud         — sinistro oculto, km adulterados
 *   price_manipulation    — preço irreal, falsa promoção
 *   trust_positive        — sinal positivo (peso negativo)
 */

const SIGNAL_WEIGHTS = {
  // ═══════════════════════════════════════════
  // CRÍTICO (+5) — perda financeira directa
  // ═══════════════════════════════════════════
  asked_personal_data:    5,
  asks_personal_data:     5,
  fake_payment_link:      5,
  wp_fake_link:           5,
  payment_outside:        5,
  ml_payment_outside:     5,
  mbway_pressure:         5,
  ml_pix_redirect:        5,
  ml_boleto_fraud:        5,
  sub_postepay:           5,
  friends_family_payment: 5,
  ka_sicherheitscheck:    5,
  ka_fake_schutz:         5,
  lbc_fake_protection:    5,
  sub_fake_protect:       5,
  wp_fake_envio:          5,
  deposit_before_see:     5,
  fake_payment_proof:     5,
  fake_proof:             5,
  asked_money_upfront:    5,
  scam:                   5,
  ml_scam:                5,
  lost_money:             5,

  // ═══════════════════════════════════════════
  // ALTO (+4) — fraude consumada ou iminente
  // ═══════════════════════════════════════════
  never_arrived:          4,
  ml_item_not_arrived:    4,
  seller_vanished:        4,
  ml_fake_seller:         4,
  abroad_excuse:          4,
  abroad_car:             4,
  lbc_fake_delivery:      4,
  counterfeit_received:   4,
  ml_counterfeit:         4,
  counterfeit:            4,
  ml_dispute_lost:        4,
  tracking_dead:          4,
  courier_extra_fee:      4,
  fake_invoice:           4,
  accident_hidden:        4,
  debts_hidden:           4,
  ml_fake_product:        4,

  // ═══════════════════════════════════════════
  // MÉDIO-ALTO (+3) — padrão claro de engano
  // ═══════════════════════════════════════════
  redirected_chat:        3,
  redirected_convo:       3,
  redirect_whatsapp:      4,
  redirect_telegram:      4,
  redirect_sms:           3,
  redirect_email:         3,
  redirect_outro:         3,
  ai_photos:              3,
  ai_generated_photos:    3,
  stolen_photos:          3,
  cloned_ad:              3,
  fake_profile_pic:       3,
  instant_reply:          3,
  refused_meeting:        3,
  refused_mechanic:       3,
  refused_visit:          3,
  wrong_item:             3,
  ml_different_item:      3,
  not_as_described:       3,
  fake_photo:             3,
  fake_reviews:           3,
  wp_no_wallapop_pay:     3,
  km_suspect:             3,
  engine_issue:           3,

  // ═══════════════════════════════════════════
  // MÉDIO (+2) — suspeito mas ambíguo
  // ═══════════════════════════════════════════
  unrealistic_price:      2,
  new_account:            2,
  new_seller:             2,
  ml_new_seller:          2,
  low_feedback:           2,
  bad_portuguese:         2,
  seen_no_reply:          2,
  pressure_sale:          2,
  unresponsive:           2,
  stopped_responding:     2,
  wrong_location:         2,
  reposted_ad:            2,
  no_test_drive:          2,
  docs_incomplete:        2,
  evasive:                2,
  bad_description:        2,
  ml_bad_description:     2,
  vague_description:      2,
  prohibited_item:        2,
  suspicious:             2,
  only_whatsapp:          2,
  lbc_chatonly:           2,
  ka_only_chat:           2,
  seller_unresponsive:    2,
  ml_no_return:           2,
  no_returns:             2,
  bad_quality:            2,
  counterfeit_luxury:     2,

  // ═══════════════════════════════════════════
  // BAIXO (+1) — sinal fraco
  // ═══════════════════════════════════════════
  high_shipping:          1,
  gdpr_not_compliant:     1,
  no_measures:            1,
  wrong_size:             1,
  hard_return:            1,
  fake_promo:             1,
  third_party_seller:     1,
  shipped_outside_eu:     1,

  // ═══════════════════════════════════════════
  // POSITIVOS (pesos negativos)
  // ═══════════════════════════════════════════
  success:                -3,
  ml_success:             -3,
  trusted_seller:         -3,
  verified_seller:        -3,
  verified_profile:       -3,
  ml_gold_seller:         -3,
  ml_platinum_seller:     -3,
  top_rated:              -3,
  good_feedback:          -3,
  good_reviews:           -2,
  trusted_stand:          -3,
  real_owner:             -2,
  answered_call:          -2,
  replied_messages:       -2,
  clear_communication:    -2,
  visit_done:             -2,
  saw_car:                -2,
  test_drive_ok:          -2,
  mechanic_check:         -2,
  mechanic_check_ok:      -2,
  history_check_ok:       -2,
  docs_complete:          -2,
  history_clear:          -2,
  accepted_meeting:       -2,
  shows_invoice:          -2,
  with_invoice:           -2,
  as_described:           -2,
  ml_dispute_won:         -2,
  ml_fulfillment:         -2,
  accepted_returns:       -1,
  fast_shipping:          -1,
  fast_responses:         -1,
  extra_photos:           -1,
  good_quality:           -1,
  true_size:              -1,
  responsive:             -1,
  tracking_updated:       -1,
  fast_reply:             -1,
  fair_price:             -1,
  no_photos:              1,
};

const SIGNAL_FRAUD_TYPES = {
  // payment_fraud
  payment_outside:        'payment_fraud',
  ml_payment_outside:     'payment_fraud',
  asked_personal_data:    'payment_fraud',
  asks_personal_data:     'payment_fraud',
  fake_payment_link:      'payment_fraud',
  wp_fake_link:           'payment_fraud',
  mbway_pressure:         'payment_fraud',
  ml_pix_redirect:        'payment_fraud',
  ml_boleto_fraud:        'payment_fraud',
  sub_postepay:           'payment_fraud',
  friends_family_payment: 'payment_fraud',
  ka_sicherheitscheck:    'payment_fraud',
  ka_fake_schutz:         'payment_fraud',
  lbc_fake_protection:    'payment_fraud',
  sub_fake_protect:       'payment_fraud',
  wp_fake_envio:          'payment_fraud',
  deposit_before_see:     'payment_fraud',
  fake_payment_proof:     'payment_fraud',
  fake_proof:             'payment_fraud',
  asked_money_upfront:    'payment_fraud',
  fake_invoice:           'payment_fraud',
  wp_no_wallapop_pay:     'payment_fraud',
  lbc_fake_delivery:      'payment_fraud',

  // fake_listing
  ai_photos:              'fake_listing',
  ai_generated_photos:    'fake_listing',
  stolen_photos:          'fake_listing',
  cloned_ad:              'fake_listing',
  fake_profile_pic:       'fake_listing',
  reposted_ad:            'fake_listing',
  fake_photo:             'fake_listing',
  fake_reviews:           'fake_listing',
  ml_fake_product:        'fake_listing',
  ml_fake_seller:         'fake_listing',
  vague_description:      'fake_listing',
  bad_description:        'fake_listing',
  ml_bad_description:     'fake_listing',
  instant_reply:          'fake_listing',

  // communication_redirect
  redirected_chat:        'communication_redirect',
  redirected_convo:       'communication_redirect',
  redirect_whatsapp:      'communication_redirect',
  redirect_telegram:      'communication_redirect',
  redirect_sms:           'communication_redirect',
  redirect_email:         'communication_redirect',
  redirect_outro:         'communication_redirect',
  only_whatsapp:          'communication_redirect',
  lbc_chatonly:           'communication_redirect',
  ka_only_chat:           'communication_redirect',

  // account_suspicion
  new_account:            'account_suspicion',
  new_seller:             'account_suspicion',
  ml_new_seller:          'account_suspicion',
  low_feedback:           'account_suspicion',

  // pressure_tactic
  pressure_sale:          'pressure_tactic',
  abroad_excuse:          'pressure_tactic',

  // delivery_fraud
  never_arrived:          'delivery_fraud',
  ml_item_not_arrived:    'delivery_fraud',
  seller_vanished:        'delivery_fraud',
  courier_extra_fee:      'delivery_fraud',
  tracking_dead:          'delivery_fraud',

  // product_fraud
  counterfeit:            'product_fraud',
  counterfeit_received:   'product_fraud',
  counterfeit_luxury:     'product_fraud',
  ml_counterfeit:         'product_fraud',
  wrong_item:             'product_fraud',
  ml_different_item:      'product_fraud',
  not_as_described:       'product_fraud',
  bad_quality:            'product_fraud',
  wrong_size:             'product_fraud',

  // confirmed_fraud
  scam:                   'confirmed_fraud',
  lost_money:             'confirmed_fraud',
  ml_scam:                'confirmed_fraud',
  ml_dispute_lost:        'confirmed_fraud',

  // evasion
  refused_meeting:        'evasion',
  refused_mechanic:       'evasion',
  refused_visit:          'evasion',
  stopped_responding:     'evasion',
  unresponsive:           'evasion',
  seller_unresponsive:    'evasion',
  evasive:                'evasion',

  // vehicle_fraud
  accident_hidden:        'vehicle_fraud',
  debts_hidden:           'vehicle_fraud',
  km_suspect:             'vehicle_fraud',
  engine_issue:           'vehicle_fraud',
  abroad_car:             'vehicle_fraud',

  // price_manipulation
  unrealistic_price:      'price_manipulation',
  fake_promo:             'price_manipulation',
  high_shipping:          'price_manipulation',
  shipped_outside_eu:     'price_manipulation',

  // trust_positive
  success:                'trust_positive',
  ml_success:             'trust_positive',
  trusted_seller:         'trust_positive',
  verified_seller:        'trust_positive',
  verified_profile:       'trust_positive',
  ml_gold_seller:         'trust_positive',
  ml_platinum_seller:     'trust_positive',
  top_rated:              'trust_positive',
  good_feedback:          'trust_positive',
  good_reviews:           'trust_positive',
  trusted_stand:          'trust_positive',
  real_owner:             'trust_positive',
  answered_call:          'trust_positive',
  replied_messages:       'trust_positive',
  clear_communication:    'trust_positive',
  visit_done:             'trust_positive',
  saw_car:                'trust_positive',
  test_drive_ok:          'trust_positive',
  mechanic_check:         'trust_positive',
  mechanic_check_ok:      'trust_positive',
  history_check_ok:       'trust_positive',
  docs_complete:          'trust_positive',
  history_clear:          'trust_positive',
  real_owner:             'trust_positive',
  accepted_meeting:       'trust_positive',
  shows_invoice:          'trust_positive',
  with_invoice:           'trust_positive',
  as_described:           'trust_positive',
  ml_dispute_won:         'trust_positive',
  ml_fulfillment:         'trust_positive',
  accepted_returns:       'trust_positive',
  extra_photos:           'trust_positive',
  fast_responses:         'trust_positive',
  fast_reply:             'trust_positive',
};

// Metadados de exibição por padrão de fraude
const FRAUD_PATTERN_LABELS = {
  payment_fraud:          { label: 'Fraude de Pagamento',     color: '#dc2626', icon: '💳', severity: 'critical' },
  fake_listing:           { label: 'Anúncio Falso',           color: '#ea580c', icon: '📋', severity: 'high' },
  communication_redirect: { label: 'Redirecionamento Suspeito', color: '#7c3aed', icon: '📲', severity: 'high' },
  delivery_fraud:         { label: 'Fraude de Entrega',       color: '#dc2626', icon: '📦', severity: 'high' },
  product_fraud:          { label: 'Produto Falsificado',     color: '#ea580c', icon: '🎭', severity: 'high' },
  confirmed_fraud:        { label: 'Burla Confirmada',        color: '#991b1b', icon: '🚨', severity: 'critical' },
  account_suspicion:      { label: 'Perfil Suspeito',         color: '#ca8a04', icon: '🌱', severity: 'medium' },
  pressure_tactic:        { label: 'Pressão de Venda',        color: '#ca8a04', icon: '⏱️', severity: 'medium' },
  evasion:                { label: 'Evasão',                  color: '#ca8a04', icon: '🚫', severity: 'medium' },
  vehicle_fraud:          { label: 'Fraude de Veículo',       color: '#ea580c', icon: '🚗', severity: 'high' },
  price_manipulation:     { label: 'Preço Manipulado',        color: '#ca8a04', icon: '💰', severity: 'medium' },
  trust_positive:         { label: 'Vendedor de Confiança',   color: '#16a34a', icon: '✅', severity: 'safe' },
};

// ── Calibração aprendida com votos reais (config/learned.signalWeights) ──
// Mapa signalType -> predictividade P(dislike|sinal) em [0,1], + baseRate.
// Aplicado como MULTIPLICADOR sobre o peso estático (preserva escala/sinal):
// sinal que a comunidade confirma prever burla é amplificado; o que não
// prevê nada é atenuado. Centrado na base rate (Bayes).
let _learnedSignals = null;   // { weights:{sig:p}, baseRate:number }

function applyLearnedSignals(weights, baseRate) {
  if (!weights || typeof weights !== 'object') return;
  _learnedSignals = {
    weights,
    baseRate: (typeof baseRate === 'number' && baseRate > 0 && baseRate < 1) ? baseRate : 0.5
  };
}

/**
 * Devolve o peso de um sinal. 0 se desconhecido.
 * Se houver calibração aprendida para o sinal, ajusta por um multiplicador
 * = clamp(predictividade / baseRate, 0.4, 2.0).
 */
function getSignalWeight(signalType) {
  const base = SIGNAL_WEIGHTS[signalType] ?? 0;
  if (base === 0 || !_learnedSignals) return base;
  const p = _learnedSignals.weights[signalType];
  if (typeof p !== 'number') return base;
  const mult = Math.max(0.4, Math.min(2.0, p / _learnedSignals.baseRate));
  return base * mult;
}

/**
 * Devolve o tipo de fraude de um sinal.
 */
function getSignalFraudType(signalType) {
  return SIGNAL_FRAUD_TYPES[signalType] ?? 'unknown';
}

/**
 * Calcula o fraudScore e topFraudPattern a partir de um mapa {signal: count}.
 * Usado no dashboard e no badge.
 * @param {Object} signalCounts  ex: { ai_photos: 3, payment_outside: 7 }
 * @returns {{ fraudScore: number, topFraudPattern: string, patternCounts: Object }}
 */
function computeFraudScore(signalCounts = {}) {
  let fraudScore = 0;
  const patternCounts = {};

  for (const [sig, count] of Object.entries(signalCounts)) {
    const weight    = getSignalWeight(sig);
    const fraudType = getSignalFraudType(sig);
    if (weight === 0) continue;

    fraudScore += weight * count;

    if (fraudType !== 'unknown' && fraudType !== 'trust_positive') {
      patternCounts[fraudType] = (patternCounts[fraudType] || 0) + (weight > 0 ? weight * count : 0);
    }
  }

  const topFraudPattern = Object.entries(patternCounts)
    .sort((a, b) => b[1] - a[1])[0]?.[0] ?? null;

  return { fraudScore, topFraudPattern, patternCounts };
}

/**
 * Converte fraudScore em badgeState.
 * Thresholds calibrados para os dados actuais (sinais por anúncio 1-6).
 *
 *  >= 10   RISK    (pelo menos 2 sinais críticos ou 5 médios)
 *   4-9   WARNING
 *  <=-4   TRUSTED
 *   0- 3  SAFE    (apenas sinais fracos, ou maioria positivos)
 */
function fraudScoreToBadgeState(fraudScore, fallbackLikes = 0, fallbackDislikes = 0, uniqueUsers = 0) {
  // Se temos sinais com peso real, usá-los como sinal primário
  if (fraudScore >= 10) return BADGE_STATES.RISK;
  if (fraudScore >= 4)  return BADGE_STATES.WARNING;
  if (fraudScore <= -4) return BADGE_STATES.TRUSTED;
  if (fraudScore < 0)   return BADGE_STATES.SAFE;

  // Fallback para votos globais quando fraudScore ≈ 0 (sem sinais ainda)
  const total = fallbackLikes + fallbackDislikes;
  if (total > 0) {
    if (uniqueUsers >= 3 && fallbackLikes / total > 0.75) return BADGE_STATES.TRUSTED;
    if (fallbackLikes / total >= 0.5)                     return BADGE_STATES.SAFE;
    if (fallbackDislikes / total > 0.3)                   return BADGE_STATES.RISK;
  }

  return BADGE_STATES.WARNING;
}

/**
 * USER TRUST SCORE
 * Multiplicador que pondera o peso do voto de cada utilizador.
 * Evita brigading: 100 contas novas valem menos que 5 utilizadores veteranos.
 *
 * Escala: 0.5 (novato) → 5.0 (vigilante experiente)
 */
const TRUST_TIERS = {
  novice:    { min:   0, trust: 1.0, label: 'Colaborador'            },
  active:    { min:  10, trust: 1.5, label: 'Colaborador Activo'     },
  vigilante: { min:  50, trust: 2.5, label: 'Vigilante'              },
  verifier:  { min: 200, trust: 4.0, label: 'Verificador Experiente' },
};

function calculateUserTrust({ voteCount = 0, signalCount = 0, accuracyRate = null } = {}) {
  // Actividade ponderada: voto pesa o dobro de um sinal individual
  const activity = (voteCount || 0) + (signalCount || 0) * 0.5;

  let trust = TRUST_TIERS.novice.trust;
  if (activity >= TRUST_TIERS.verifier.min)       trust = TRUST_TIERS.verifier.trust;
  else if (activity >= TRUST_TIERS.vigilante.min) trust = TRUST_TIERS.vigilante.trust;
  else if (activity >= TRUST_TIERS.active.min)    trust = TRUST_TIERS.active.trust;

  // Modificador de precisão: 0.5× a 1.5× consoante a accuracy histórica.
  if (accuracyRate !== null && !isNaN(accuracyRate)) {
    const acc = Math.max(0, Math.min(1, accuracyRate));
    trust *= (0.5 + acc);
  }

  return Math.max(0.1, Math.min(5.0, +trust.toFixed(2)));
}

function trustTierLabel(voteCount = 0, signalCount = 0) {
  const activity = (voteCount || 0) + (signalCount || 0) * 0.5;
  if (activity >= TRUST_TIERS.verifier.min)  return TRUST_TIERS.verifier.label;
  if (activity >= TRUST_TIERS.vigilante.min) return TRUST_TIERS.vigilante.label;
  if (activity >= TRUST_TIERS.active.min)    return TRUST_TIERS.active.label;
  return TRUST_TIERS.novice.label;
}

/**
 * COMBO BONUS
 * Padrões de fraude raramente aparecem isolados. Quando coexistem,
 * a probabilidade real de fraude é exponencial, não aditiva.
 *
 * Ex: "fotos AI" sozinho → suspeito.
 *     "fotos AI" + "pagamento fora plataforma" → fraude quase certa.
 */
const LETHAL_COMBOS = [
  ['payment_fraud',   'communication_redirect'], // pede pagar + manda para WhatsApp
  ['payment_fraud',   'fake_listing'],            // anúncio falso + pede pagar
  ['fake_listing',    'communication_redirect'],  // anúncio falso + WhatsApp
  ['confirmed_fraud', 'payment_fraud'],           // burla confirmada + pagamento
  ['delivery_fraud',  'communication_redirect'],
  ['product_fraud',   'payment_fraud'],
];

function computeComboBonus(patternCounts = {}) {
  const active = Object.keys(patternCounts).filter(
    p => p !== 'trust_positive' && p !== 'unknown' && (patternCounts[p] || 0) > 0
  );
  if (active.length === 0) return 0;

  let bonus = 0;
  for (const [a, b] of LETHAL_COMBOS) {
    if (active.includes(a) && active.includes(b)) bonus += 8;
  }
  if (active.length >= 4)      bonus += 15;
  else if (active.length === 3) bonus += 10;

  return bonus;
}

/**
 * EFFECTIVE FRAUD SCORE
 * Combina fraudScore bruto + bónus de combo.
 * Feature primária para o modelo XGBoost futuro.
 */
function computeEffectiveFraudScore({ fraudScore = 0, fraudPatternCounts = {} } = {}) {
  const comboBonus = computeComboBonus(fraudPatternCounts);
  return {
    rawScore:       fraudScore,
    comboBonus,
    effectiveScore: fraudScore + (fraudScore > 0 ? comboBonus : 0),
    activePatterns: Object.keys(fraudPatternCounts).filter(
      p => p !== 'trust_positive' && p !== 'unknown' && fraudPatternCounts[p] > 0
    ),
  };
}

/**
 * SELLER FINGERPRINTING
 * Burlistas reutilizam identidade entre anúncios e plataformas.
 * Fingerprint estável permite rastrear: "este vendedor já apareceu noutros 4 anúncios marcados como fraude".
 *
 * normalizedName:  remove espaços, acentos, case
 * fingerprintId:   hash determinístico para uso como ID de colecção
 *
 * Futuro: phoneHash, emailHash, photoHashes (perceptual hash de imagens)
 */
function normalizeSellerName(raw) {
  if (!raw || typeof raw !== 'string') return null;
  return raw
    .toLowerCase()
    .normalize('NFD').replace(/[̀-ͯ]/g, '') // remove combining diacritical marks
    .replace(/[^a-z0-9]/g, '')                         // só alfanuméricos
    .slice(0, 60)
    || null;
}

// FNV-1a hash 32-bit — sync, sem deps, determinístico
function _fnv1a(str) {
  let h = 0x811c9dc5;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = (h + ((h << 1) + (h << 4) + (h << 7) + (h << 8) + (h << 24))) >>> 0;
  }
  return h.toString(16).padStart(8, '0');
}

/**
 * Calcula fingerprint estável do vendedor.
 * Combina: nome normalizado + plataforma + país (porque "João Silva" no OLX-PT
 * é provavelmente outra pessoa que "João Silva" no OLX-BR).
 *
 * @returns {{ id: string, normalizedName: string, components: Object } | null}
 */
function computeSellerFingerprint({ sellerName, platform, country, hostname } = {}) {
  const normalizedName = normalizeSellerName(sellerName);
  if (!normalizedName) return null;

  const components = {
    normalizedName,
    platform: (platform || '').toLowerCase(),
    country:  (country  || '').toUpperCase(),
    hostname: (hostname || '').toLowerCase(),
  };
  const seed = `${components.normalizedName}|${components.platform}|${components.country}`;
  const id   = `slr_${_fnv1a(seed)}`;
  return { id, normalizedName, components };
}

/**
 * Hash de uma string sensível (telemóvel, email, IBAN) para anonimização
 * antes de gravar no Firestore. Mantém-se a possibilidade de detecção de
 * reutilização (mesmo input → mesmo hash) sem expor o valor original.
 */
function hashSensitive(raw) {
  if (!raw) return null;
  return `h_${_fnv1a(String(raw).toLowerCase().trim())}`;
}
