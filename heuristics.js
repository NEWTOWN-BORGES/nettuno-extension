/**
 * NETTUNO v4.4 - Heuristics Module (motor anti-burla local)
 * ---------------------------------------------------------------------------
 * Deteção de padrões de burla SEM precisar de votos da comunidade (resolve o
 * arranque a frio). Funciona em qualquer marketplace via seletores genéricos.
 *
 * Baseado em sinais públicos documentados por:
 *  - PSP / GNR (PT): esquema MB Way, "transportadora recolhe", urgência
 *  - Action Fraud (UK), Avira, fraud.net: pagamento fora da plataforma,
 *    contacto off-platform, conta sem avaliações, preço bom demais
 *  - Investigação académica (arXiv 1805.00464): preço/descrição/fotos/reviews
 *
 * API pública (NÃO alterar — usada por content.js):
 *   Heuristics.runAll(items)
 *   Heuristics.getSummary(item)        -> [{type,label,severity}]
 *   Heuristics.calculateRiskScore(item)-> 0..1
 *   Heuristics.analyzeElement(el)       -> corre detetores num único container
 *                                          (páginas de detalhe / Amazon / eBay)
 * ---------------------------------------------------------------------------
 */

const Heuristics = {
  _processed: new WeakSet(),

  // ── Pesos por severidade (para calculateRiskScore) ──
  _WEIGHTS: { critical: 0.55, high: 0.33, medium: 0.16, low: 0.07 },

  // ── Conhecimento aprendido com votos reais (config/learned) ──
  // Preenchido por applyLearned(). Null = usa só os pesos por severidade.
  _learned: null,

  /**
   * Aplica a calibração aprendida no backend (config/learned).
   * @param {{weights?:Object, baselines?:Object, baseRate?:number}} cfg
   */
  applyLearned(cfg) {
    if (!cfg || typeof cfg !== 'object') return;
    this._learned = {
      weights: (cfg.weights && typeof cfg.weights === 'object') ? cfg.weights : {},
      baselines: (cfg.baselines && typeof cfg.baselines === 'object') ? cfg.baselines : {},
      baseRate: typeof cfg.baseRate === 'number' ? cfg.baseRate : 0.5
    };
  },

  /** Baseline de preço aprendido para um fingerprint (ou null). */
  baselineFor(fingerprint) {
    const b = this._learned && this._learned.baselines;
    return (b && b[fingerprint]) ? b[fingerprint] : null;
  },

  // ── Bancos de palavras-chave (PT + EN). Tudo em minúsculas. ──
  KW: {
    // Pagamento fora da plataforma / esquemas de pagamento
    payment: [
      'mb way', 'mbway', 'mb-way', 'ativar mbway', 'ativação mbway', 'ativar mb way',
      'transferência', 'transferencia', 'transfere', 'iban', 'nib',
      'paypal amigos', 'paypal família', 'paypal friends', 'friends and family',
      'gift card', 'cartão presente', 'cartao presente', 'steam card', 'steam gift',
      'google play card', 'itunes card', 'paysafecard', 'paysafe',
      'western union', 'moneygram', 'money gram',
      'bitcoin', 'btc', 'usdt', 'cripto', 'crypto', 'binance', 'revolut',
      'pagamento antecipado', 'paga primeiro', 'pague primeiro', 'pay first',
      'advance payment', 'pagar adiantado', 'sinal de', 'caução', 'caucao',
      'fora do olx', 'fora da plataforma', 'fora do vinted', 'off platform'
    ],
    // Esquema de envio / transportadora
    shipping: [
      'transportadora', 'a minha transportadora', 'meu transportador', 'minha transportadora',
      'transportadora própria', 'transportadora propria', 'envio internacional',
      'código de envio', 'codigo de envio', 'link de envio', 'link de pagamento',
      'courier', 'shipping agent', 'delivery company', 'my courier',
      'recolha ao domicílio', 'recolhe o artigo', 'recolher o artigo',
      'serviço de entrega próprio', 'pago o envio'
    ],
    // Urgência / pressão
    urgency: [
      'urgente', 'urgentemente', 'preciso urgente', 'venda urgente', 'só hoje', 'so hoje',
      'apenas hoje', 'última peça', 'ultima peca', 'última oportunidade', 'ultima chance',
      'última chance', 'tem de ser hoje', 'viajo amanhã', 'viajo amanha', 'parto amanhã',
      'mudança de país', 'today only', 'asap', 'urgent', 'must sell today', 'leaving soon',
      'be quick', 'first come first served'
    ],
    // Vendedor ausente / no estrangeiro (desculpa clássica)
    abroad: [
      'estou no estrangeiro', 'fora do país', 'fora do pais', 'no estrangeiro',
      'trabalho fora', 'estou em', 'mudei-me para', 'emigrei',
      'i am abroad', 'out of the country', 'out of town', 'currently abroad',
      'militar', 'no exército', 'navio', 'plataforma petrolífera', 'oil rig',
      'missionário', 'missionario', 'enfermeira no', 'soldier', 'on a mission'
    ],
    // Contacto fora da plataforma
    contact: [
      'whatsapp', 'whats app', 'wpp', 'zap', 'telegram', 'telgram',
      'envia email', 'manda email', 'meu email', 'contacta por email',
      'liga para', 'envia sms', 'manda mensagem para', 'contacta-me no',
      'chama no', 'fala comigo no', 'add me on'
    ],
    // "Bom demais" / iscas
    toogood: [
      '100% garantido', '100% original', 'totalmente garantido', 'sem riscos',
      'garantia total', 'imperdível', 'imperdivel', 'oferta única', 'oferta unica',
      'melhor preço do mercado', 'preço imbatível', 'liquidação total', 'liquidacao total',
      'novo na caixa selado', 'selado por baixo preço', 'brand new sealed cheap'
    ],
    // Burlas clássicas / spam
    classic: [
      'herança', 'heranca', 'herdeiro', 'príncipe', 'principe', 'nigéria', 'nigeria',
      'lotaria', 'lotería', 'prémio', 'premio', 'você ganhou', 'voce ganhou', 'you won',
      'renda extra', 'ganhe dinheiro', 'ganha dinheiro em casa', 'trabalho a partir de casa',
      'investimento garantido', 'retorno garantido', 'duplica o teu', 'lucro garantido',
      'clique aqui', 'click here', 'link na bio', 'não é burla', 'nao e burla', 'not a scam'
    ],
    // Descrição genérica/vazia
    generic: [
      'contacte-me para mais informações', 'mais informações por mensagem',
      'mais info por mensagem', 'mais detalhes por mensagem', 'pergunte por mensagem',
      'tudo na descrição', 'ver descrição', 'bom estado', 'como novo', 'pouco uso',
      'sem mais', 'preço negociável', 'preco negociavel', 'message for details',
      'as described', 'good condition'
    ]
  },

  // Domínios de fotos de stock / placeholders
  STOCK_HOSTS: ['shutterstock', 'gettyimages', 'istockphoto', 'istock', 'dreamstime',
    'adobe.stock', 'stock.adobe', '123rf', 'depositphotos', 'alamy', 'unsplash', 'pexels', 'pixabay'],
  PLACEHOLDER_HINTS: ['placeholder', 'no-image', 'noimage', 'no_image', 'default', 'blank',
    'dummy', 'sem-foto', 'semfoto'],

  // ── Regex (compilados uma vez) ──
  _RX: {
    email: /[a-z0-9._%+-]+@(?:gmail|hotmail|outlook|yahoo|live|icloud|proton|sapo)\.[a-z.]{2,}/i,
    phonePT: /(?:\+?351[\s.-]?)?9\d{2}[\s.-]?\d{3}[\s.-]?\d{3}/,
    waLink: /(?:wa\.me|api\.whatsapp\.com|t\.me|chat\.whatsapp)/i,
    extUrl: /https?:\/\/(?!.*(?:olx|vinted|idealista|standvirtual|imovirtual|custojusto|amazon|ebay|wallapop|mercadolivre|aliexpress|facebook)\.)/i
  },

  // ===========================================================================
  // ORQUESTRAÇÃO
  // ===========================================================================
  runAll(items) {
    if (!items || items.length === 0) return;
    this.detectClones(items);
    this.detectUnrealisticPrices(items);
    items.forEach(item => {
      if (this._processed.has(item)) return;
      this._processed.add(item);
      this.analyzeElement(item);
    });
  },

  /** Corre os detetores "por item" num único container (card OU página de detalhe). */
  analyzeElement(el) {
    if (!el) return;
    this.detectGenericPhotos(el);
    this.detectPoorDescription(el);
    this.detectTextSignals(el);
    this.detectContactInfo(el);
    this.detectNoReviews(el);
  },

  // ===========================================================================
  // PREÇO
  // ===========================================================================
  detectClones(items) {
    const signatures = new Map();
    items.forEach(item => {
      const title = this._getText(item, 'h1, h2, h3, .title, [class*="title"], [class*="name"], a[title]');
      const price = this._getText(item, '.price, [class*="price"], [class*="cost"], span[class*="value"]');
      if (title && price) {
        const cleanTitle = title.substring(0, 30).toLowerCase().trim();
        const cleanPrice = price.replace(/[^\d,.]/g, '').substring(0, 10);
        const sig = `${cleanTitle}_${cleanPrice}`;
        if (signatures.has(sig)) {
          item.dataset.scmClone = 'true';
          const original = signatures.get(sig);
          if (original) original.dataset.scmClone = 'true';
        } else {
          signatures.set(sig, item);
        }
      }
    });
  },

  detectUnrealisticPrices(items) {
    const prices = [];
    const itemPrices = new Map();
    items.forEach(item => {
      const priceText = this._getText(item, '.price, [class*="price"], [class*="cost"]');
      const price = this._parsePrice(priceText);
      if (price && price > 0) { prices.push(price); itemPrices.set(item, price); }
    });
    if (prices.length < 5) return;
    // Mediana é mais robusta a outliers que a média
    const sorted = prices.slice().sort((a, b) => a - b);
    const median = sorted[Math.floor(sorted.length / 2)];
    itemPrices.forEach((price, item) => {
      if (price < median * 0.4) {        // < 40% da mediana → muito suspeito
        item.dataset.scmUnrealisticPrice = 'extreme';
        item.dataset.scmPriceRatio = (price / median).toFixed(2);
      } else if (price < median * 0.6) { // 40-60% → suspeito
        item.dataset.scmUnrealisticPrice = 'true';
        item.dataset.scmPriceRatio = (price / median).toFixed(2);
      }
    });
  },

  // ===========================================================================
  // FOTOS
  // ===========================================================================
  detectGenericPhotos(item) {
    const images = item.querySelectorAll('img');
    let real = 0, generic = 0;
    images.forEach(img => {
      const w = img.width || img.naturalWidth || 0;
      const h = img.height || img.naturalHeight || 0;
      if (w && w < 50 && h && h < 50) return; // ignora ícones
      real++;
      const src = (img.src || img.currentSrc || '').toLowerCase();
      const alt = (img.alt || '').trim();
      const isPlaceholder = this.PLACEHOLDER_HINTS.some(h => src.includes(h));
      const isStock = this.STOCK_HOSTS.some(h => src.includes(h));
      if (isPlaceholder || isStock || alt === '') generic++;
    });
    if (real === 0) { item.dataset.scmNoPhotos = 'true'; return; }
    if (real === 1) item.dataset.scmFewPhotos = 'true';      // 1 só foto = sinal fraco
    if (generic / real >= 0.5) item.dataset.scmGenericPhotos = 'true';
  },

  // ===========================================================================
  // DESCRIÇÃO
  // ===========================================================================
  detectPoorDescription(item) {
    const desc = this._getText(item,
      '.description, [class*="desc"], [class*="detail"], [data-testid*="description"], p');
    if (!desc) { item.dataset.scmNoDescription = 'true'; return; }
    const wordCount = desc.split(/\s+/).filter(w => w.length > 2).length;
    if (wordCount < 8) item.dataset.scmPoorDescription = 'true';
  },

  // ===========================================================================
  // SINAIS DE TEXTO (palavras-chave ponderadas)
  // ===========================================================================
  detectTextSignals(item) {
    const text = this._collectText(item).toLowerCase();
    if (!text) return;
    const hit = (bank) => this.KW[bank].some(kw => text.includes(kw));

    if (hit('payment'))  item.dataset.scmKwPayment  = 'true';
    if (hit('shipping')) item.dataset.scmKwShipping = 'true';
    if (hit('urgency'))  item.dataset.scmKwUrgency  = 'true';
    if (hit('abroad'))   item.dataset.scmKwAbroad   = 'true';
    if (hit('contact'))  item.dataset.scmKwContact  = 'true';
    if (hit('toogood'))  item.dataset.scmKwToogood  = 'true';
    if (hit('classic'))  item.dataset.scmKwClassic  = 'true';

    // descrição genérica conta como sinal fraco
    let genericMatches = 0;
    this.KW.generic.forEach(p => { if (text.includes(p)) genericMatches++; });
    if (genericMatches >= 2) item.dataset.scmGenericText = 'true';
  },

  // ===========================================================================
  // CONTACTO FORA DA PLATAFORMA (email/telefone/whatsapp/link externo no texto)
  // ===========================================================================
  detectContactInfo(item) {
    const text = this._collectText(item);
    if (!text) return;
    if (this._RX.email.test(text))   item.dataset.scmContactEmail = 'true';
    if (this._RX.phonePT.test(text)) item.dataset.scmContactPhone = 'true';
    if (this._RX.waLink.test(text) || /\bwa\.me\b/i.test(text)) item.dataset.scmContactWa = 'true';
    // link externo dentro do anúncio
    const links = item.querySelectorAll('a[href]');
    for (const a of links) {
      if (this._RX.extUrl.test(a.href || '')) { item.dataset.scmExtLink = 'true'; break; }
    }
  },

  // ===========================================================================
  // VENDEDOR SEM AVALIAÇÕES / CONTA NOVA (quando o DOM expõe)
  // ===========================================================================
  detectNoReviews(item) {
    const text = this._collectText(item).toLowerCase();
    if (!text) return;
    if (/\b0\s*(avalia|review|opini|feedback)/.test(text) ||
        /sem avalia|no reviews|nenhuma avalia|0 vendas|membro há poucos|membro desde hoje|registado hoje/.test(text)) {
      item.dataset.scmNoReviews = 'true';
    }
  },

  // ===========================================================================
  // RESUMO + SCORE
  // ===========================================================================
  getSummary(item) {
    const d = item.dataset;
    const flags = [];
    // NOTA LEGAL: rótulos descrevem CARACTERÍSTICAS DO ANÚNCIO (factos
    // observáveis no texto/página), nunca acusam a pessoa. São "comportamento
    // observado", não um veredicto de culpa.
    // críticos
    if (d.scmKwPayment === 'true')  flags.push({ type: 'payment',  label: 'Menção a pagamento fora da plataforma', severity: 'critical' });
    if (d.scmKwClassic === 'true')  flags.push({ type: 'classic',  label: 'Linguagem associada a esquemas conhecidos', severity: 'critical' });
    if (d.scmUnrealisticPrice === 'extreme') flags.push({ type: 'price', label: 'Preço muito abaixo do habitual', severity: 'critical' });
    // altos
    if (d.scmKwShipping === 'true') flags.push({ type: 'shipping', label: 'Menção a transportadora própria', severity: 'high' });
    if (d.scmKwAbroad === 'true')   flags.push({ type: 'abroad',   label: 'Menção a estar no estrangeiro', severity: 'high' });
    if (d.scmContactWa === 'true' || d.scmExtLink === 'true') flags.push({ type: 'offplatform', label: 'Sugere contacto fora da plataforma', severity: 'high' });
    if (d.scmUnrealisticPrice === 'true') flags.push({ type: 'price', label: 'Preço abaixo do habitual', severity: 'high' });
    if (d.scmClone === 'true')      flags.push({ type: 'clone',    label: 'Anúncio repetido na página', severity: 'high' });
    // médios
    if (d.scmKwUrgency === 'true')  flags.push({ type: 'urgency',  label: 'Linguagem de urgência', severity: 'medium' });
    if (d.scmContactEmail === 'true' || d.scmContactPhone === 'true') flags.push({ type: 'contact', label: 'Contacto pessoal no texto', severity: 'medium' });
    if (d.scmKwToogood === 'true')  flags.push({ type: 'toogood',  label: 'Promessas "bom demais"', severity: 'medium' });
    if (d.scmNoPhotos === 'true')   flags.push({ type: 'no-photos', label: 'Sem fotos', severity: 'medium' });
    if (d.scmGenericPhotos === 'true') flags.push({ type: 'photos', label: 'Fotos genéricas/stock', severity: 'medium' });
    if (d.scmNoReviews === 'true')  flags.push({ type: 'no-reviews', label: 'Sem avaliações visíveis', severity: 'medium' });
    if (d.scmNoDescription === 'true') flags.push({ type: 'no-desc', label: 'Sem descrição', severity: 'medium' });
    // fracos
    if (d.scmPoorDescription === 'true') flags.push({ type: 'desc', label: 'Descrição vaga', severity: 'low' });
    if (d.scmFewPhotos === 'true')  flags.push({ type: 'few-photos', label: 'Poucas fotos', severity: 'low' });
    if (d.scmGenericText === 'true') flags.push({ type: 'generic', label: 'Texto genérico', severity: 'low' });
    return flags;
  },

  /**
   * Score 0..1 com efeito de COMBINAÇÃO: vários sinais juntos pesam mais que a
   * soma simples (o que distingue burla real de um anúncio só "preguiçoso").
   */
  calculateRiskScore(item) {
    const flags = this.getSummary(item);
    if (!flags.length) return 0;
    const lw = this._learned && this._learned.weights;
    let score = 0;
    flags.forEach(f => {
      const base = this._WEIGHTS[f.severity] || 0;
      // Se o backend já aprendeu a predictividade real deste sinal (P(dislike)),
      // usamo-la como peso — com piso em metade do peso por severidade para não
      // enfraquecer demasiado sinais ainda com pouca amostra.
      const learned = (lw && typeof lw[f.type] === 'number') ? lw[f.type] : null;
      score += (learned !== null) ? Math.max(learned, base * 0.5) : base;
    });
    // bónus de combinação: 3+ sinais distintos → +20%; 4+ → +35%
    if (flags.length >= 4) score *= 1.35;
    else if (flags.length >= 3) score *= 1.20;
    // um único sinal "low" sozinho não deve assustar
    if (flags.length === 1 && flags[0].severity === 'low') score *= 0.5;
    return Math.min(1, score);
  },

  // ── Helpers ──
  _getText(container, selector) {
    const el = container.querySelector(selector);
    return el ? el.textContent.trim() : null;
  },

  /** Junta o texto visível relevante do container (título + descrição + corpo). */
  _collectText(item) {
    // limita a 2000 chars para performance em páginas grandes
    const t = (item.textContent || '').replace(/\s+/g, ' ').trim();
    return t.length > 2000 ? t.slice(0, 2000) : t;
  },

  _parsePrice(text) {
    if (!text) return null;
    const cleaned = text
      .replace(/[€$£¥]/g, '')
      .replace(/EUR|USD|GBP/gi, '')
      .replace(/\s/g, '')
      .replace(/\./g, '')
      .replace(',', '.');
    const match = cleaned.match(/[\d.]+/);
    return match ? parseFloat(match[0]) : null;
  }
};
