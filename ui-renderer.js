/**
 * NETTUNO v4.0 - UI Renderer
 * Renderização do painel brutalista v3 com 4 tabs.
 *
 * @typedef {Object} BadgeMetrics
 * @property {number} [likes]
 * @property {number} [dislikes]
 * @property {number} [uniqueUsers]
 * @property {number} [totalVotes]
 * @property {('RISK'|'WARNING'|'SAFE'|'TRUSTED')} [badgeState]
 * @property {string} [title]
 * @property {string} [thumbnail]
 * @property {string} [description]
 * @property {Object<string,number>} [signals]
 * @property {number} [totalSignals]
 */

// Delegator para NettunoUtils.formatNumber (ver nettuno-utils.js)
const _fmtNum = NettunoUtils.formatNumber;

// Segurança: só aceita URLs http(s) (voterPhoto/photoURL vêm de docs de voto
// de outros utilizadores e não são validados pelas Firestore Rules).
// Delegator para NettunoUtils.safeImgUrl (fonte única — ver nettuno-utils.js).
const _safeImgUrl = NettunoUtils.safeImgUrl;

const UIRenderer = {
  activeTooltip: null,
  currentAdId: null,
  currentPlatform: null,
  activeTab: 'stats',
  isActionLocked: false,
  onEventCallback: null,
  currentUserEvents: {},
  currentMetrics: {},
  panelUnsubscribers: [],
  // [FIX] Cache local de eventos do utilizador por adId
  // Sobrepõe o Firestore (pode estar stale por offline persistence)
  _userEventsCache: {},
  // Tema atual: 'dark' (padrão) ou 'light'. Carregado de chrome.storage.local.
  currentTheme: 'dark',

  async loadTheme(callback) {
    const { scm_theme } = await NettunoUtils.Storage.get(['scm_theme']);
    this.currentTheme = scm_theme === 'light' ? 'light' : 'dark';
    if (callback) callback(this.currentTheme);
  },

  applyTheme(modal) {
    if (!modal) return;
    if (this.currentTheme === 'light') modal.classList.add('as-light');
    else modal.classList.remove('as-light');
    const thumb = modal.querySelector('.as-theme-toggle-thumb');
    if (thumb) thumb.textContent = this.currentTheme === 'light' ? '☀' : '🌙';
  },

  toggleTheme(modal) {
    this.currentTheme = this.currentTheme === 'light' ? 'dark' : 'light';
    this.applyTheme(modal);
    NettunoUtils.Storage.set({ scm_theme: this.currentTheme });
  },

  /**
   * Cria o elemento DOM do badge brutalista para injectar junto a um anúncio.
   * O badge mostra um ícone (escudo para RISK/WARNING/SAFE, estrela para TRUSTED)
   * com a cor a indicar o estado. Não é apendido ao DOM aqui — o caller fá-lo.
   *
   * @param {string} adId - ID do anúncio (gravado em dataset.asHash para reconciliação).
   * @param {BadgeMetrics} [metrics={}] - Métricas iniciais. Default badgeState='WARNING'.
   * @returns {HTMLElement} Container do badge (`.as-badge-container`), pronto para append.
   */
  createBadge(adId, metrics = {}) {
    const container = document.createElement('div');
    container.className = 'as-badge-container';
    container.dataset.asHash = adId;

    const badgeState = metrics.badgeState || BADGE_STATES.WARNING;
    const isTrusted = badgeState === BADGE_STATES.TRUSTED;
    const badgeClass = this._getBadgeClass(badgeState);
    
    const badge = document.createElement('div');
    badge.className = `as-badge ${badgeClass}`;
    
    // Ícone: estrela quando trusted, escudo quando não
    const icon = isTrusted ? this._getStarPath() : this._getShieldPath();
    badge.innerHTML = `<svg viewBox="0 0 24 24" fill="currentColor" width="20" height="20">
      <path d="${icon}"/>
    </svg>`;

    container.appendChild(badge);
    this._applyRiskColor(badge, metrics);

    if (isTrusted) {
      container.classList.add('as-is-trusted');
    }

    return container;
  },

  /**
   * Atualiza um badge existente
   */
  updateBadge(container, metrics) {
    if (!container) return;
    
    const badge = container.querySelector('.as-badge');
    if (!badge) return;

    const badgeState = metrics.badgeState || BADGE_STATES.WARNING;
    const isTrusted = badgeState === BADGE_STATES.TRUSTED;
    const newClass = `as-badge ${this._getBadgeClass(badgeState)}`;
    
    if (badge.className !== newClass) {
      badge.className = newClass;
      const icon = isTrusted ? this._getStarPath() : this._getShieldPath();
      badge.querySelector('path').setAttribute('d', icon);
    }

    this._applyRiskColor(badge, metrics);

    if (isTrusted) {
      container.classList.add('as-is-trusted');
    } else {
      container.classList.remove('as-is-trusted');
    }
  },

  /**
   * Abre o painel completo de votação para um anúncio. Fecha qualquer painel aberto antes.
   * O caller é responsável por (1) chamar positionPanel() depois para posicionar relativo
   * ao badge e (2) registar/limpar os listeners Firestore externos via addPanelUnsubscriber.
   *
   * @param {string} adId - ID do anúncio activo (substitui o anterior).
   * @param {string} platform - Slug da plataforma (filtra sinais relevantes).
   * @param {BadgeMetrics} [metrics={}] - Métricas atuais a render.
   * @param {Object<string,boolean>} [userEvents={}] - Mapping signal → user-clicou.
   *   Funde-se com o cache local otimista (prioridade ao cache para evitar stale Firestore).
   * @param {function(string, Object): Promise<void>} onEventCallback -
   *   Invocado quando user vota ou clica num sinal. type ∈ {'vote','signal'}.
   * @param {Object|null} [user=null] - Firebase User (passar null se anónimo).
   *   Renderer NÃO acede a `auth` global — recebe sempre como prop.
   * @returns {HTMLElement} O elemento do painel (`.as-v3-tooltip`).
   */
  openPanel(adId, platform, metrics = {}, userEvents = {}, onEventCallback, user = null) {
    this.closePanel();
    
    this.currentAdId = adId;
    this.currentPlatform = platform;
    this.onEventCallback = onEventCallback;
    // [FIX] Fundir dados do Firebase com cache local otimista
    // O cache local tem prioridade: evita que dados stale do Firestore apaguem cliques recentes
    const cached = this._userEventsCache[adId] || {};
    this.currentUserEvents = { ...(userEvents || {}), ...cached };
    // Sincronizar o cache com o estado fundido
    this._userEventsCache[adId] = this.currentUserEvents;
    this.currentMetrics = metrics || {};
    
    const panel = document.createElement('div');
    panel.className = 'as-v3-tooltip';
    panel.id = 'scm-panel';
    
    const modal = document.createElement('div');
    modal.className = 'as-v3-modal';

    // Header
    const header = this._createHeader(metrics, user);
    modal.appendChild(header);
    
    // Status bar
    const statusBar = this._createStatusBar(metrics);
    modal.appendChild(statusBar);
    
    // Percentage bar (S/W/R)
    const pctBar = this._createPercentageBar(metrics);
    if (pctBar) modal.appendChild(pctBar);
    
    // Vote bar (like/dislike pill)
    // [FIX] Usar o estado fundido (currentUserEvents) que inclui cache local
    const voteBar = this._createVoteBar(metrics, this.currentUserEvents.vote);
    modal.appendChild(voteBar);
    
    // Tabs (SINAIS, CONTACTO, INTERAÇÃO, RESULTADO)
    const tabs = this._createTabs();
    modal.appendChild(tabs);
    
    // Content area
    const content = document.createElement('div');
    content.className = 'as-v3-content';
    content.id = 'scm-panel-content';
    modal.appendChild(content);
    
    // Footer (Google Ads space)
    const footer = this._createFooter();
    modal.appendChild(footer);

    panel.appendChild(modal);

    // Badge tag (RISCO/ATENÇÃO/SEGURO/CONFIÁVEL) — fora do modal para não ser cortada por overflow:hidden
    const badgeTag = this._createBadgeTag(metrics);
    panel.appendChild(badgeTag);

    document.body.appendChild(panel);

    this.activeTooltip = panel;

    // Aplicar tema (dark/light) — carrega de storage e aplica ao modal
    this.loadTheme(() => this.applyTheme(modal));

    // [FIX] Renderizar conteúdo inicial respeitando a aba stats
    if (this.activeTab === 'stats') {
      this._renderStatsTab(content, this.currentMetrics);
    } else {
      this._renderTabContent(content, this.activeTab, platform, this.currentUserEvents, this.currentMetrics);
    }
    
    // Event listeners
    this._attachPanelEvents(panel, tabs, content, platform);

    // Popular avatares dos participantes (async, não bloqueia)
    this._populateVoters(adId);

    return panel;
  },

  /**
   * Fecha o painel ativo
   */
  closePanel() {
    if (this.activeTooltip) {
      this.activeTooltip.remove();
      this.activeTooltip = null;
    }
    this.clearPanelListeners();
  },

  addPanelUnsubscriber(fn) {
    this.panelUnsubscribers.push(fn);
  },

  clearPanelListeners() {
    this.panelUnsubscribers.forEach(fn => {
      try { fn(); } catch (e) {}
    });
    this.panelUnsubscribers = [];
  },

  /**
   * Cria a tag do badge (RISCO/ATENÇÃO/SEGURO/CONFIÁVEL)
   */
  _createBadgeTag(metrics) {
    const tag = document.createElement('div');
    tag.className = 'as-v3-badge-tag';
    
    const badgeState = metrics.badgeState || BADGE_STATES.WARNING;
    const colors = {
      'RISK': '#ef4444',
      'ALERT': '#f97316',
      'WARNING': '#facc15',
      'SAFE': '#22c55e',
      'TRUSTED': '#2563eb'
    };

    const labels = {
      'RISK': (typeof scmT === 'function') ? scmT('ui.badge_risk') : 'CAUTELA',
      'ALERT': (typeof scmT === 'function') ? scmT('ui.badge_alert') : 'SINAIS',
      'WARNING': (typeof scmT === 'function') ? scmT('ui.badge_warning') : 'ATENÇÃO',
      'SAFE': (typeof scmT === 'function') ? scmT('ui.badge_safe') : 'SEM ALERTAS',
      'TRUSTED': (typeof scmT === 'function') ? scmT('ui.badge_trusted') : 'BEM AVALIADO'
    };

    tag.style.setProperty('background', colors[badgeState] || colors['WARNING'], 'important');
    tag.style.setProperty('color', (badgeState === 'WARNING') ? '#000' : '#FFFFFF', 'important');
    tag.textContent = labels[badgeState] || labels['WARNING'];

    return tag;
  },

  /**
   * Cria o header do painel
   */
  _createHeader(metrics, user = null) {
    const header = document.createElement('header');
    header.className = 'as-v3-header';

    // Why <div> em vez de <h1>: cada site (OLX, Standvirtual, Imovirtual, etc.) tem
    // regras CSS para <h1> com !important (font-family, font-size, padding, color)
    // que se sobrepõem ao nosso CSS e fazem o cabeçalho parecer diferente em cada site.
    const baseFont = "'Inter', system-ui, -apple-system, BlinkMacSystemFont, sans-serif";
    const titleSafe = String(metrics.title || 'Anúncio')
      .replace(/[<>"']/g, c => ({'<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

    const photoURL = _safeImgUrl(user?.photoURL || '');
    const rawInitials = user?.displayName
      ? user.displayName.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()
      : (user?.email ? user.email[0].toUpperCase() : '?');
    const initials = String(rawInitials).slice(0, 2);

    header.innerHTML = `
      <button type="button" class="as-theme-toggle" title="Alternar tema claro/escuro" aria-label="Alternar tema">
        <span class="as-theme-toggle-thumb">🌙</span>
      </button>
      <button type="button" class="as-profile-toggle" title="Perfil" aria-label="Perfil" style="padding:0!important;overflow:hidden!important;display:flex!important;align-items:center!important;justify-content:center!important;"></button>
      <a class="as-v3-brand" href="https://nettuno-e6036.web.app" target="_blank" rel="noopener noreferrer" title="Visitar nettuno-e6036.web.app" style="font-family: ${baseFont} !important; font-size: 10px !important; font-weight: 900 !important; color: #FFB162 !important; letter-spacing: 2px !important; text-transform: uppercase !important; opacity: 0.85 !important; line-height: 1 !important; padding: 0 !important; margin: 0 !important; text-align: center !important; display: block !important; cursor: pointer !important; text-decoration: none !important;">NETTUNO BETA</a>
      <div class="as-v3-title" style="font-family: ${baseFont} !important; font-size: 14px !important; font-weight: 900 !important; line-height: 1.2 !important; letter-spacing: 0.3px !important; padding: 0 !important; margin: 6px 0 0 0 !important; overflow: hidden !important; white-space: nowrap !important; text-overflow: ellipsis !important; text-transform: none !important; text-align: center !important; display: block !important;">
        <span class="as-v3-title-inner">${titleSafe}</span>
      </div>
    `;

    const toggleBtn = header.querySelector('.as-theme-toggle');
    if (toggleBtn) {
      toggleBtn.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        const modal = header.closest('.as-v3-modal');
        this.toggleTheme(modal);
      });
    }

    const profileBtn = header.querySelector('.as-profile-toggle');
    if (profileBtn) {
      // Avatar construído via DOM (sem handlers inline): textContent/atributos
      // nunca são interpretados como HTML, e o fallback de erro de imagem
      // funciona mesmo em sites cuja CSP bloqueia handlers inline.
      const showInitials = () => {
        const span = document.createElement('span');
        span.style.cssText = 'font-size:11px;font-weight:900;line-height:1;';
        span.textContent = initials;
        profileBtn.replaceChildren(span);
      };
      if (photoURL) {
        const img = document.createElement('img');
        img.style.cssText = 'width:24px;height:24px;border-radius:50%;display:block;object-fit:cover;';
        img.alt = '';
        img.addEventListener('error', showInitials, { once: true });
        img.src = photoURL;
        profileBtn.replaceChildren(img);
      } else {
        showInitials();
      }
      profileBtn.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        this._openHistoryPopup();
      });
    }

    return header;
  },

  // Abre o popup de histórico/perfil em tab nova. Centraliza auth e perfil
  // num único contexto (popup) — o painel de votação deixou de gerir login.
  _openHistoryPopup() {
    try {
      chrome.runtime.sendMessage({ type: 'SCM_OPEN_HISTORY_POPUP' }, () => {
        if (chrome.runtime.lastError) {
          console.warn('[NETTUNO] open popup failed:', chrome.runtime.lastError.message);
        }
      });
    } catch (e) {
      console.warn('[NETTUNO] open popup error:', e);
    }
  },

  // Verifica auth. Se auth.currentUser for null (content script sem sessão persistida),
  // tenta re-auth silenciosa via token chrome.identity em cache antes de bloquear.
  async _ensureAuth() {
    if (typeof scmIsAuthenticated === 'function' && scmIsAuthenticated()) return true;
    try {
      if (typeof scmGetGoogleAuthToken !== 'function') return false;
      const token = await scmGetGoogleAuthToken({ interactive: false });
      if (!token) return false;
      const credential = firebase.auth.GoogleAuthProvider.credential(null, token);
      await auth.signInWithCredential(credential);
      return !!auth.currentUser;
    } catch (_) {
      return false;
    }
  },

  /**
   * Cria a barra de status
   */
  _createStatusBar(metrics) {
    const bar = document.createElement('div');
    bar.className = 'as-brutal-status-secondary';

    const totalSignals = metrics.totalSignals || 0;
    const uniqueUsers = metrics.uniqueUsers || 0;
    const confidence = Math.round((metrics.confidence || 0) * 100);

    const _t = (typeof scmT === 'function') ? scmT : (k) => k.split('.')[1];
    // Stack de até 6 avatares (preenchidos async via _populateVoters)
    // Skeleton inicial: bolhinhas cinza enquanto a query Firestore não chega
    bar.innerHTML = `
      <div class="as-ticker-container">
        <div class="as-ticker-item">
          <span class="as-voters-block">
            <span class="as-voters-stack" data-voters-stack></span>
            <span data-voters-count>${_fmtNum(uniqueUsers)}</span>
            <span style="opacity:.7;">${_t('ui.stat_participants')}</span>
          </span>
          <span style="color: #334155; margin: 0 4px;">|</span>
          <span>📊 ${_fmtNum(totalSignals)} ${_t('ui.stat_signals')}</span>
          <span style="color: #334155; margin: 0 4px;">|</span>
          <span>🛡️ ${confidence}% ${_t('ui.stat_confidence')}</span>
        </div>
      </div>
    `;

    return bar;
  },

  /**
   * Fetch e populate dos avatares dos últimos votantes. Chamado depois do
   * painel estar no DOM. Falha silenciosamente — o número em texto fica.
   * @param {string} adId
   */
  async _populateVoters(adId) {
    if (typeof getRecentVoters !== 'function') return;
    if (!this.activeTooltip || this.currentAdId !== adId) return;
    const stack = this.activeTooltip.querySelector('[data-voters-stack]');
    if (!stack) return;

    let voters = [];
    try { voters = await getRecentVoters(adId, 6); } catch (e) { return; }
    if (!this.activeTooltip || this.currentAdId !== adId) return;

    if (voters.length === 0) {
      stack.innerHTML = '<span class="as-voter as-voter-empty">🕵️</span>';
      return;
    }

    // Construção via DOM (sem innerHTML/handlers inline): voterName/voterPhoto
    // vêm de docs de voto de OUTROS utilizadores — nunca podem tocar em HTML.
    // O fallback de erro de imagem usa addEventListener (funciona mesmo em
    // sites cuja CSP bloqueia handlers inline, onde o onerror antigo morria).
    const frag = document.createDocumentFragment();
    voters.forEach(v => {
      const name = String(v.voterName || 'Anónimo').slice(0, 60);
      const init = (name.trim().split(/\s+/).map(p => p[0]).join('').slice(0, 2).toUpperCase()) || '?';
      const voteAttr = String(v.voteType || '').replace(/[^a-z_]/gi, '');
      const photo = _safeImgUrl(v.voterPhoto);

      const makeInitSpan = () => {
        const span = document.createElement('span');
        span.className = 'as-voter as-voter-init';
        span.dataset.vote = voteAttr;
        span.title = name;
        span.textContent = init;
        return span;
      };

      if (photo) {
        const img = document.createElement('img');
        img.className = 'as-voter';
        img.alt = name;
        img.title = name;
        img.dataset.vote = voteAttr;
        img.addEventListener('error', () => img.replaceWith(makeInitSpan()), { once: true });
        img.src = photo;
        frag.appendChild(img);
      } else {
        frag.appendChild(makeInitSpan());
      }
    });
    stack.replaceChildren(frag);
  },

  /**
   * Cria a barra de percentagem S/W/R
   */
  _createPercentageBar(metrics) {
    const percentages = metrics.percentages;
    if (!percentages || metrics.totalSignals === 0) return null;
    
    const bar = document.createElement('div');
    bar.style.cssText = 'display: flex; height: 5px; background: #131C2E; margin: 0 12px 8px 12px; border: 1px solid #263348; border-radius: 2px; overflow: hidden;';
    
    bar.innerHTML = `
      <div style="width: ${percentages.safe}%; background: #22c55e;"></div>
      <div style="width: ${percentages.warning}%; background: #facc15;"></div>
      <div style="width: ${percentages.risk}%; background: #ef4444;"></div>
    `;
    
    const labels = document.createElement('div');
    labels.style.cssText = 'display: flex; justify-content: space-between; margin: 2px 14px 10px 14px; font-family: Inter, sans-serif; font-size: 9px; font-weight: 900; color: #475569; text-transform: uppercase; letter-spacing: 0.5px;';
    labels.innerHTML = `
      <span>S: ${percentages.safe.toFixed(0)}%</span>
      <span>W: ${percentages.warning.toFixed(0)}%</span>
      <span>R: ${percentages.risk.toFixed(0)}%</span>
    `;
    
    const container = document.createElement('div');
    container.appendChild(bar);
    container.appendChild(labels);
    
    return container;
  },

  /**
   * Cria a barra de votação (like/dislike pill)
   */
  _createVoteBar(metrics, userVote) {
    const bar = document.createElement('div');
    bar.className = 'as-brutal-vote-bar';

    const likes = metrics.likes || 0;
    const dislikes = metrics.dislikes || 0;
    const isLiked = userVote === VOTE_TYPES.LIKE;
    const isDisliked = userVote === VOTE_TYPES.DISLIKE;
    const authed = typeof scmIsAuthenticated === 'function' && scmIsAuthenticated();
    const _t = (k, fb) => (typeof scmT === 'function') ? scmT(k) : fb;

    const adUrl  = encodeURIComponent(window.location.href);
    const badge  = metrics.badgeState || 'WARNING';
    const badgeEmoji = badge === 'TRUSTED' ? '✅' : badge === 'SAFE' ? '🟡' : badge === 'RISK' ? '🚨' : '⚠️';
    const shareText = encodeURIComponent(
      `${badgeEmoji} Este anúncio tem avaliação "${badge}" na comunidade NETTUNO!\n` +
      `${decodeURIComponent(adUrl)}\n\n` +
      `Protege-te de burlas online — instala grátis (Chrome):\n` +
      `https://nettuno-e6036.web.app`
    );
    const waUrl  = `https://wa.me/?text=${shareText}`;
    const xUrl   = `https://twitter.com/intent/tweet?text=${shareText}`;
    const fbUrl  = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent('https://nettuno-e6036.web.app')}&quote=${shareText}`;
    const rawMsg = `${badgeEmoji} Avaliação "${badge}" — ${window.location.href}\nNETTUNO: https://nettuno-e6036.web.app`;

    bar.innerHTML = `
      <div class="as-brutal-pill">
        <div class="as-like-btn ${isLiked ? 'active' : ''}" data-type="like">
          👍 <span id="scm-likes">${_fmtNum(likes)}</span>
        </div>
        <div class="as-dislike-btn ${isDisliked ? 'active' : ''}" data-type="dislike">
          👎 <span id="scm-dislikes">${_fmtNum(dislikes)}</span>
        </div>
      </div>
      <div class="as-share-row">
        <span class="as-share-label">PARTILHAR</span>
        <a class="as-share-btn" data-share="whatsapp" title="WhatsApp" href="${waUrl}" target="_blank" rel="noopener noreferrer">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/><path d="M12 0C5.373 0 0 5.373 0 12c0 2.123.554 4.117 1.528 5.845L0 24l6.335-1.508A11.95 11.95 0 0012 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 21.818a9.818 9.818 0 01-5.006-1.374l-.36-.214-3.724.886.921-3.618-.235-.372A9.818 9.818 0 1112 21.818z"/></svg>
        </a>
        <a class="as-share-btn" data-share="x" title="X / Twitter" href="${xUrl}" target="_blank" rel="noopener noreferrer">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.748l7.73-8.835L1.254 2.25H8.08l4.253 5.622zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>
        </a>
        <a class="as-share-btn" data-share="facebook" title="Facebook" href="${fbUrl}" target="_blank" rel="noopener noreferrer">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor"><path d="M24 12.073C24 5.405 18.627 0 12 0S0 5.405 0 12.073C0 18.1 4.388 23.094 10.125 24v-8.437H7.078v-3.49h3.047V9.41c0-3.025 1.792-4.697 4.533-4.697 1.312 0 2.686.236 2.686.236v2.97h-1.513c-1.491 0-1.956.93-1.956 1.885v2.27h3.328l-.532 3.49h-2.796V24C19.612 23.094 24 18.1 24 12.073z"/></svg>
        </a>
        <button class="as-share-btn" data-share="instagram" title="Instagram — copia e abre">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z"/></svg>
        </button>
        <button class="as-share-btn" data-share="tiktok" title="TikTok — copia e abre">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor"><path d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-2.88 2.5 2.89 2.89 0 01-2.89-2.89 2.89 2.89 0 012.89-2.89c.28 0 .54.04.79.1V9.01a6.33 6.33 0 00-.79-.05 6.34 6.34 0 00-6.34 6.34 6.34 6.34 0 006.34 6.34 6.34 6.34 0 006.33-6.34V8.75a8.18 8.18 0 004.78 1.52V6.83a4.85 4.85 0 01-1.01-.14z"/></svg>
        </button>
        <button class="as-share-btn" data-share="copy" title="Copiar link">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/></svg>
        </button>
      </div>
    `;

    // Copy + open handler for platforms without web share URLs
    const _copyAndOpen = (url, btnSelector) => {
      navigator.clipboard?.writeText(rawMsg).then(() => {
        const btn = bar.querySelector(btnSelector);
        if (btn) {
          const orig = btn.innerHTML;
          btn.innerHTML = '✓';
          setTimeout(() => { btn.innerHTML = orig; }, 1500);
        }
        window.open(url, '_blank', 'noopener,noreferrer');
      });
    };

    bar.querySelector('[data-share="instagram"]')?.addEventListener('click', () => {
      _copyAndOpen('https://www.instagram.com', '[data-share="instagram"]');
    });

    bar.querySelector('[data-share="tiktok"]')?.addEventListener('click', () => {
      _copyAndOpen('https://www.tiktok.com', '[data-share="tiktok"]');
    });

    // Copy to clipboard handler
    bar.querySelector('[data-share="copy"]')?.addEventListener('click', () => {
      navigator.clipboard?.writeText(rawMsg).then(() => {
        const btn = bar.querySelector('[data-share="copy"]');
        if (btn) { btn.innerHTML = '✓'; setTimeout(() => { btn.innerHTML = '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/></svg>'; }, 1500); }
      });
    });

    return bar;
  },

  /**
   * Cria as 4 tabs
   */
  _createTabs() {
    const tabs = document.createElement('div');
    tabs.className = 'as-v3-tab-row';
    
    const t = (typeof scmT === 'function') ? scmT : (k) => k.split('.')[1];
    const tabConfig = [
      { id: 'stats', label: t('ui.tab_stats') },
      { id: 'contact', label: t('ui.tab_contact') },
      { id: 'interaction', label: t('ui.tab_interaction') },
      { id: 'result', label: t('ui.tab_result') }
    ];
    
    tabs.innerHTML = tabConfig.map(tab => `
      <button class="as-v3-tab ${tab.id === this.activeTab ? 'active' : ''}" data-tab="${tab.id}">
        ${tab.label}
      </button>
    `).join('');
    
    return tabs;
  },

  /**
   * Cria o footer com slot de afiliado contextual
   */
  _createFooter() {
    const footer = document.createElement('div');
    footer.className = 'as-v3-footer';

    const affiliate = (typeof getAffiliate === 'function')
      ? getAffiliate(this.currentPlatform || '')
      : null;

    let affiliateHtml;
    // Só renderiza o parceiro se o URL for http(s) — consistente com o popup.
    // (Defesa em profundidade: o config é local, mas um URL javascript: aqui
    // seria executável com um clique.)
    const _affUrl = affiliate ? String(affiliate.url || '') : '';
    if (affiliate && /^https?:\/\//i.test(_affUrl)) {
      const esc = s => String(s || '').replace(/[<>"']/g, c => ({'<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
      const safeUrl = _affUrl.replace(/['"<>]/g, '');
      affiliateHtml = `
        <a class="as-v3-affiliate" href="${safeUrl}" target="_blank" rel="noopener noreferrer sponsored" id="scm-affiliate-panel">
          <span class="as-affiliate-badge">${esc(affiliate.badge || 'PARCEIRO')}</span>
          <span class="as-affiliate-headline">${esc(affiliate.headline || '')}</span>
          <span class="as-affiliate-cta">${esc(affiliate.cta || 'Ver →')}</span>
        </a>
      `;
    } else {
      affiliateHtml = `<div class="as-v3-ads" id="scm-affiliate-panel"><span>${(typeof scmT === 'function') ? scmT('ui.ad_space') : 'Espaço publicitário'}</span></div>`;
    }

    const disclaimer = (typeof scmT === 'function') ? scmT('ui.disclaimer')
      : 'Indicadores automáticos e votos da comunidade. Não são uma acusação nem uma garantia — verifica sempre antes de pagar.';

    footer.innerHTML = `
      ${affiliateHtml}
      <div class="as-feedback-area" id="scm-feedback"></div>
      <div class="as-v3-disclaimer" style="font-size:9px;line-height:1.3;opacity:.6;padding:6px 8px;text-align:center;">${disclaimer}</div>
    `;

    return footer;
  },

  /**
   * Renderiza o conteúdo de uma tab
   */
  _renderTabContent(container, tabName, platform, userEvents, metrics) {
    container.innerHTML = '';
    
    userEvents = userEvents || {};

    if (tabName === 'stats') {
      this._renderStatsTab(container, metrics);
      return;
    }
    
    // Obter sinais para esta fase
    const signals = getSignalsForPhase(platform, tabName);
    
    if (signals.length === 0) {
      const _noCat = (typeof scmT === 'function') ? scmT('ui.no_category') : 'Nenhum sinal disponível para esta categoria.';
      container.innerHTML = `
        <div style="padding: 30px 10px; text-align: center; color: #94A3B8; font-family: 'Inter', sans-serif; font-size: 12px; border: 1px dashed #1E293B; margin: 10px; border-radius: 0;">
          ${_noCat}
        </div>
      `;
      return;
    }
    
    const grid = document.createElement('div');
    grid.className = 'as-v3-grid';
    
    signals.forEach(signal => {
      const isActive = userEvents[signal.signal] === true;
      const colorClass = getSignalColorClass(signal);
      const hasSub = signal.hasSub ? 'as-card-has-sub-v2' : '';
      
      const card = document.createElement('div');
      card.className = `as-v3-card ${colorClass} ${isActive ? 'active' : ''} ${hasSub}`;
      card.dataset.signal = signal.signal;
      card.dataset.phase = tabName;
      
      const _label = (typeof scmSignalLabel === 'function') ? scmSignalLabel(signal.signal, signal.label) : signal.label;
      card.innerHTML = `
        <div class="as-card-main-side">
          <span class="as-card-icon">${signal.icon}</span>
          <span class="as-card-marquee">
            <span class="as-card-marquee-inner">${_label}</span>
          </span>
        </div>
      `;
      
      // Adicionar sub-botões se necessário
      if (signal.hasSub) {
        const subSide = document.createElement('div');
        subSide.className = 'as-card-sub-side';
        
        const miniGrid = document.createElement('div');
        miniGrid.className = 'as-mini-grid';
        
        SUB_BUTTONS.forEach(sub => {
          const subActive = userEvents[sub.signal] === true;
          const btn = document.createElement('button');
          btn.className = `as-mini-btn ${subActive ? 'active' : ''}`;
          btn.dataset.sub = sub.signal;
          btn.style.background = sub.color;
          if (sub.color === '#facc15' || sub.color === '#e2e8f0') {
            btn.style.color = '#000';
          }
          btn.title = sub.label;
          btn.innerHTML = `<span class="as-mini-marquee-wrapper"><span class="as-mini-marquee">${sub.label}</span></span>`;
          miniGrid.appendChild(btn);
        });
        
        subSide.appendChild(miniGrid);
        card.appendChild(subSide);
      }
      
      grid.appendChild(card);
    });
    
    container.appendChild(grid);
    
    // Verificar overflow para marquee
    requestAnimationFrame(() => {
      this._checkMarqueeOverflow(container);
    });
  },

  _renderStatsTab(container, metrics) {
    let signalEntries = [];

    if (metrics.signals) {
      signalEntries = Object.entries(metrics.signals).filter(([, count]) => count > 0);
    }

    if (signalEntries.length === 0) {
      const _noSig = (typeof scmT === 'function') ? scmT('ui.no_signals') : 'Ainda não há sinais comunitários registados.';
      container.innerHTML = `
        <div style="padding: 30px 10px; text-align: center; color: #94A3B8; font-family: 'Inter', sans-serif; font-size: 12px;">
          ${_noSig}
        </div>
      `;
      return;
    }

    // Ordenar por count (descendente)
    const sortedSignals = signalEntries.sort(([, a], [, b]) => b - a);
    const totalCount = sortedSignals.reduce((sum, [, count]) => sum + count, 0);
    const uniqueUsers = metrics.uniqueUsers || metrics.unique_users || 1;

    let html = `
      <div style="padding: 0 10px 10px 10px; font-family: 'Inter', sans-serif;">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px; font-size: 11px; font-weight: 900; text-transform: uppercase; color: #22D3EE; letter-spacing: 0.5px; border-bottom: 2px solid #000; padding-bottom: 8px;">
          <span>${(typeof scmT === 'function') ? scmT('ui.community_signals') : 'SINAIS DA COMUNIDADE'}</span>
          <span style="color: #94A3B8;">${_fmtNum(uniqueUsers)} ${(typeof scmT === 'function') ? scmT('ui.participants') : 'PARTICIPANTES'}</span>
        </div>
        <div style="display:flex; flex-direction:column; width:100%;">
    `;

    sortedSignals.forEach(([key, count]) => {
      const info = getSignalInfo(this.currentPlatform, key);
      // SEGURANÇA: `key` vem do mapa signals do doc Firestore do anúncio, que
      // qualquer utilizador autenticado consegue escrever. Sem escape, uma chave
      // maliciosa com HTML seria XSS armazenado no browser de quem abre o painel.
      const rawLabel = (typeof scmSignalLabel === 'function') ? scmSignalLabel(key, info ? info.label : key) : (info ? info.label : key);
      const label = NettunoUtils.escapeHtml(rawLabel);
      const icon = info ? info.icon : '▪️';
      const percentage = totalCount > 0 ? Math.round((count / totalCount) * 100) : 0;
      const barColor = getSignalBarColor(info);

      html += `
        <div style="display: flex; flex-direction: column; padding: 10px 0; border-bottom: 1px solid #1E293B;">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px;">
            <div style="display: flex; align-items: center; gap: 8px;">
              <span style="font-size: 14px;">${icon}</span>
              <span style="font-weight: 700; font-size: 12px; color: #E2E8F0;">${label}</span>
              <span style="font-size: 10px; color: #64748b; font-family: monospace;">(${_fmtNum(count)})</span>
            </div>
            <span style="font-weight: 900; font-size: 12px; color: #22D3EE;">${percentage}%</span>
          </div>
          <div style="width: 100%; height: 6px; background: #131C2E; border: 1px solid #000; border-radius: 0px; overflow: hidden;">
            <div style="width: ${percentage}%; height: 100%; background: ${barColor};"></div>
          </div>
        </div>
      `;
    });
    
    html += '</div></div>';
    container.innerHTML = html;
  },

  /**
   * Atacha eventos ao painel
   */
  _attachPanelEvents(panel, tabs, content, platform) {
    // Tabs
    tabs.addEventListener('click', async (e) => {
      const tabBtn = e.target.closest('.as-v3-tab');
      if (!tabBtn) return;

      const tabName = tabBtn.dataset.tab;
      if (tabName === this.activeTab) return;

      // Abas de votação requerem login. Tenta re-auth silenciosa antes de bloquear.
      const gatedTabs = Object.values(PHASES);
      if (gatedTabs.includes(tabName)) {
        const authed = await this._ensureAuth();
        if (!authed) {
          this._openHistoryPopup();
          return;
        }
      }

      this.activeTab = tabName;
      tabs.querySelectorAll('.as-v3-tab').forEach(t => t.classList.remove('active'));
      tabBtn.classList.add('active');

      const mergedEvents = { ...this.currentUserEvents, ...(this._userEventsCache[this.currentAdId] || {}) };

      if (tabName === 'stats') {
        if (typeof getAdData === 'function' && this.currentAdId) {
          getAdData(this.currentAdId, true).then(freshMetrics => {
            this.currentMetrics = freshMetrics;
            this._renderStatsTab(content, this.currentMetrics);
          }).catch(err => {
            console.error('[UIRenderer] Erro ao buscar dados frescos:', err);
            this._renderStatsTab(content, this.currentMetrics);
          });
        } else {
          this._renderStatsTab(content, this.currentMetrics);
        }
      } else {
        this._renderTabContent(content, tabName, platform, mergedEvents, this.currentMetrics);
      }
    });
    
    // Vote buttons
    const voteBar = panel.querySelector('.as-brutal-vote-bar');
    if (voteBar) {
      voteBar.addEventListener('click', async (e) => {
        const btn = e.target.closest('.as-like-btn, .as-dislike-btn');
        if (!btn || this.isActionLocked) return;

        const authed = await this._ensureAuth();
        if (!authed) {
          this._openHistoryPopup();
          return;
        }

        this.isActionLocked = true;
        setTimeout(() => this.isActionLocked = false, 250);

        const type = btn.dataset.type;
        if (this.onEventCallback) {
          await this.onEventCallback('vote', type);
        }
      });
    }

    // Signal cards (delegation)
    content.addEventListener('click', async (e) => {
      const card = e.target.closest('.as-v3-card');
      if (!card || this.isActionLocked) return;

      const signalType = card.dataset.signal;
      const phase = card.dataset.phase;

      // Verificar se clicou num sub-botão
      const miniBtn = e.target.closest('.as-mini-btn');
      if (miniBtn) {
        const authed = await this._ensureAuth();
        if (!authed) {
          this._openHistoryPopup();
          return;
        }

        this.isActionLocked = true;
        setTimeout(() => this.isActionLocked = false, 250);

        const subType = miniBtn.dataset.sub;
        
        const isSubActive = miniBtn.classList.contains('active');
        
        if (!isSubActive) {
          const currentActiveCount = content.querySelectorAll('.as-v3-card.active, .as-mini-btn.active').length;
          if (currentActiveCount >= 3) {
            this.showFeedback('Limite de 3 votos por separador.', 'warning');
            return;
          }
        }
        
        miniBtn.classList.toggle('active', !isSubActive);
        
        // [FIX] Atualizar currentUserEvents E o cache persistente
        if (this.currentUserEvents) {
          this.currentUserEvents[subType] = !isSubActive;
        }
        if (!this._userEventsCache[this.currentAdId]) this._userEventsCache[this.currentAdId] = {};
        this._userEventsCache[this.currentAdId][subType] = !isSubActive;
        
        if (this.onEventCallback) {
          await this.onEventCallback('signal', { signalType: subType, phase, isSub: true });
        }
        return;
      }
      
      // Verificar se é card com sub-botões
      if (card.classList.contains('as-card-has-sub-v2')) {
        // Toggle expansão
        const isExpanded = card.classList.contains('expanded');
        
        // Fechar outros expandidos
        content.querySelectorAll('.as-v3-card.expanded').forEach(c => {
          if (c !== card) c.classList.remove('expanded');
        });
        
        if (!isExpanded) {
          card.classList.add('expanded');
        } else {
          // Se já está expandido e clicou no card (não no sub-botão), registar o sinal principal
          this.isActionLocked = true;
          setTimeout(() => this.isActionLocked = false, 250);
          
          const isActive = card.classList.contains('active');
          
          if (!isActive) {
            const currentActiveCount = content.querySelectorAll('.as-v3-card.active, .as-mini-btn.active').length;
            if (currentActiveCount >= 3) {
              this.showFeedback('Limite de 3 votos por separador.', 'warning');
              return;
            }
          }
          
          card.classList.toggle('active', !isActive);
          
          if (this.currentUserEvents) {
            this.currentUserEvents[signalType] = !isActive;
          }
          if (!this._userEventsCache[this.currentAdId]) this._userEventsCache[this.currentAdId] = {};
          this._userEventsCache[this.currentAdId][signalType] = !isActive;

          if (this.onEventCallback) {
            await this.onEventCallback('signal', { signalType, phase });
          }
          card.classList.remove('expanded');
        }
        return;
      }
      
      // Sinal normal - toggle visual imediato
      this.isActionLocked = true;
      setTimeout(() => this.isActionLocked = false, 250);
      
      const isActive = card.classList.contains('active');
      
      if (!isActive) {
        const currentActiveCount = content.querySelectorAll('.as-v3-card.active, .as-mini-btn.active').length;
        if (currentActiveCount >= 3) {
          this.showFeedback('Limite de 3 votos por separador.', 'warning');
          return;
        }
      }
      
      card.classList.toggle('active', !isActive);
      
      // [FIX] Atualizar currentUserEvents E o cache persistente
      if (this.currentUserEvents) {
        this.currentUserEvents[signalType] = !isActive;
      }
      if (!this._userEventsCache[this.currentAdId]) this._userEventsCache[this.currentAdId] = {};
      this._userEventsCache[this.currentAdId][signalType] = !isActive;

      if (this.onEventCallback) {
        await this.onEventCallback('signal', { signalType, phase });
      }
    });
  },

  /**
   * Atualiza os contadores de voto no painel
   */
  updateVoteCounts(likes, dislikes) {
    const likesEl = document.getElementById('scm-likes');
    const dislikesEl = document.getElementById('scm-dislikes');
    if (likesEl) likesEl.textContent = _fmtNum(likes);
    if (dislikesEl) dislikesEl.textContent = _fmtNum(dislikes);
  },

  /**
   * Atualiza o estado dos botões de voto
   */
  updateVoteButtons(userVote) {
    const likeBtn = document.querySelector('.as-like-btn');
    const dislikeBtn = document.querySelector('.as-dislike-btn');
    
    if (likeBtn) likeBtn.classList.toggle('active', userVote === VOTE_TYPES.LIKE);
    if (dislikeBtn) dislikeBtn.classList.toggle('active', userVote === VOTE_TYPES.DISLIKE);
  },

  /**
   * Mostra feedback/mensagem no painel
   */
  showFeedback(message, type = 'info') {
    const area = document.getElementById('scm-feedback');
    if (!area) return;
    
    const colors = {
      info: { bg: '#3b82f6', text: '#fff' },
      success: { bg: '#22c55e', text: '#fff' },
      error: { bg: '#ef4444', text: '#fff' },
      warning: { bg: '#facc15', text: '#000' }
    };
    
    const style = colors[type] || colors.info;
    
    area.textContent = message;
    area.style.backgroundColor = style.bg;
    area.style.color = style.text;
    area.style.padding = '8px';
    area.style.borderRadius = '2px';
    area.style.fontWeight = '900';
    area.style.textAlign = 'center';
    area.style.border = '2px solid #000';
    area.style.boxShadow = '3px 3px 0px #000';
    area.style.marginTop = '8px';
    
    // Animação de Shake
    area.style.animation = 'none';
    void area.offsetWidth; // Trigger reflow
    area.style.animation = 'as-shake 0.4s ease-in-out';
    
    setTimeout(() => {
      if (area && area.textContent === message) {
        area.textContent = '';
        area.style.padding = '0';
        area.style.border = 'none';
        area.style.boxShadow = 'none';
        area.style.backgroundColor = 'transparent';
      }
    }, 3500);
  },

  /**
   * Posiciona o painel perto de um elemento alvo
   */
  positionPanel(target, panel) {
    if (!target || !panel) return;
    
    const rect = target.getBoundingClientRect();
    const panelWidth = 380;
    
    let left = rect.left + window.scrollX;
    const top = rect.bottom + window.scrollY + 10;
    
    if (left + panelWidth > window.innerWidth) {
      left = (rect.right + window.scrollX) - panelWidth;
    }
    
    left = Math.max(10, left);
    
    panel.style.left = `${left}px`;
    panel.style.top = `${top}px`;
  },

  /**
   * Helper: classe CSS do badge baseada no estado
   */
  _getBadgeClass(badgeState) {
    switch (badgeState) {
      case 'SAFE': return 'as-badge-safe';
      case 'RISK': return 'as-badge-danger';
      case 'ALERT': return 'as-badge-alert';
      case 'TRUSTED': return 'as-badge-trusted';
      case 'WARNING':
      default: return 'as-badge-warning';
    }
  },

  /**
   * Cor do escudo em GRADIENTE contínuo conforme o grau de risco:
   * verde → amarelo → laranja → vermelho. Um anúncio mais "para o vermelho"
   * fica visualmente mais vermelho. Devolve null para TRUSTED (azul fixo) e
   * para "sem dados" (mantém o amarelo neutro da classe WARNING).
   */
  _riskColor(metrics) {
    if (!metrics || metrics.badgeState === 'TRUSTED') return null;
    const likes    = +metrics.likes    || 0;
    const dislikes = +metrics.dislikes || 0;
    const total    = likes + dislikes;
    const fraud    = +(metrics.finalFraudScore != null ? metrics.finalFraudScore : (metrics.fraudScore || 0));
    const fraudRisk = Math.max(0, Math.min(1, fraud / 12)); // 12 ≈ RISK
    if (total === 0 && fraud <= 0) return null;              // sem dados → amarelo neutro
    let score;
    if (total > 0) {
      const voteRisk = dislikes / total;     // 0 = só likes (verde) · 1 = só dislikes (vermelho)
      score = Math.max(voteRisk, fraudRisk);
    } else {
      score = fraudRisk;                      // só análise local
    }
    return this._gradientHex(score);
  },

  /**
   * Interpola a cor para t∈[0,1] por ROTAÇÃO DE MATIZ (HSL): verde(140°) →
   * amarelo(60°) → laranja(30°) → vermelho(0°). A rotação de matiz dá um
   * espetro contínuo e vívido (sem os tons acastanhados da interpolação RGB).
   */
  _gradientHex(t) {
    t = Math.max(0, Math.min(1, t));
    // curva ligeiramente acelerada no fim → o vermelho só "domina" em risco alto
    const hue = 140 * (1 - Math.pow(t, 1.15)); // 0→140 (verde) · 1→0 (vermelho)
    return this._hslToRgb(hue, 100, 50);       // saturação máxima → cores fluorescentes
  },

  /** HSL → "rgb(r,g,b)". h em graus, s/l em %. */
  _hslToRgb(h, s, l) {
    s /= 100; l /= 100;
    const k = n => (n + h / 30) % 12;
    const a = s * Math.min(l, 1 - l);
    const f = n => l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)));
    const r = Math.round(255 * f(0));
    const g = Math.round(255 * f(8));
    const b = Math.round(255 * f(4));
    return `rgb(${r},${g},${b})`;
  },

  /** Aplica (ou limpa) a cor de gradiente no escudo, com transição suave. */
  _applyRiskColor(badgeEl, metrics) {
    if (!badgeEl) return;
    const col = this._riskColor(metrics);
    if (col) {
      // transição animada (vence o `transition:none !important` da classe)
      badgeEl.style.setProperty('transition', 'background-color .55s ease, background .55s ease', 'important');
      badgeEl.style.setProperty('background', col, 'important');
      badgeEl.style.setProperty('background-color', col, 'important');
    } else {
      badgeEl.style.removeProperty('background');
      badgeEl.style.removeProperty('background-color');
    }
  },

  /**
   * Helper: path SVG do escudo
   */
  _getShieldPath() {
    return 'M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4z';
  },

  /**
   * Helper: path SVG da estrela
   */
  _getStarPath() {
    return 'M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z';
  },

  /**
   * Verifica overflow para animação marquee
   */
  _checkMarqueeOverflow(container) {
    const marquees = container.querySelectorAll('.as-card-marquee, .as-mini-marquee-wrapper');
    marquees.forEach(marquee => {
      const inner = marquee.querySelector('.as-card-marquee-inner, .as-mini-marquee');
      if (!inner) return;
      
      const diff = inner.scrollWidth - marquee.clientWidth;
      if (diff > 0) {
        marquee.classList.add('has-overflow');
        marquee.style.setProperty('--scroll-dist', `${diff + 15}px`);
      } else {
        marquee.classList.remove('has-overflow');
      }
    });
  }
};

// R4 — Sincronização de tema ao vivo entre contextos.
// Sem isto, mudar o tema no popup não atualizava um painel já aberto no content
// script (cada contexto tinha a sua cópia de currentTheme). Agora o chrome.storage
// é a fonte única e ambos reagem ao mesmo evento onChanged.
if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.onChanged) {
  chrome.storage.onChanged.addListener((changes, area) => {
    if (area !== 'local' || !changes.scm_theme) return;
    UIRenderer.currentTheme = changes.scm_theme.newValue === 'light' ? 'light' : 'dark';
    const modal = UIRenderer.activeTooltip && UIRenderer.activeTooltip.querySelector
      ? UIRenderer.activeTooltip.querySelector('.as-v3-modal')
      : null;
    if (modal) UIRenderer.applyTheme(modal);
  });
}
