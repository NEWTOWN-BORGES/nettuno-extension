/**
 * NETTUNO v4.0 - Firebase Edition
 * Integração completa: UI brutalista v3 + Firebase Firestore
 */

let currentAdId = null;
let currentPlatform = null;
let currentSiteConfig = null;
let unsubscribeMetrics = null;
let unsubscribeSignals = null;
let listingInterval = null;
let pageEnteredAt = null;
// Conjunto de funções unsubscribe dos listeners Firestore por badge da listagem.
// Limpado em cleanup() para evitar memory leaks em navegações SPA.
const badgeUnsubscribers = new Set();

// ==========================================================
// CONFIGURAÇÃO DE SITES
// ==========================================================
// Factories DRY para SITE_CONFIGS.
// - detailConfig: páginas de detalhe (URL única → 1 anúncio). Tenta cada regex em idRegexes
//   contra location.pathname; se falhar, chama idFallback() (opcional).
// - listingConfig: páginas de listagem (vários cards). Tenta cada regex contra link.href;
//   se o card for um <a>, usa o próprio; senão procura por linkSelector.
//
// Convenção: usar grupos non-capturing (?:...) nos regexes para que o ID esteja SEMPRE em match[1].
function _testPath(check, pathname) {
  if (typeof check === 'function') return !!check(pathname);
  if (check instanceof RegExp)     return check.test(pathname);
  if (typeof check === 'string')   return pathname.includes(check);
  return true;
}

function detailConfig({ name, platform, idPrefix = platform, hostnameMatch, pathCheck, idRegexes, idFallback }) {
  const regexes = Array.isArray(idRegexes) ? idRegexes : [idRegexes];
  return {
    name, platform,
    check: () => window.location.hostname.includes(hostnameMatch) && _testPath(pathCheck, window.location.pathname),
    isDetailPage: true,
    getId: () => {
      for (const rx of regexes) {
        const m = window.location.pathname.match(rx);
        if (m && m[1]) return `${idPrefix}_${m[1]}`;
      }
      return idFallback ? idFallback() : null;
    }
  };
}

function listingConfig({ name, platform, idPrefix = platform, hostnameMatch, pathExclude, listingSelector, linkSelector = 'a', idRegexes, idFallback }) {
  const regexes = Array.isArray(idRegexes) ? idRegexes : [idRegexes];
  return {
    name, platform,
    check: () => {
      if (!window.location.hostname.includes(hostnameMatch)) return false;
      if (pathExclude == null) return true;
      return !_testPath(pathExclude, window.location.pathname);
    },
    isDetailPage: false,
    listingSelector,
    getId: (node) => {
      const link = (node.tagName === 'A' && node.href) ? node : node.querySelector(linkSelector);
      if (!link?.href) return null;
      for (const rx of regexes) {
        const m = link.href.match(rx);
        if (m && m[1]) return `${idPrefix}_${m[1]}`;
      }
      return idFallback ? idFallback(link, node) : null;
    }
  };
}

const SITE_CONFIGS = [
  // VENDIX — getId baseado em título (custom) → fica como raw object
  {
    name: 'vendix',
    platform: 'vendix',
    check: () => window.location.hostname.includes('nettuno-e6036.web.app') && window.location.pathname.includes('marketplace'),
    isDetailPage: false,
    listingSelector: '.card',
    getId: (node) => {
      const title = node.querySelector('.card-title')?.textContent?.trim() || '';
      return title ? 'vendix_' + title.replace(/\W+/g, '').toLowerCase().slice(0, 18) : null;
    }
  },
  detailConfig({
    name: 'idealista-detail', platform: 'idealista',
    hostnameMatch: 'idealista.',
    pathCheck:  /\/(?:imovel|inmueble|immobile|immobili)\/\d+/i,
    idRegexes:  /\/(?:imovel|inmueble|immobile|immobili)\/(\d+)/i,
  }),
  listingConfig({
    name: 'idealista', platform: 'idealista',
    hostnameMatch: 'idealista.',
    listingSelector: 'article.item, article[class*="item"], .item, div[class*="property-card"], a[href*="/imovel/"], a[href*="/inmueble/"]',
    linkSelector:    'a.item-link, a[href*="/imovel/"], a[href*="/inmueble/"]',
    idRegexes:       /\/(?:imovel|inmueble|immobile|immobili)\/(\d+)/i,
  }),
  detailConfig({
    name: 'imovirtual-detail', platform: 'imovirtual',
    hostnameMatch: 'imovirtual.',
    pathCheck: '/anuncio/',
    idRegexes: [/-ID([a-zA-Z0-9]+)\.html/i, /\/(\d+)\//],
    idFallback: () => `imovirtual_${window.location.pathname.split('/').pop().split('.')[0]}`,
  }),
  listingConfig({
    name: 'imovirtual', platform: 'imovirtual',
    hostnameMatch: 'imovirtual.',
    // Imovirtual 2026: React SPA — cards em article[data-cy] ou li + fallbacks OLX-like
    listingSelector: 'article[data-cy="listing-item"], li[data-cy="listing-item"], article[data-testid], div[data-cy="l-card"], article:has(a[href*="/anuncio/"]), article:has(a[href*="-ID"])',
    linkSelector:    'a[href*="/anuncio/"], a[href*="/oferta/"], a[href*="-ID"]',
    idRegexes: [/-ID([a-zA-Z0-9]+)\.html/i, /\/(\d+)\//, /\/(\d+)$/],
    idFallback: (link) => `imovirtual_${link.href.split('?')[0].split('/').pop().replace('.html', '')}`,
  }),
  detailConfig({
    name: 'olx-detail', platform: 'olx',
    hostnameMatch: 'olx.',
    pathCheck: '/d/',
    idRegexes: [/-ID([a-zA-Z0-9]+)\.html/i, /\/(\d+)\//],
    idFallback: () => `olx_${window.location.pathname.split('/').pop().split('.')[0]}`,
  }),
  listingConfig({
    name: 'olx', platform: 'olx',
    hostnameMatch: 'olx.',
    // OLX 2026 removeu data-cy/data-testid dos cards e o listing passou a ser <a> direto
    // com href /d/anuncio/...-ID{X}.html. Mantemos os seletores antigos como fallback.
    listingSelector: 'a[href*="/d/anuncio/"][href*="-ID"], [data-cy="l-card"], [data-testid="l-card"], [data-testid="listing-ad"], li[data-testid="listing-ad"], div[class*="ad-card"]',
    linkSelector:    'a[href*="/d/"], a[href*="/anuncio/"], a[href*="-ID"]',
    idRegexes: [/-ID([a-zA-Z0-9]+)\.html/i, /\/(\d+)\//],
    idFallback: (link) => `olx_${link.href.split('?')[0].split('/').pop().replace('.html', '')}`,
  }),
  detailConfig({
    name: 'standvirtual-detail', platform: 'standvirtual',
    hostnameMatch: 'standvirtual.',
    pathCheck: '/anuncio/',
    idRegexes: [/-ID([a-zA-Z0-9]+)\.html/i, /\/(\d+)\//],
    idFallback: () => `standvirtual_${window.location.pathname.split('/').pop().split('.')[0]}`,
  }),
  listingConfig({
    name: 'standvirtual', platform: 'standvirtual',
    hostnameMatch: 'standvirtual.',
    // Standvirtual 2026: cards em article ou div com data-testid; fallback por link
    listingSelector: 'article[data-testid], div[data-testid="listing-ad"], div[data-testid="ad-card"], div[class*="offer-item"], article:has(a[href*="/anuncio/"]), article:has(a[href*="-ID"])',
    linkSelector:    'a[href*="/anuncio/"], a[href*="-ID"]',
    idRegexes: [/-ID([a-zA-Z0-9]+)\.html/i, /\/(\d+)\//],
    idFallback: (link) => `standvirtual_${link.href.split('?')[0].split('/').filter(Boolean).pop().replace('.html','')}`,
  }),
  detailConfig({
    name: 'facebook-detail', platform: 'facebook',
    hostnameMatch: 'facebook.',
    pathCheck: '/marketplace/item/',
    idRegexes: /\/marketplace\/item\/(\d+)/,
  }),
  {
    name: 'facebook',
    platform: 'facebook',
    check: () => window.location.hostname.includes('facebook.') && window.location.pathname.includes('/marketplace'),
    isDetailPage: false,
    // Seletores baseados em role/data-testid — classes Styletron (x9f619 etc) mudam a cada deploy do FB
    listingSelector: 'div[data-testid="marketplace_listing_card"], div[role="main"] div[role="article"]:has(a[href*="/marketplace/item/"]), div[role="article"] a[href*="/marketplace/item/"]',
    getId: (node) => {
      // 1. Tentar encontrar o link padrão do Marketplace
      const link = node.querySelector('a[href*="/marketplace/item/"]');
      if (link?.href) {
        const match = link.href.match(/\/marketplace\/item\/(\d+)/);
        if (match) return `facebook_${match[1]}`;
      }
      
      // 2. Fallback: procurar qualquer link que contenha um ID numérico longo (padrão FB)
      const allLinks = node.querySelectorAll('a');
      for (const a of allLinks) {
        const href = a.href || '';
        const match = href.match(/\/item\/(\d+)/) || href.match(/(\d{10,})/);
        if (match) return `facebook_${match[1]}`;
      }
      
      return null;
    }
  },
  detailConfig({
    name: 'custojusto-detail', platform: 'olx', idPrefix: 'custojusto',
    hostnameMatch: 'custojusto.pt',
    pathCheck: (p) => /-(\d+)\.htm/.test(p) || /-(\d+)$/.test(p),
    idRegexes: [/-(\d+)\.htm/, /-(\d+)$/],
  }),
  {
    name: 'custojusto',
    platform: 'olx',
    check: () => window.location.hostname.includes('custojusto.pt') && !window.location.pathname.match(/-(\d+)(\.htm|$)/),
    isDetailPage: false,
    listingSelector: 'a[data-name="url"], div.container_related',
    getId: (node) => {
      const link = node.tagName === 'A' ? node : node.querySelector('a[data-name="url"]');
      if (link?.id && /^\d+$/.test(link.id)) return `custojusto_${link.id}`;
      if (link?.href) {
        const match = link.href.match(/-(\d{5,})(\?|#|$)/);
        return match ? `custojusto_${match[1]}` : null;
      }
      return null;
    }
  },
  detailConfig({
    name: 'aliexpress-detail', platform: 'chinashops', idPrefix: 'aliexpress',
    hostnameMatch: 'aliexpress.',
    pathCheck: '/item/',
    idRegexes: /\/item\/(\d+)/,
  }),
  listingConfig({
    name: 'aliexpress', platform: 'chinashops', idPrefix: 'aliexpress',
    hostnameMatch: 'aliexpress.',
    listingSelector: 'div[class*="product-card"], div[class*="item-card"], div[class*="search-item-card"], div[class*="list-item"]',
    linkSelector:    'a[href*="/item/"]',
    idRegexes: /\/item\/(\d+)/,
  }),
  detailConfig({
    name: 'vinted-detail', platform: 'vinted',
    hostnameMatch: 'vinted.',
    pathCheck: /\/items\/\d+/,
    idRegexes: /\/items\/(\d+)/,
  }),
  listingConfig({
    name: 'vinted', platform: 'vinted',
    hostnameMatch: 'vinted.',
    pathExclude: /\/items\/\d+/,
    // data-testid="grid-item" é o container do card no DOM React da Vinted
    listingSelector: '[data-testid="grid-item"], [class*="ItemBox"], [class*="item-box"], [class*="new-item-box"]',
    linkSelector:    'a[href*="/items/"]',
    idRegexes: /\/items\/(\d+)/,
  }),
  detailConfig({
    name: 'mercadolivre-detail', platform: 'mercadolivre', idPrefix: 'ml',
    hostnameMatch: 'mercadolivre.com.br',
    pathCheck: /\/p\/ML[A-Z]/,
    idRegexes: /\/p\/(ML[A-Z]\w+)/,
  }),
  listingConfig({
    name: 'mercadolivre', platform: 'mercadolivre', idPrefix: 'ml',
    hostnameMatch: 'mercadolivre.com.br',
    listingSelector: 'li.ui-search-layout__item, .ui-search-result, .poly-card',
    linkSelector:    'a[href*="/p/ML"], a[href*="mercadolivre.com.br/"], a',
    idRegexes: [/\/p\/(ML[A-Z]\w+)/, /(ML[A-Z]-\d+)/],
  }),
  // ========== eBay (Global — com, co.uk, de, fr, it, es, com.br) ==========
  // URLs eBay 2025: /itm/TITULO/123456789 OU /itm/123456789 — regex cobre ambos.
  detailConfig({
    name: 'ebay-detail', platform: 'ebay',
    hostnameMatch: 'ebay.',
    pathCheck: /\/itm\//,
    idRegexes: [/\/itm\/(?:[^/?#]+\/)?(\d{8,})/, /\/itm\/(\d+)/],
  }),
  listingConfig({
    name: 'ebay', platform: 'ebay',
    hostnameMatch: 'ebay.',
    pathExclude: /\/itm\//,
    listingSelector: 'li.s-item:not(.s-item--placeholder), li[class*="s-item"]:not(.s-item--placeholder), div.s-item, div[data-component-type="s-search-result"]',
    linkSelector:    'a.s-item__link, a[href*="/itm/"], a',
    idRegexes: [/\/itm\/(?:[^/?#]+\/)?(\d{8,})/, /\/itm\/(\d+)/],
  }),
  // ========== Amazon (Global — com, co.uk, de, fr, it, es, com.br, in) ==========
  detailConfig({
    name: 'amazon-detail', platform: 'amazon',
    hostnameMatch: 'amazon.',
    pathCheck: /\/(?:dp|gp\/product)\/[A-Z0-9]{10}/,
    idRegexes: /\/(?:dp|gp\/product)\/([A-Z0-9]{10})/,
  }),
  {
    name: 'amazon',
    platform: 'amazon',
    check: () => window.location.hostname.includes('amazon.') && !/\/(dp|gp\/product)\/[A-Z0-9]{10}/.test(window.location.pathname),
    isDetailPage: false,
    listingSelector: 'div[data-asin]:not([data-asin=""]), div[data-component-type="s-search-result"]',
    getId: (node) => {
      const asin = node.dataset?.asin;
      if (asin && asin.length === 10) return `amazon_${asin}`;
      const link = node.querySelector('a[href*="/dp/"]');
      if (link?.href) {
        const match = link.href.match(/\/dp\/([A-Z0-9]{10})/);
        return match ? `amazon_${match[1]}` : null;
      }
      return null;
    }
  },
  detailConfig({
    name: 'wallapop-detail', platform: 'wallapop', idPrefix: 'wp',
    hostnameMatch: 'wallapop.com',
    pathCheck: '/item/',
    idRegexes: /\/item\/[^/]+-(\d{7,})/,
    idFallback: () => {
      const slug = window.location.pathname.split('/').pop();
      return slug ? `wp_${slug}` : null;
    },
  }),
  {
    name: 'wallapop',
    platform: 'wallapop',
    check: () => window.location.hostname.includes('wallapop.com') && !/\/item\//.test(window.location.pathname),
    isDetailPage: false,
    listingSelector: '[data-testid="ItemCard"], [class*="item-card"], a[href*="/item/"]',
    getId: (node) => {
      const link = node.tagName === 'A' ? node : node.querySelector('a[href*="/item/"]');
      if (link?.href) {
        const match = link.href.match(/\/item\/[^/]+-(\d{7,})/);
        if (match) return `wp_${match[1]}`;
        const slug = link.href.split('/item/')[1]?.split('?')[0];
        return slug ? `wp_${slug}` : null;
      }
      return null;
    }
  },
];

// ==========================================================
// INICIALIZAÇÃO
// ==========================================================
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}

// Carrega a calibração aprendida (config/learned) e aplica às heurísticas.
// Leitura pública; se o doc ainda não existir (backend não treinou), usa
// os pesos por defeito. Nunca bloqueia nem falha a inicialização.
async function _loadLearnedConfig() {
  try {
    if (typeof db === 'undefined' || typeof Heuristics === 'undefined') return;
    const snap = await db.collection('config').doc('learned').get();
    if (snap && snap.exists) {
      const cfg = snap.data();
      Heuristics.applyLearned(cfg);
      // aplica também os pesos aprendidos dos SINAIS HUMANOS ao fraudScore
      if (typeof applyLearnedSignals === 'function' && cfg.signalWeights) {
        applyLearnedSignals(cfg.signalWeights, cfg.baseRate);
      }
    }
  } catch (e) { /* offline / sem doc: mantém defaults */ }
}

async function init() {

  try {
    await initAuth();

    await _loadLearnedConfig().catch(() => {});

    detectPageType();
    observeNavigation();

  } catch (err) {
    console.error('[NETTUNO] Erro ao inicializar:', err);
  }
}

// ==========================================================
// DETEÇÃO DE PÁGINA
// ==========================================================
function detectPageType() {
  const url = window.location.href;
  const hostname = window.location.hostname;
  const pathname = window.location.pathname;

  console.log('[NETTUNO] detectPageType →', hostname, pathname);

  let config = SITE_CONFIGS.find(c => {
    const ok = c.isDetailPage && c.check();
    return ok;
  });

  if (!config) {
    config = SITE_CONFIGS.find(c => {
      const ok = !c.isDetailPage && c.check();
      return ok;
    });
  }

  if (!config) {
    console.log('[NETTUNO] Nenhum config encontrado para', hostname);
    return;
  }

  console.log('[NETTUNO] Config encontrado:', config.name, '| isDetail:', config.isDetailPage);
  
  currentSiteConfig = config;
  currentPlatform = config.platform;
  pageEnteredAt = Date.now();

  if (config.isDetailPage) {
    currentAdId = config.getId();
    if (currentAdId) {
      injectDetailBadge();
    }
  } else {
    startListingScanner();
  }
}

function observeNavigation() {
  let lastUrl = location.href;

  const handleNav = () => {
    const url = location.href;
    if (url !== lastUrl) {
      lastUrl = url;
      cleanup();
      setTimeout(detectPageType, 500);
    }
  };

  const navObs = new MutationObserver(handleNav);
  navObs.observe(document, { subtree: true, childList: true });
  window._scmNavObs = navObs; // saved for cleanup
  window.addEventListener('popstate', handleNav);

  // Patch pushState + replaceState (SPAs usam ambos)
  if (!history._scmPatched) {
    const origPush    = history.pushState;
    const origReplace = history.replaceState;
    history.pushState = function() {
      origPush.apply(this, arguments);
      handleNav();
    };
    history.replaceState = function() {
      origReplace.apply(this, arguments);
      handleNav();
    };
    history._scmPatched = true;
  }
}

function cleanup() {
  if (unsubscribeMetrics) { unsubscribeMetrics(); unsubscribeMetrics = null; }
  if (unsubscribeSignals) { unsubscribeSignals(); unsubscribeSignals = null; }
  if (listingInterval) {
    if (typeof listingInterval.disconnect === 'function') listingInterval.disconnect();
    else clearInterval(listingInterval);
    listingInterval = null;
  }
  // Desligar o MutationObserver de navegação para evitar memory leak
  if (window._scmNavObs) {
    window._scmNavObs.disconnect();
    window._scmNavObs = null;
  }

  // Cancelar todos os listeners Firestore dos badges da listagem
  badgeUnsubscribers.forEach(fn => { try { fn(); } catch (e) { /* noop */ } });
  badgeUnsubscribers.clear();

  const oldBadge = document.getElementById('scm-detail-badge');
  if (oldBadge) oldBadge.remove();

  UIRenderer.closePanel();

  currentAdId = null;
  currentPlatform = null;
  currentSiteConfig = null;
  // Não limpar scannedAdIds — evita badges duplicados em back-navigation SPA.
  // O Set acumula IDs já processados; elementos novos (sem data-scm-v4) são apanhados pelo MO.
}

// ==========================================================
// PÁGINA DE DETALHE - Badge fixo
// ==========================================================
async function _saveVisitedAd(adId, metrics) {
  const { scm_visited_ads } = await NettunoUtils.Storage.get(['scm_visited_ads']);
  const visited = scm_visited_ads || {};
  if (visited[adId]) return; // já guardado
  visited[adId] = {
    url: window.location.href,
    title: document.title.replace(/\s*[-|–].*$/, '').trim(),
    dislikesAtVisit: Number(metrics?.dislikes || 0),
    visitedAt: Date.now()
  };
  // Manter máximo 100 anúncios; apagar o mais antigo
  const keys = Object.keys(visited);
  if (keys.length > 100) {
    const oldest = keys.sort((a, b) => (visited[a].visitedAt || 0) - (visited[b].visitedAt || 0))[0];
    delete visited[oldest];
  }
  NettunoUtils.Storage.set({ scm_visited_ads: visited });
}

async function injectDetailBadge() {
  if (!currentAdId || document.getElementById('scm-detail-badge')) return;

  const metrics = await getAdData(currentAdId) || {};
  const userVote = await getUserVote(currentAdId);

  _saveVisitedAd(currentAdId, metrics);

  // [ARRANQUE A FRIO] Análise heurística local da página de detalhe — avisa
  // sobre burlas sem depender de votos. Foca no contentor de descrição do
  // anúncio (evita varrer nav/rodapé → falsos positivos).
  let detailLocalFraud = 0;
  try {
    const descSel = '[data-cy="ad_description"], [data-testid="ad-description"], ' +
      '.css-description, #productDescription, #feature-bullets, .x-item-description, ' +
      '.ad-comment, .comment, [class*="description"], [class*="Description"]';
    const container = document.querySelector(descSel) || document.querySelector('main, article') || document.body;
    Heuristics.analyzeElement(container);
    const localRisk = Heuristics.calculateRiskScore(container); // 0-1
    detailLocalFraud = localRisk >= 0.6 ? 10 : localRisk >= 0.3 ? 5 : 0;
    // Análise local supera a comunidade → ALERT (laranja) + lista de sinais.
    if (detailLocalFraud > (Number(metrics.fraudScore) || 0)) {
      metrics.fraudScore = detailLocalFraud;
      metrics.heuristics = Heuristics.getSummary(container);
      metrics.badgeState = (typeof BADGE_STATES !== 'undefined') ? BADGE_STATES.ALERT : 'ALERT';
    }
  } catch (e) { /* heurística falhou: mantém estado da comunidade */ }

  const badge = UIRenderer.createBadge(currentAdId, metrics || {});
  badge.id = 'scm-detail-badge';
  badge._scmLocalFraud = detailLocalFraud; // re-aplicado pelo listener (evita "piscar")

  const isIdealista = currentSiteConfig.platform === 'idealista';

  // Idealista tem DOM próprio — anexar o escudo junto ao título/preço do anúncio
  // em vez do fallback fixo (que flutuava num canto sobre o conteúdo).
  const idealistaTarget = isIdealista
    ? document.querySelector('.main-info__title-main, .main-info__title, .info-data-price, h1')
    : null;

  // Seletores por plataforma — do mais específico ao mais genérico
  const platformPriceSelectors = {
    amazon:       '#corePriceDisplay_desktop_feature_div, #apex_desktop .a-price, #priceblock_ourprice, .priceToPay, .a-price, #price',
    ebay:         '.x-price-primary, [data-testid="x-price-primary"], .x-item-title__mainTitle',
    standvirtual: '.offer-price__number, [data-testid="ad-price"], [class*="offer-price"], [class*="Price"]',
    imovirtual:   '[data-cy="adPageAdPrice"], .price-final, [class*="price-value"], [class*="Price"], [class*="price"]',
    olx:          '[data-cy="adPageAdPrice"], [data-testid="ad-price-container"]',
    vinted:       '[data-testid="item-price"], [class*="Price"]',
    imovirtual:   '.price-final, [class*="price"], [class*="Price"]',
  };
  const platformSel = platformPriceSelectors[currentSiteConfig?.platform] || '';
  const genericSel  = '[data-testid="ad-price-container"], [class*="Price"], .offer-price__number, [data-cy="adPageAdPrice"], .ad-price, h1, .title';
  const targetSelector = platformSel ? `${platformSel}, ${genericSel}` : genericSel;
  const targetEl = idealistaTarget || (isIdealista ? null : document.querySelector(targetSelector));
  let injected = false; // declaração local — evita variável global implícita

  if (idealistaTarget) {
    // Idealista: injetar inline a seguir ao título, na mesma linha
    idealistaTarget.parentNode.insertBefore(badge, idealistaTarget.nextSibling);
    badge.style.display = 'inline-flex';
    badge.style.marginLeft = '10px';
    badge.style.verticalAlign = 'middle';
    injected = true;
  } else if (targetEl && !isIdealista) {
    const platform = currentSiteConfig.platform;
    if (platform === 'standvirtual') {
      // Standvirtual: Injetar ANTES do preço e forçar mesma linha
      targetEl.parentNode.style.display = 'flex';
      targetEl.parentNode.style.alignItems = 'center';
      targetEl.parentNode.style.flexWrap = 'wrap';
      targetEl.parentNode.insertBefore(badge, targetEl);
      badge.style.display = 'inline-flex';
      badge.style.marginRight = '12px';
      badge.style.verticalAlign = 'middle';
      badge.style.flexShrink = '0';
      injected = true;
    } else if (platform === 'amazon') {
      // Amazon: anexar ao container do título (#productTitle) se preço falhar,
      // ou logo antes do preço (mais visível junto ao botão "Adicionar ao carrinho")
      const titleEl = document.querySelector('#productTitle, #title');
      const priceContainer = document.querySelector('#apex_desktop, #corePriceDisplay_desktop_feature_div, #centerCol');
      const anchor = priceContainer || titleEl || targetEl;
      if (anchor && anchor.parentNode) {
        anchor.parentNode.insertBefore(badge, anchor.nextSibling);
        badge.style.display = 'inline-flex';
        badge.style.margin = '8px 0 4px 0';
        badge.style.verticalAlign = 'middle';
        injected = true;
      }
    } else {
      // Outros: Injetar após o elemento alvo
      targetEl.parentNode.insertBefore(badge, targetEl.nextSibling);
      badge.style.display = 'inline-flex';
      badge.style.marginLeft = '10px';
      badge.style.verticalAlign = 'middle';
    }
  } else {
    // Fallback: Fixed (se não encontrar alvo em nenhum site, incluindo idealista
    // se a estrutura do DOM mudar) — top-right, não tapa o conteúdo principal.
    badge.style.cssText = 'position:fixed;top:100px;right:20px;z-index:999999;';
    document.body.appendChild(badge);
  }
  
  badge.addEventListener('click', async (e) => {
    e.stopPropagation();
    
    const userEvents = await getUserEvents(currentAdId);
    const freshVote = await getUserVote(currentAdId);
    if (freshVote && freshVote.voteType) {
      userEvents.vote = freshVote.voteType;
    }
    const freshMetrics = await getAdData(currentAdId);
    
    const panel = UIRenderer.openPanel(
      currentAdId,
      currentPlatform,
      freshMetrics || {},
      userEvents,
      handlePanelEvent,
      (typeof auth !== 'undefined') ? auth.currentUser : null
    );
    
    UIRenderer.positionPanel(badge, panel);
  });
  
  startRealtimeListeners(currentAdId, badge);
}

// ==========================================================
// LISTAGEM - Scanner de cards
// ==========================================================
const scannedAdIds = new Set();

function startListingScanner() {
  if (!currentSiteConfig || !currentSiteConfig.listingSelector) return;

  scanListingItems();

  // MutationObserver reacts to DOM changes (vs polling every 1s).
  // Debounce de 150ms: em sites com lazy-load (OLX/eBay) o DOM muda ~100×/seg
  // durante scroll. Sem debounce, scanListingItems() varreria a página inteira
  // em cada mutação. Com 150ms agregamos rajadas num único scan.
  let scanTimer;
  const scanDebounced = () => {
    clearTimeout(scanTimer);
    scanTimer = setTimeout(scanListingItems, 150);
  };
  const obs = new MutationObserver(scanDebounced);
  obs.observe(document.body, { childList: true, subtree: true });
  listingInterval = obs; // cleanup() handles both MO and legacy interval
}

async function scanListingItems() {
  if (!currentSiteConfig) return;

  // Apply :not([data-scm-v4]) to each part of compound selectors individually
  const selectorWithNot = currentSiteConfig.listingSelector
    .split(',').map(s => `${s.trim()}:not([data-scm-v4])`).join(', ');
  let items = document.querySelectorAll(selectorWithNot);

  if (!items.length && currentSiteConfig.platform === 'default') {
    const fallbackSelector = 'article:not([data-scm-v4]), div[class*="item"]:not([data-scm-v4]), div[class*="card"]:not([data-scm-v4]), div[class*="property"]:not([data-scm-v4])';
    items = document.querySelectorAll(fallbackSelector);
  }

  if (!items.length && currentSiteConfig.platform === 'ebay') {
    // Limite de 500 links para evitar varrer o DOM inteiro em páginas pesadas
    const ebayLinks = Array.from(document.querySelectorAll('a[href*="/itm/"]')).slice(0, 500);
    const containers = new Set();
    ebayLinks.forEach(link => {
      const parent = link.closest('li.s-item, [data-component-type="s-search-result"], [class*="search-result"], li, article, [class*="item"]');
      if (parent && parent !== document.body && !parent.hasAttribute('data-scm-v4')) containers.add(parent);
    });
    items = Array.from(containers);
  }

  if (!items.length) {
    const links = document.querySelectorAll(`a[href*="/imovel/"]:not([data-scm-v4]), a[href*="/inmueble/"]:not([data-scm-v4]), a[href*="/anuncio/"]:not([data-scm-v4])`);
    const containers = new Set();
    links.forEach(link => {
      const parent = link.closest('article, div[class*="item"], div[class*="card"], li, [class*="property"]');
      if (parent && !parent.hasAttribute('data-scm-v4')) containers.add(parent);
    });
    items = Array.from(containers);
  }
  
  if (!items.length) return;
  
  const newItems = Array.from(items).filter(item => !item.hasAttribute('data-scm-v4'));
  if (!newItems.length) return;
  
  
  Heuristics.runAll(newItems);
  
  newItems.forEach(item => {
    item.setAttribute('data-scm-v4', '1');
    
    const adId = currentSiteConfig.getId(item);
    if (adId) {
      if (!scannedAdIds.has(adId)) {
        scannedAdIds.add(adId);
        injectListingBadge(item, adId).catch(err => console.error('[NETTUNO] Erro ao injetar badge:', adId, err));
      }
    } else {
    }
  });
}

async function injectListingBadge(item, adId) {
  // Limpar qualquer badge órfão ou duplicado antes de começar
  const existing = item.querySelectorAll('.as-badge-container');
  if (existing.length > 0) return;
  
  // 1. Criar badge pequeno para cards de listagem
  const badge = UIRenderer.createBadge(adId, { badgeState: BADGE_STATES.WARNING });
  badge.classList.add('as-badge-listing');
  badge.style.zIndex = '99999';

  let injected = false;

  // Seletores de preço ordenados por especificidade (mais específico primeiro)
  const priceSelectors = [
    'span.txt-big',                                         // Idealista
    '.s-item__price',                                       // eBay
    '[data-testid="ad-price"]', '[data-testid*="price"]',  // genérico data-testid
    '[class*="Price"]:not([class*="Old"]):not([class*="strike"]):not([class*="compare"]):not([class*="Discount"])',
    '[class*="price"]:not([class*="old"]):not([class*="strike"]):not([class*="original"]):not([class*="compare"])',
    'h3',                                                   // Standvirtual usa h3 para o preço
    '.offer-price', '.item-price', '.product-price',
  ];

  // Tentativa 1: injetar ao lado do preço
  for (const sel of priceSelectors) {
    const priceEl = item.querySelector(sel);
    if (!priceEl) continue;
    const parent = priceEl.parentNode;
    if (!parent) continue;
    const display = getComputedStyle(parent).display;
    // Não forçar flex em grid — badge ficaria fora do fluxo
    if (display === 'grid') {
      // Em grid, inserir badge diretamente antes do elemento de preço como item de grid
      parent.insertBefore(badge, priceEl);
      badge.style.cssText += ';grid-column:1;align-self:center;';
      injected = true;
      break;
    }
    if (display !== 'flex' && display !== 'inline-flex') {
      parent.style.display = 'flex';
      parent.style.alignItems = 'center';
      parent.style.flexWrap = 'wrap';
      parent.style.gap = '6px';
    }
    parent.insertBefore(badge, priceEl);
    badge.style.flexShrink = '0';
    injected = true;
    break;
  }

  // Tentativa 2: após o título (fallback se não houver preço visível)
  if (!injected) {
    const titleEl = item.querySelector('h4, h2, h3, h6, [data-cy*="title"], [class*="title"]:not([class*="price"]), .title');
    if (titleEl && titleEl.parentNode) {
      titleEl.parentNode.insertBefore(badge, titleEl.nextSibling);
      badge.style.display = 'inline-flex';
      badge.style.verticalAlign = 'middle';
      badge.style.marginLeft = '6px';
      injected = true;
    }
  }

  // Tentativa 3: canto superior direito em posição absoluta
  if (!injected) {
    if (getComputedStyle(item).position === 'static') item.style.position = 'relative';
    badge.style.position = 'absolute';
    badge.style.top = '8px';
    badge.style.right = '8px';
    item.appendChild(badge);
  }

    // 3. Carregar métricas reais em background e atualizar
    try {
      const metrics = await getAdData(adId);
      const heuristicFlags = Heuristics.getSummary(item);
      if (heuristicFlags.length > 0) metrics.heuristics = heuristicFlags;

      // [ARRANQUE A FRIO] As heurísticas locais (preço irreal, fotos genéricas,
      // clones, palavras suspeitas) avisam SEM precisar de votos da comunidade.
      // Convertemos o risco local (0-1) num fraudScore e ficamos com o PIOR
      // entre comunidade e análise local → o escudo fica útil desde o dia 1.
      try {
        const localRisk = Heuristics.calculateRiskScore(item); // 0-1
        const localFraud = localRisk >= 0.6 ? 10 : localRisk >= 0.3 ? 5 : 0;
        badge._scmLocalFraud = localFraud; // guardado p/ re-aplicar nos updates do listener
        _mergeLocalFraud(badge, metrics);
      } catch (e) { /* heurística falhou: mantém estado da comunidade */ }

      // Guardar metadados no elemento para uso posterior no voto
      const titleEl = item.querySelector('h2, h3, h6, [data-cy*="title"], [class*="title"], .title, [data-testid*="title"]');
      const imgEl = item.querySelector('img');
      const linkEl = item.querySelector('a[href*="/items/"], a[href*="/d/"], a[href]');
      const descEl = item.querySelector('[class*="description"], [class*="subtitle"], [class*="detail"], p');
      let url = linkEl?.href || '';
      if (url && url.startsWith('/')) url = location.origin + url;
      const thumbSrc = imgEl?.src || imgEl?.dataset?.src || imgEl?.dataset?.lazySrc || imgEl?.dataset?.original || '';
      // Fallback de título: alt da imagem ou slug da URL (ex: "/items/123-cadeira-azul" → "cadeira azul")
      const titleFromAlt = imgEl?.alt?.trim();
      const titleFromSlug = url ? (url.match(/\/items\/\d+-([^/?#]+)/) || url.match(/-(\d+)(?:\.htm)?$/))?.[1]?.replace(/-/g, ' ') : '';
      item._scmMetadata = {
        title: _scmCleanTitle(titleEl?.textContent?.trim()) || titleFromAlt || titleFromSlug || document.title.split('|')[0].trim() || 'Anúncio',
        thumbnail: thumbSrc,
        site: currentSiteConfig.name,
        url: url,
        description: descEl?.textContent?.trim().slice(0, 140) || ''
      };

      UIRenderer.updateBadge(badge, metrics);
    } catch (err) {
    }
  
  badge.addEventListener('click', async (e) => {
    e.preventDefault();
    e.stopPropagation();
    e.stopImmediatePropagation();

    const userEvents = await getUserEvents(adId, true);  // forceFresh: evita cache stale do offline persistence
    const userVote = await getUserVote(adId);
    if (userVote && userVote.voteType) {
      userEvents.vote = userVote.voteType;
    }
    const freshMetrics = await getAdData(adId);

    const panel = UIRenderer.openPanel(
      adId,
      currentPlatform,
      freshMetrics || {},
      userEvents,
      async (type, data) => {
        if (type === 'vote') {
          await handleVote(adId, data);
        } else if (type === 'signal') {
          await handleSignal(adId, data.signalType, data.phase, data.isSub);
        }
      },
      (typeof auth !== 'undefined') ? auth.currentUser : null
    );
    
    UIRenderer.positionPanel(badge, panel);
    
    // Listeners em tempo real para o painel aberto na listagem
    const unsubMetrics = listenToAdMetrics(adId, (freshMetrics) => {
      if (UIRenderer.activeTooltip && UIRenderer.currentAdId === adId) {
        UIRenderer.updateVoteCounts(freshMetrics.likes, freshMetrics.dislikes);
      }
    });
    UIRenderer.addPanelUnsubscriber(unsubMetrics);
    
    const unsubSignals = listenToAdSignals(adId, (signalData) => {
      if (UIRenderer.activeTooltip && UIRenderer.currentAdId === adId) {
        UIRenderer.currentMetrics = {
          ...UIRenderer.currentMetrics,
          ...signalData,
          signals: signalData.signals,
          totalSignals: signalData.totalSignals
        };
        const content = document.getElementById('scm-panel-content');
        if (content && UIRenderer.activeTab === 'stats') {
          UIRenderer._renderStatsTab(content, UIRenderer.currentMetrics);
        }
      }
    });
    UIRenderer.addPanelUnsubscriber(unsubSignals);
  });
  
  const unsubscribe = listenToAdData(adId, (freshMetrics) => {
    UIRenderer.updateBadge(badge, _mergeLocalFraud(badge, freshMetrics));
  });

  badge._scmUnsubscribe = unsubscribe;
  badgeUnsubscribers.add(unsubscribe);
}

// ==========================================================
// HANDLERS DE EVENTOS
// ==========================================================
async function handlePanelEvent(type, data) {
  if (!currentAdId) return;
  
  if (type === 'vote') {
    await handleVote(currentAdId, data);
  } else if (type === 'signal') {
    await handleSignal(currentAdId, data.signalType, data.phase, data.isSub);
  }
}

async function handleVote(adId, voteType) {
  if (!adId) return;
  if (typeof scmIsAuthenticated === 'function' && !scmIsAuthenticated()) return;

  try {
    const currentVote = await getUserVote(adId);
    const isRemoval = currentVote && currentVote.voteType === voteType;

    if (isRemoval) {
      UIRenderer.updateVoteButtons(null);
      UIRenderer.currentUserEvents.vote = null;
    } else {
      UIRenderer.updateVoteButtons(voteType);
      UIRenderer.currentUserEvents.vote = voteType;
    }

    // ── REMOÇÃO DE VOTO (toggle-off) ──
    // Caminho dedicado: decrementa o contador e limpa o estado. Sem isto, o
    // voto antigo ficava na BD (contador preso em 1, sem cor após refresh).
    if (isRemoval) {
      await removeVote(adId, currentPlatform);
      try { await chrome.storage.local.remove(`vote_${adId}`); } catch (e) { /* noop */ }
      UIRenderer.showFeedback('Voto removido', 'success');
      return;
    }
    
    // Extrair metadados para o histórico
    let metadata = {};
    const badge = document.querySelector(`.as-badge-container[data-as-hash="${adId}"]`);
    const card = badge?.closest('[data-scm-v4]');
    
    if (card && card._scmMetadata) {
      metadata = { ...card._scmMetadata, url: card._scmMetadata.url || location.href };
    } else {
      // Página de detalhe — og:image é o mais fiável (todos os sites definem)
      const titleEl = document.querySelector('h1, .title, [data-cy="adPageAdTitle"]');
      const ogImage = document.querySelector('meta[property="og:image"]')?.content || '';
      const imgEl = !ogImage ? document.querySelector('img[class*="image"], img[src*="ad"], .photo img, [data-testid="ad-image"], main img') : null;
      const descEl = document.querySelector('[class*="description"], [data-cy*="description"], [class*="detail-info"], section p');
      const slugTitle = location.pathname.match(/\/items\/\d+-([^/?#]+)/)?.[1]?.replace(/-/g, ' ') || '';
      metadata = {
        title: _scmCleanTitle(titleEl?.textContent?.trim()) || document.title.split('|')[0].trim() || slugTitle || 'Anúncio',
        thumbnail: ogImage || imgEl?.src || imgEl?.dataset?.src || '',
        site: currentSiteConfig?.name || 'unknown',
        url: location.href,
        description: descEl?.textContent?.trim().slice(0, 140) || ''
      };
    }

    // Enriquecer metadata com sinais da página para treino de AI
    const _pm = _extractPageMeta();
    metadata = { ...metadata, ..._pm };

    // [TREINO] Em LISTAGENS, os campos de treino têm de vir do CARD votado,
    // não da página inteira (senão o _extractPageMeta page-level capturava o
    // anúncio errado). Garante que TODOS os votos, em todas as plataformas,
    // treinam com os dados do anúncio correto.
    if (card) {
      try {
        metadata.heuristicFlags = Heuristics.getSummary(card).map(f => f.type);
        metadata.heuristicScore = Number(Heuristics.calculateRiskScore(card).toFixed(2));
        const cardPriceTxt = card.querySelector('.price, [class*="price"], [class*="Price"], [data-testid*="price"]')?.textContent || '';
        const cardPrice = _scmParsePrice(cardPriceTxt);
        if (cardPrice && cardPrice > 0) metadata.price = cardPrice;
        const cardTitle = _scmCleanTitle((card._scmMetadata && card._scmMetadata.title) || '');
        const tnorm = cardTitle.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
          .replace(/[^a-z0-9 ]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 80);
        if (tnorm) { metadata.titleNorm = tnorm; metadata.fingerprint = _scmHash(tnorm); }
      } catch (e) { /* mantém os campos page-level */ }
    }

    // Router de voto (kill switch). Por defeito vai para o caminho LEGACY
    // (vote direto) — comportamento idêntico ao anterior — até config/system
    // ter useServerVotes:true e o uid cair no bucket de rollout. Ver vote-service.js.
    if (typeof VoteService !== 'undefined' && VoteService.submitAdVote) {
      await VoteService.submitAdVote({ adId, voteType, platform: currentPlatform, metadata });
    } else {
      await vote(adId, voteType, currentPlatform, metadata); // fallback se o router não carregou
    }

    // [FIX HISTÓRICO] Gravar em chrome.storage.local para o popup conseguir ler.
    // O popup corre noutro contexto (chrome-extension://) com UID Firebase Auth diferente
    // do dos content scripts, por isso não consegue consultar Firestore por userId.
    const _uid = auth?.currentUser?.uid || null;
    chrome.storage.local.set({
      [`vote_${adId}`]: {
        adId,
        voteType,
        uid: _uid, // usado pelo popup para filtrar apenas votos do utilizador atual
        title: metadata.title || 'Anúncio',
        thumbnail: metadata.thumbnail || '',
        site: metadata.site || currentPlatform || 'unknown',
        platform: currentPlatform || 'unknown',
        url: metadata.url || '',
        description: metadata.description || '',
        timestamp: Date.now()
      }
    }).catch(err => console.error('[NETTUNO] Erro ao gravar histórico:', err));

    UIRenderer.showFeedback('Voto registado!', 'success');
    
  } catch (err) {
    console.error('[NETTUNO] Erro ao votar:', err);
    UIRenderer.showFeedback('Erro ao votar. Tente novamente.', 'error');
    
    const userVote = await getUserVote(adId);
    UIRenderer.updateVoteButtons(userVote?.voteType);
    UIRenderer.currentUserEvents.vote = userVote?.voteType || null;
  }
}

// Extrai metadados da página atual para enriquecer os dados de treino AI
// Hash de string rápido e estável (FNV-1a 32-bit) → base36. Determinístico:
// o mesmo título normalizado produz sempre o mesmo fingerprint, em qualquer
// dispositivo, permitindo agrupar anúncios iguais server-side.
// Parser de preço robusto (EU + US). Devolve o valor INTEIRO em euros/dólares,
// sem cêntimos. Corrige o bug em que "1.099,00€" virava 109900 (×100):
//   "1.099,00" → 1099   "1,099.00" → 1099   "1.099" → 1099   "950" → 950
function _scmParsePrice(text) {
  if (!text) return null;
  const m = String(text).replace(/\s/g, '').match(/\d[\d.,]*\d|\d/);
  if (!m) return null;
  let s = m[0];
  s = s.replace(/[.,]\d{2}$/, ''); // remove cêntimos (",00" ou ".00")
  s = s.replace(/[.,]/g, '');       // remove separadores de milhar
  const n = parseInt(s, 10);
  return (isNaN(n) || n <= 0) ? null : n;
}

// Limpa lixo de UI dos títulos (ex: eBay "Novo anúncio...", "Abre em janela...")
function _scmCleanTitle(t) {
  if (!t) return '';
  return String(t)
    .replace(/^\s*(novo an[úu]ncio|new listing|patrocinado|sponsored|anúncio)\s*/i, '')
    .replace(/\s*(abre em (uma )?(nova )?janela.*|opens in (a )?new (window|tab).*|se abre en una nueva.*)$/i, '')
    .replace(/\s+/g, ' ')
    .trim();
}

// Re-aplica o "piso" da heurística local às métricas do servidor antes de
// pintar o escudo. Sem isto, o listener em tempo real (que só traz o estado
// da comunidade) revertia o escudo para WARNING ~1s depois — o vermelho/
// amarelo da análise local "piscava" e desaparecia. badgeEl._scmLocalFraud
// guarda o fraudScore local calculado na injeção.
function _mergeLocalFraud(badgeEl, metrics) {
  const lf = (badgeEl && Number(badgeEl._scmLocalFraud)) || 0;
  const comm = Number(metrics.fraudScore) || 0;
  // Se a análise LOCAL (heurística) é a fonte do risco (supera a comunidade),
  // o escudo fica ALERT (laranja): "a app detetou sinais, sem votos ainda".
  // Distingue-se do RISK (vermelho) que vem dos votos/sinais da comunidade.
  if (lf > comm) {
    metrics.fraudScore = lf;
    metrics.badgeState = (typeof BADGE_STATES !== 'undefined') ? BADGE_STATES.ALERT : 'ALERT';
  }
  return metrics;
}

function _scmHash(str) {
  let h = 0x811c9dc5;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = (h + ((h << 1) + (h << 4) + (h << 7) + (h << 8) + (h << 24))) >>> 0;
  }
  return 'fp_' + h.toString(36);
}

function _extractPageMeta() {
  const meta = {};

  // Hostname (ex: "olx.pt", "idealista.es")
  const host = window.location.hostname;
  meta.hostname = host;

  // País a partir do domínio (tabela em signals-data.js → COUNTRY_BY_DOMAIN)
  meta.country = getCountryFromHost(host);

  // Categoria do anúncio (URL + texto da página)
  const urlText = window.location.href.toLowerCase();
  const bodyText = document.title.toLowerCase();
  if      (/imovel|inmueble|immobi|casa|apart|flat|moradia|vivenda|property|rent|arrendar/i.test(urlText + bodyText)) meta.category = 'imoveis';
  else if (/carro|car|auto|veicul|moto|caminhao|truck|van/i.test(urlText + bodyText))                                  meta.category = 'carros';
  else if (/emprego|job|trabalho|vaga|recrutamento|career/i.test(urlText + bodyText))                                   meta.category = 'emprego';
  else if (/telemovel|phone|iphone|android|tablet|laptop|computador|electronico/i.test(urlText + bodyText))             meta.category = 'eletronicos';
  else if (/roupa|vestuario|clothing|sapato|shoe|moda|fashion/i.test(urlText + bodyText))                               meta.category = 'moda';
  else                                                                                                                   meta.category = 'outros';

  // Contagem de fotos na galeria
  const galleryImgs = document.querySelectorAll(
    '[class*="gallery"] img, [class*="photo"] img, [class*="carousel"] img, ' +
    '[class*="slider"] img, [data-testid*="photo"] img, .slick-slide img'
  );
  meta.photoCount = galleryImgs.length;

  // Faixa de preço — tenta extrair o preço visível na página
  try {
    const priceEl = document.querySelector(
      '[class*="price"]:not([class*="old"]):not([class*="origin"]), ' +
      '[data-testid*="price"], [itemprop="price"], .price, #price'
    );
    if (priceEl) {
      const price = _scmParsePrice(priceEl.textContent);
      if (price && price > 0) {
        meta.price = price; // preço exato → treino de baseline por produto/categoria
        if      (price < 500)    meta.priceRange = '0-500';
        else if (price < 2000)   meta.priceRange = '500-2k';
        else if (price < 10000)  meta.priceRange = '2k-10k';
        else if (price < 50000)  meta.priceRange = '10k-50k';
        else if (price < 200000) meta.priceRange = '50k-200k';
        else                     meta.priceRange = '200k+';
      }
    }
  } catch (e) { /* noop */ }

  // ── Fingerprint do título (comparação cross-anúncio — backend futuro) ──
  // Normaliza título e gera hash; permite agrupar o MESMO artigo em vendedores
  // ou plataformas diferentes (sinal forte de burla). Capturado já, usado depois.
  try {
    const titleRaw = (document.querySelector('h1, [data-cy="adPageAdTitle"], .title')?.textContent
      || document.querySelector('meta[property="og:title"]')?.content
      || document.title || '').trim();
    meta.titleNorm = titleRaw.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
      .replace(/[^a-z0-9 ]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 80);
    if (meta.titleNorm) meta.fingerprint = _scmHash(meta.titleNorm);
  } catch (e) { /* noop */ }

  // ── Sinais heurísticos presentes (LABELS de treino) ──
  // Guardamos QUE sinais a heurística viu no momento do voto. Cruzado com o
  // verdicto da comunidade (like/dislike) → dataset para reponderar pesos e
  // aprender baselines (ex: que preço é irreal para este produto, que fotos
  // foram marcadas como AI, etc.). Treino offline no backend, no futuro.
  try {
    if (typeof Heuristics !== 'undefined') {
      const cont = document.querySelector('[data-cy="ad_description"], main, article') || document.body;
      Heuristics.analyzeElement(cont);
      meta.heuristicFlags = Heuristics.getSummary(cont).map(f => f.type);
      meta.heuristicScore = Number(Heuristics.calculateRiskScore(cont).toFixed(2));
    }
  } catch (e) { /* noop */ }

  // Nome do vendedor (best effort — nunca falha)
  try {
    const sellerEl = document.querySelector(
      '[data-cy="user-name"], [class*="seller-name"], [class*="UserName"], ' +
      '[class*="seller"] h2, [class*="advertiser"] span, [itemprop="name"]'
    );
    meta.sellerName = sellerEl ? sellerEl.textContent.trim().slice(0, 60) : '';
  } catch (e) { meta.sellerName = ''; }

  return meta;
}

async function handleSignal(adId, signalType, phase, isSub = false) {
  if (!adId) return;
  if (typeof scmIsAuthenticated === 'function' && !scmIsAuthenticated()) return;

  const meta = _extractPageMeta();

  try {
    const userEvents = await getUserEvents(adId);
    const isRemoval = userEvents[signalType] === true;

    // Verificar contradições
    if (!isRemoval) {
      const contradictions = getContradictions(signalType);
      for (const oppSignal of contradictions) {
        if (userEvents[oppSignal]) {
          await recordSignal(adId, oppSignal, phase, currentPlatform, true, {});
          const oppCard = document.querySelector(`[data-signal="${oppSignal}"]`);
          if (oppCard) oppCard.classList.remove('active');
        }
      }
    }

    // Enviar para Firebase com metadados da página
    await recordSignal(adId, signalType, phase, currentPlatform, isRemoval, meta);

  } catch (err) {
    console.error('[NETTUNO] Erro ao registar sinal:', err);
    UIRenderer.showFeedback('Erro ao registar sinal.', 'error');
    const card = document.querySelector(`[data-signal="${signalType}"]`);
    if (card && !isSub) card.classList.toggle('active');
  }
}

// ==========================================================
// LISTENERS EM TEMPO REAL
// ==========================================================
function startRealtimeListeners(adId, badgeElement) {
  unsubscribeMetrics = listenToAdData(adId, (metrics) => {
    if (badgeElement) {
      UIRenderer.updateBadge(badgeElement, _mergeLocalFraud(badgeElement, metrics));
    }

    if (UIRenderer.activeTooltip && UIRenderer.currentAdId === adId) {
      UIRenderer.updateVoteCounts(metrics.likes, metrics.dislikes);
    }
  });
  
  unsubscribeSignals = listenToAdSignals(adId, (signalData) => {
    // Update UIRenderer's current metrics with the new signals
    UIRenderer.currentMetrics = {
      ...UIRenderer.currentMetrics,
      ...signalData,
      signals: signalData.signals,
      totalSignals: signalData.totalSignals
    };

    if (UIRenderer.activeTooltip && UIRenderer.currentAdId === adId) {
      const content = document.getElementById('scm-panel-content');
      
      if (content && UIRenderer.activeTab === 'stats') {
        // Só re-renderizar a aba stats automaticamente (dados da comunidade)
        // NÃO re-renderizar contact/interaction/result para não destruir o estado visual dos botões do utilizador
        UIRenderer._renderStatsTab(content, UIRenderer.currentMetrics);
      }
    }
  });
}

// Fechar painel ao clicar fora
document.addEventListener('click', (e) => {
  if (UIRenderer.activeTooltip && !UIRenderer.activeTooltip.contains(e.target) && !e.target.closest('.as-badge-container')) {
    UIRenderer.closePanel();
  }
});

// ==========================================================
// CSS GLOBAL INJETADO
// ==========================================================
const scmStyles = document.createElement('style');
scmStyles.textContent = `
  /* Badge Container */
  .as-badge-container {
    display: inline-flex !important;
    align-items: center !important;
    gap: 4px !important;
    cursor: pointer !important;
    z-index: 99999 !important;
  }
  
  /* Badge/Escudo — RISK/WARNING/SAFE: design simples sem borda preta nem shadow
     pesados. TRUSTED (estrela) mantem tratamento decorativo (override em baixo). */
  .as-badge {
    position: relative !important;
    width: 42px !important;
    height: 42px !important;
    display: flex !important;
    align-items: center !important;
    justify-content: center !important;
    background-color: #FACC15 !important;
    border: 2px solid #000 !important;   /* linha fina preta à volta do quadrado */
    box-shadow: none !important;
    transition: transform 0.1s !important;
    flex-shrink: 0 !important;
    font-size: 14px !important;
    border-radius: 6px !important;
  }

  /* SVG dentro do escudo (32px num container de 42px = ~76%, mesma presenca
     visual que a estrela 28px no mesmo container + overflow:visible). */
  .as-badge svg {
    width: 32px !important;
    height: 32px !important;
    display: block !important;
  }

  .as-badge:hover {
    transform: translate(0, -1px) !important;
  }

  .as-badge-safe {
    background-color: #22C55E !important;
    color: #FFFFFF !important;
  }

  .as-badge-warning {
    background-color: #FACC15 !important;
    color: #FFFFFF !important;
  }

  .as-badge-alert {
    background-color: #F97316 !important;
    color: #FFFFFF !important;
  }

  .as-badge-danger {
    background-color: #EF4444 !important;
    color: #FFFFFF !important;
  }

  /* Trusted badge (estrela) — mantem tratamento decorativo com border + shadow
     azul para se destacar dos restantes 3 estados. */
  .as-badge-trusted {
    width: 42px !important;
    height: 42px !important;
    border: 2px solid #3B82F6 !important;
    box-shadow: 2px 2px 0px #2563EB !important;
    background-color: #22C55E !important;
    border-radius: 0 !important;
  }

  .as-badge-trusted svg {
    width: 28px !important;
    height: 28px !important;
    overflow: visible !important;
  }

  .as-badge-trusted:hover {
    border: 2px solid #3B82F6 !important;
    box-shadow: 1px 1px 0px #2563EB !important;
    transform: translate(1px, 1px) !important;
  }

  .as-badge-trusted svg,
  .as-badge-trusted path {
    fill: #FFFFFF !important;
  }
  
  /* Badge counter */
  .as-badge-counter {
    font-size: 10px !important;
    font-weight: 900 !important;
    color: #000 !important;
    background: #fff !important;
    border: 2px solid #000 !important;
    padding: 1px 4px !important;
    box-shadow: 2px 2px 0 #000 !important;
  }
  
  /* Tooltip/Painel */
  .as-v3-tooltip {
    position: absolute !important;
    z-index: 2147483647 !important;
    pointer-events: auto !important;
    font-family: 'Inter', system-ui, -apple-system, sans-serif !important;
  }
  
  .as-v3-modal {
    width: 380px !important;
    background: #0F172A !important;
    border: 4px solid #000 !important;
    box-shadow: 8px 8px 0px #000 !important;
    display: flex !important;
    flex-direction: column !important;
    overflow: hidden !important;
    animation: as-pop 0.15s cubic-bezier(0.175, 0.885, 0.32, 1.275) !important;
    position: relative !important;
    color: #E2E8F0 !important;
  }

  @keyframes as-pop {
    from { opacity: 0; transform: scale(0.95) translateY(10px); }
    to { opacity: 1; transform: scale(1) translateY(0); }
  }

  /* Badge tag (RISCO/ATENÇÃO/SEGURO/CONFIÁVEL) — retângulo a sair pelo topo direito */
  .as-v3-badge-tag {
    position: absolute !important;
    top: -14px !important;
    right: 14px !important;
    padding: 6px 14px !important;
    font-weight: 900 !important;
    font-size: 11px !important;
    color: #FFFFFF !important;
    border: 3px solid #000 !important;
    box-shadow: 3px 3px 0 #000 !important;
    z-index: 30 !important;
    text-transform: uppercase !important;
    letter-spacing: 0.8px !important;
    border-radius: 0 !important;
    line-height: 1 !important;
    white-space: nowrap !important;
    transform: none !important;
  }

  /* Header — força isolamento do CSS da página host.
     padding-left/right altos (108px / 16px) reservam espaço para os 2 botões
     absolutos da esquerda (theme + profile) sem o título do anúncio sobrepor. */
  .as-v3-header {
    background: #1E293B !important;
    color: #E2E8F0 !important;
    padding: 12px 16px 12px 108px !important;
    text-align: left !important;
    border-bottom: 3px solid #000 !important;
    position: relative !important;
    font-family: 'Inter', system-ui, -apple-system, BlinkMacSystemFont, sans-serif !important;
    line-height: 1.2 !important;
    margin: 0 !important;
    box-sizing: border-box !important;
    text-shadow: none !important;
    text-indent: 0 !important;
  }
  .as-v3-header * {
    font-family: inherit !important;
    box-sizing: border-box !important;
    text-shadow: none !important;
  }

  /* Theme toggle pill (dark/light) */
  .as-theme-toggle {
    position: absolute !important;
    top: 12px !important;
    left: 12px !important;
    width: 46px !important;
    height: 22px !important;
    background: #0F172A !important;
    border: 2px solid #000 !important;
    border-radius: 12px !important;
    cursor: pointer !important;
    padding: 0 !important;
    box-shadow: 2px 2px 0 #000 !important;
    z-index: 20 !important;
  }
  .as-theme-toggle:hover { transform: translate(-1px, -1px) !important; box-shadow: 3px 3px 0 #000 !important; }
  .as-theme-toggle-thumb {
    position: absolute !important;
    top: 1px !important;
    left: 1px !important;
    width: 16px !important;
    height: 16px !important;
    background: #FACC15 !important;
    border-radius: 50% !important;
    transition: transform 0.2s, background 0.2s !important;
    display: flex !important;
    align-items: center !important;
    justify-content: center !important;
    font-size: 10px !important;
    color: #000 !important;
    pointer-events: none !important;
  }
  .as-light .as-theme-toggle { background: #E2E8F0 !important; }
  .as-light .as-theme-toggle-thumb {
    transform: translateX(22px) !important;
    background: #1E293B !important;
    color: #FACC15 !important;
  }

  /* Profile button (top-left of header, next to theme toggle) */
  .as-profile-toggle {
    position: absolute !important;
    top: 9px !important;
    left: 66px !important;
    width: 28px !important;
    height: 28px !important;
    background: #0F172A !important;
    border: 2px solid #000 !important;
    border-radius: 50% !important;
    cursor: pointer !important;
    padding: 0 !important;
    box-shadow: 2px 2px 0 #000 !important;
    z-index: 20 !important;
    display: flex !important;
    align-items: center !important;
    justify-content: center !important;
    font-size: 14px !important;
    color: #FACC15 !important;
    line-height: 1 !important;
  }
  .as-profile-toggle:hover { transform: translate(-1px, -1px) !important; box-shadow: 3px 3px 0 #000 !important; background: #1E293B !important; }
  .as-profile-toggle.active { background: #FACC15 !important; color: #0F172A !important; }

  /* Light overrides do botão de perfil (avatar no header) */
  .as-light .as-profile-toggle { background: #E2E8F0 !important; color: #2563EB !important; }
  .as-light .as-profile-toggle:hover { background: #FFFFFF !important; }
  .as-light .as-profile-toggle.active { background: #FACC15 !important; color: #000 !important; }


  .as-v3-header h1 {
    font-size: 14px !important;
    font-weight: 900 !important;
    margin: 0 !important;
    text-transform: uppercase !important;
    letter-spacing: 1px !important;
  }
  
  .as-v3-title {
    font-size: 16px !important;
    margin: 4px 0 0 0 !important;
    overflow: hidden !important;
    white-space: nowrap !important;
  }
  
  /* Status Bar */
  .as-brutal-status-secondary {
    background-color: #131C2E !important;
    color: #94A3B8 !important;
    border-bottom: 2px solid #000 !important;
    padding: 6px 0 !important;
    font-weight: 700 !important;
    font-size: 11px !important;
    text-transform: uppercase !important;
    overflow: hidden !important;
    position: relative !important;
    height: 36px !important;
    display: flex !important;
    align-items: center !important;
  }

  .as-ticker-container {
    display: flex !important;
    white-space: nowrap !important;
    width: 100% !important;
    justify-content: center !important;
  }

  .as-ticker-item {
    display: flex !important;
    gap: 10px !important;
    align-items: center !important;
  }

  /* Stack de avatares dos participantes (estilo Instagram/X) */
  .as-voters-block { display: inline-flex !important; align-items: center !important; gap: 6px !important; }
  .as-voters-stack { display: inline-flex !important; align-items: center !important; }
  .as-voter {
    width: 22px !important; height: 22px !important;
    border-radius: 50% !important;
    border: 2px solid #131C2E !important;
    object-fit: cover !important;
    background: #1E293B !important;
    display: inline-flex !important;
    align-items: center !important;
    justify-content: center !important;
    font-size: 9px !important; font-weight: 900 !important;
    color: #FACC15 !important;
    text-transform: uppercase !important;
    flex-shrink: 0 !important;
  }
  .as-voters-stack > .as-voter:not(:first-child) { margin-left: -8px !important; }
  .as-voter[data-vote="like"]    { border-color: #22C55E !important; }
  .as-voter[data-vote="dislike"] { border-color: #EF4444 !important; }
  .as-voter-empty { background: transparent !important; border-color: transparent !important; font-size: 14px !important; color: #475569 !important; }
  .as-light .as-voter { border-color: #FFFFFF !important; background: #E2E8F0 !important; color: #2563EB !important; }
  
  /* Vote Bar */
  .as-brutal-vote-bar {
    display: flex !important;
    flex-direction: column !important;
    align-items: stretch !important;
    padding: 12px 16px 0 !important;
    border-bottom: 3px solid #000 !important;
    background-color: #0F172A !important;
  }
  .as-brutal-vote-bar > .as-brutal-pill {
    align-self: center !important;
    margin-bottom: 0 !important;
  }
  .as-share-row{display:flex !important;align-items:center !important;gap:6px !important;padding:6px 12px 4px !important;border-top:1px solid #1E293B !important;}
  .as-share-label{font-size:8px !important;font-weight:900 !important;letter-spacing:1px !important;color:#475569 !important;text-transform:uppercase !important;flex:1 !important;}
  .as-share-btn{display:inline-flex !important;align-items:center !important;justify-content:center !important;width:26px !important;height:26px !important;background:#1E293B !important;color:#64748B !important;border:1px solid #334155 !important;border-radius:4px !important;cursor:pointer !important;text-decoration:none !important;font-size:11px !important;font-weight:900 !important;transition:all 0.1s !important;padding:0 !important;}
  .as-share-btn:hover{background:#22D3EE !important;color:#000 !important;border-color:#22D3EE !important;}
  body.as-light .as-share-row{border-top-color:#E2E8F0 !important;}
  body.as-light .as-share-btn{background:#F1F5F9 !important;color:#64748B !important;border-color:#CBD5E1 !important;}
  body.as-light .as-share-btn:hover{background:#2563EB !important;color:#fff !important;border-color:#2563EB !important;}

  .as-brutal-pill {
    background-color: #131C2E !important;
    border: 3px solid #000000 !important;
    box-shadow: 4px 4px 0px #000000 !important;
    padding: 0 !important;
    border-radius: 30px !important;
    font-weight: 900 !important;
    display: flex !important;
    font-size: 15px !important;
    overflow: hidden !important;
  }
  
  .as-like-btn, .as-dislike-btn {
    padding: 6px 20px !important;
    cursor: pointer !important;
    transition: all 0.1s !important;
    display: flex !important;
    align-items: center !important;
    gap: 6px !important;
    user-select: none !important;
  }
  
  .as-like-btn {
    background-color: #131C2E !important;
    border-right: 2px solid #000 !important;
    color: #E2E8F0 !important;
  }

  .as-dislike-btn {
    background-color: #131C2E !important;
    color: #E2E8F0 !important;
  }

  .as-like-btn:hover {
    background-color: rgba(74,222,128,0.15) !important;
    color: #4ADE80 !important;
  }

  .as-dislike-btn:hover {
    background-color: rgba(248,113,113,0.15) !important;
    color: #F87171 !important;
  }
  
  .as-like-btn.active {
    background-color: #047857 !important;
    color: #FFFFFF !important;
    font-weight: 900 !important;
  }
  .as-like-btn.active::before { content: '✓ ' !important; }

  .as-dislike-btn.active {
    background-color: #B91C1C !important;
    color: #FFFFFF !important;
    font-weight: 900 !important;
  }
  .as-dislike-btn.active::before { content: '✓ ' !important; }
  
  /* Tabs */
  .as-v3-tab-row {
    display: flex !important;
    border-bottom: 3px solid #000 !important;
    background: #131C2E !important;
  }

  .as-v3-tab {
    flex: 1 !important;
    padding: 10px 4px !important;
    font-size: 10px !important;
    font-weight: 900 !important;
    border: none !important;
    border-right: 2px solid #000 !important;
    background: transparent !important;
    cursor: pointer !important;
    text-transform: uppercase !important;
    transition: all 0.1s !important;
    color: #94A3B8 !important;
  }

  .as-v3-tab:last-child {
    border-right: none !important;
  }

  .as-v3-tab.active {
    background: #22D3EE !important;
    color: #0F172A !important;
  }

  .as-v3-tab:hover:not(.active) {
    background: #1E293B !important;
    color: #E2E8F0 !important;
  }

  /* Content — altura fixa para 4 linhas de cards (4×60 + 3×10 gap + 32 padding = 302px).
     Painel não muda de tamanho entre tabs; conteúdo extra faz scroll interno. */
  .as-v3-content {
    padding: 16px !important;
    height: 302px !important;
    max-height: 302px !important;
    min-height: 302px !important;
    overflow-y: auto !important;
    background: #0F172A !important;
    color: #E2E8F0 !important;
    box-sizing: border-box !important;
  }
  
  /* Grid */
  .as-v3-grid {
    display: grid !important;
    grid-template-columns: 1fr 1fr !important;
    gap: 10px !important;
  }
  
  /* Cards — altura fixa para layout consistente entre tabs */
  .as-v3-card {
    padding: 8px 6px !important;
    border: 3px solid #000 !important;
    box-shadow: 4px 4px 0px #000 !important;
    font-size: 11px !important;
    font-weight: 800 !important;
    cursor: pointer !important;
    transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1) !important;
    display: flex !important;
    flex-direction: column !important;
    align-items: center !important;
    justify-content: center !important;
    gap: 4px !important;
    overflow: hidden !important;
    position: relative !important;
    height: 60px !important;
    min-height: 60px !important;
    max-height: 60px !important;
    background: #131C2E !important;
    color: #E2E8F0 !important;
    user-select: none !important;
    box-sizing: border-box !important;
  }

  .as-v3-card.active {
    transform: translate(2px, 2px) !important;
    box-shadow: none !important;
  }

  /* Signal cards — dark bg + colored border (SCM Design System v2) */
  .as-card-positive {
    background: #161D2E !important;
    color: #86EFAC !important;
    border: 2px solid #22C55E !important;
    box-shadow: 3px 3px 0 #000 !important;
  }

  .as-card-warning {
    background: #161D2E !important;
    color: #FDE68A !important;
    border: 2px solid #FACC15 !important;
    box-shadow: 3px 3px 0 #000 !important;
  }

  .as-card-negative {
    background: #161D2E !important;
    color: #FCA5A5 !important;
    border: 2px solid #EF4444 !important;
    box-shadow: 3px 3px 0 #000 !important;
  }

  .as-card-positive:hover {
    background: #14532D !important;
    color: #FFFFFF !important;
    transform: translate(-2px, -2px) !important;
    box-shadow: 5px 5px 0 #000 !important;
  }

  .as-card-warning:hover {
    background: #92400E !important;
    color: #FDE68A !important;
    transform: translate(-2px, -2px) !important;
    box-shadow: 5px 5px 0 #000 !important;
  }

  .as-card-negative:hover {
    background: #7F1D1D !important;
    color: #FFFFFF !important;
    transform: translate(-2px, -2px) !important;
    box-shadow: 5px 5px 0 #000 !important;
  }

  .as-v3-card.active.as-card-positive {
    background: #14532D !important;
    color: #FFFFFF !important;
    border-color: #4ADE80 !important;
    transform: translate(1px, 1px) !important;
    box-shadow: 2px 2px 0 #000 !important;
  }

  .as-v3-card.active.as-card-warning {
    background: #92400E !important;
    color: #FDE68A !important;
    border-color: #FACC15 !important;
    transform: translate(1px, 1px) !important;
    box-shadow: 2px 2px 0 #000 !important;
  }

  .as-v3-card.active.as-card-negative {
    background: #7F1D1D !important;
    color: #FFFFFF !important;
    border-color: #F87171 !important;
    transform: translate(1px, 1px) !important;
    box-shadow: 2px 2px 0 #000 !important;
  }
  
  /* Card expansion for sub-buttons */
  .as-v3-card.expanded {
    grid-column: span 2 !important;
    background: #1E293B !important;
    border: 3px solid #22D3EE !important;
    box-shadow: 4px 4px 0 #000 !important;
    animation: none !important;
    transform: none !important;
    z-index: 10 !important;
  }
  
  @keyframes as-card-pulse {
    0% { box-shadow: 0 0 0 0 rgba(250, 204, 21, 0.7); }
    70% { box-shadow: 0 0 0 10px rgba(250, 204, 21, 0); }
    100% { box-shadow: 0 0 0 0 rgba(250, 204, 21, 0); }
  }
  
  .as-card-main-side {
    display: flex !important;
    align-items: center !important;
    gap: 6px !important;
    width: 100% !important;
    justify-content: center !important;
    white-space: normal !important;
    overflow: visible !important;
    transition: all 0.2s ease !important;
  }
  
  .as-v3-card.expanded .as-card-main-side {
    opacity: 0 !important;
    transform: translateY(-20px) !important;
  }
  
  .as-card-sub-side {
    position: absolute !important;
    top: 0 !important;
    left: 0 !important;
    width: 100% !important;
    height: 100% !important;
    display: flex !important;
    align-items: center !important;
    justify-content: center !important;
    opacity: 0 !important;
    transform: translateY(20px) !important;
    transition: all 0.2s ease !important;
    pointer-events: none !important;
  }
  
  .as-v3-card.expanded .as-card-sub-side {
    opacity: 1 !important;
    transform: translateY(0) !important;
    pointer-events: auto !important;
  }
  
  .as-mini-grid {
    display: flex !important;
    gap: 4px !important;
    padding: 4px !important;
    width: 100% !important;
    height: 100% !important;
    align-items: center !important;
    justify-content: center !important;
  }
  
  .as-mini-btn {
    padding: 3px 4px !important;
    font-size: 8px !important;
    font-weight: 900 !important;
    color: #fff !important;
    border: 1px solid #fff !important;
    cursor: pointer !important;
    text-transform: uppercase !important;
    border-radius: 2px !important;
    flex: 1 !important;
    text-align: center !important;
    overflow: hidden !important;
    display: flex !important;
    align-items: center !important;
    justify-content: center !important;
    transition: all 0.1s !important;
  }
  
  .as-mini-btn.active {
    box-shadow: inset 3px 3px 0px rgba(0,0,0,0.4) !important;
    filter: brightness(0.7) !important;
    border: 2px solid #000 !important;
  }
  
  .as-mini-marquee-wrapper {
    display: flex !important;
    align-items: center !important;
    justify-content: center !important;
    overflow: hidden !important;
    width: 100% !important;
  }
  
  .as-mini-btn:hover {
    transform: scale(1.1) !important;
    filter: brightness(1.2) !important;
  }
  
  .as-v3-card.expanded .as-mini-btn {
    padding: 6px 8px !important;
    font-size: 10px !important;
    border-width: 2px !important;
  }
  
  /* Card content */
  .as-card-icon {
    font-size: 14px !important;
    flex-shrink: 0 !important;
  }
  
  .as-card-marquee {
    overflow: visible !important;
    white-space: normal !important;
    flex: 1 !important;
  }
  
  .as-card-marquee-inner {
    display: inline-block !important;
  }
  
  .has-overflow .as-card-marquee-inner,
  .has-overflow .as-mini-marquee {
    display: inline-block !important;
    white-space: normal !important;
    text-align: center !important;
  }
  
  @keyframes as-marquee {
    0% { transform: none; }
    100% { transform: none; }
  }
  
  @keyframes as-shake {
    0%, 100% { transform: translateX(0); }
    20%, 60% { transform: translateX(-5px); }
    40%, 80% { transform: translateX(5px); }
  }
  
  .as-card-pct {
    position: absolute !important;
    bottom: 4px !important;
    right: 6px !important;
    font-size: 10px !important;
    opacity: 0.8 !important;
    font-weight: 900 !important;
  }
  
  /* Footer */
  .as-v3-footer {
    padding: 16px !important;
    border-top: 3px solid #000 !important;
    font-size: 10px !important;
    font-weight: 700 !important;
    display: flex !important;
    flex-direction: column !important;
    gap: 12px !important;
    background-color: #1E293B !important;
    min-height: 120px !important;
  }

  .as-v3-ads {
    width: 100% !important;
    height: 60px !important;
    background: #131C2E !important;
    border: 2px dashed #334155 !important;
    display: flex !important;
    align-items: center !important;
    justify-content: center !important;
    font-size: 9px !important;
    color: #64748b !important;
    text-transform: uppercase !important;
    letter-spacing: 0.5px !important;
    font-weight: 900 !important;
    border-radius: 0 !important;
    position: relative !important;
  }
  
  .as-feedback-area {
    min-height: 12px !important;
    text-align: center !important;
    font-size: 12px !important;
    font-weight: 600 !important;
  }
  
  /* Scrollbar styling */
  .as-v3-content::-webkit-scrollbar {
    width: 10px !important;
  }

  .as-v3-content::-webkit-scrollbar-track {
    background: #131C2E !important;
  }

  .as-v3-content::-webkit-scrollbar-thumb {
    background: #000 !important;
    border: 2px solid #1E293B !important;
    border-radius: 0 !important;
  }

  /* ============================================================
     LIGHT THEME OVERRIDES — aplicado quando .as-light está no modal
     ============================================================ */
  .as-light.as-v3-modal { background: #FFFFFF !important; color: #111827 !important; }
  .as-light .as-v3-header { background: #2563EB !important; color: #FFFFFF !important; }
  .as-light .as-v3-header h1 { color: #FFFFFF !important; }
  .as-light .as-brutal-status-secondary { background: #000000 !important; color: #FFFFFF !important; }
  .as-light .as-brutal-vote-bar { background: #FFFFFF !important; }
  .as-light .as-share-row{border-top-color:#E2E8F0 !important;}
  .as-light .as-share-btn{background:#F1F5F9 !important;color:#64748B !important;border-color:#CBD5E1 !important;}
  .as-light .as-share-btn:hover{background:#2563EB !important;color:#fff !important;border-color:#2563EB !important;}
  .as-light .as-brutal-pill { background: #FFFFFF !important; }
  .as-light .as-like-btn { background: #FFFFFF !important; color: #000 !important; border-right-color: #000 !important; }
  .as-light .as-dislike-btn { background: #FFFFFF !important; color: #000 !important; }
  .as-light .as-like-btn:hover { background: #DCFCE7 !important; color: #047857 !important; }
  .as-light .as-dislike-btn:hover { background: #FEE2E2 !important; color: #B91C1C !important; }
  .as-light .as-like-btn.active { background: #047857 !important; color: #FFFFFF !important; }
  .as-light .as-dislike-btn.active { background: #B91C1C !important; color: #FFFFFF !important; }
  .as-light .as-v3-tab-row { background: #eee !important; }
  .as-light .as-v3-tab { color: #000 !important; }
  .as-light .as-v3-tab.active { background: #2563EB !important; color: #FFFFFF !important; }
  .as-light .as-v3-tab:hover:not(.active) { background: #ddd !important; color: #000 !important; }
  .as-light .as-v3-content { background: #FFFFFF !important; color: #111827 !important; }
  .as-light .as-v3-content::-webkit-scrollbar-track { background: #f1f1f1 !important; }
  .as-light .as-v3-content::-webkit-scrollbar-thumb { background: #000 !important; border: 0 !important; }
  .as-light .as-v3-card { background: #F1F5F9 !important; color: #111827 !important; }
  .as-light .as-v3-card:hover { border-color: #000 !important; }
  .as-light .as-card-positive { background: #F0FDF4 !important; color: #15803D !important; border-color: #22C55E !important; }
  .as-light .as-card-warning  { background: #FEFCE8 !important; color: #A16207 !important; border-color: #FACC15 !important; }
  .as-light .as-card-negative { background: #FEF2F2 !important; color: #B91C1C !important; border-color: #EF4444 !important; }
  .as-light .as-card-positive:hover { background: #DCFCE7 !important; color: #15803D !important; }
  .as-light .as-card-warning:hover  { background: #FEF9C3 !important; color: #A16207 !important; }
  .as-light .as-card-negative:hover { background: #FEE2E2 !important; color: #B91C1C !important; }
  .as-light .as-v3-card.active.as-card-positive { background: #15803D !important; color: #FFFFFF !important; }
  .as-light .as-v3-card.active.as-card-warning  { background: #A16207 !important; color: #FFFFFF !important; }
  .as-light .as-v3-card.active.as-card-negative { background: #991B1B !important; color: #FFFFFF !important; }
  .as-light .as-v3-card.expanded { background: #000 !important; border-color: #FACC15 !important; }
  .as-light .as-v3-footer { background: #FFFFFF !important; }
  .as-light .as-v3-ads { background: #f3f4f6 !important; border-color: #94a3b8 !important; color: #64748b !important; }
`;

document.head.appendChild(scmStyles);

