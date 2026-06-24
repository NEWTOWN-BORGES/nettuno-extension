/**
 * NETTUNO — Affiliate & Sponsored Content Config
 *
 * Para ativar um parceiro: descomente uma entrada e preencha os campos.
 * Não é necessária nova submissão na CWS para alterar este ficheiro.
 *
 * Campos:
 *   id        — identificador único (para analytics)
 *   platforms — array de plataformas: 'olx','vinted','facebook','custojusto',
 *               'aliexpress','standvirtual','chinashops','idealista','default'
 *               Use ['*'] para mostrar em todas as plataformas.
 *   badge     — label do badge (ex: 'PARCEIRO', 'PATROCINADO')
 *   headline  — texto principal (máx ~35 chars para não truncar)
 *   cta       — call-to-action (ex: 'Ver oferta →')
 *   url       — URL de destino com tracking param (abre em nova aba)
 */
const AFFILIATES = [
  // ── Exemplo de parceiro (descomente para ativar) ──────────────────────────
  // {
  //   id: 'example',
  //   platforms: ['*'],
  //   badge: 'PARCEIRO',
  //   headline: 'Compra com proteção garantida',
  //   cta: 'Saber mais →',
  //   url: 'https://example.com/?ref=nettuno',
  // },
  // ── Parceiro específico para OLX / CustoJusto ─────────────────────────────
  // {
  //   id: 'safe-payments-olx',
  //   platforms: ['olx', 'custojusto'],
  //   badge: 'PARCEIRO',
  //   headline: 'Pagamentos seguros em marketplace',
  //   cta: 'Experimenta grátis →',
  //   url: 'https://example.com/olx?ref=nettuno',
  // },
];

/**
 * Devolve o parceiro mais relevante para a plataforma atual.
 * Prioriza parceiro específico; fallback para universais ('*').
 * @param {string} platform
 * @returns {object|null}
 */
function getAffiliate(platform) {
  if (!AFFILIATES || AFFILIATES.length === 0) return null;
  return (
    AFFILIATES.find(a => Array.isArray(a.platforms) && a.platforms.includes(platform)) ||
    AFFILIATES.find(a => Array.isArray(a.platforms) && a.platforms.includes('*')) ||
    null
  );
}
