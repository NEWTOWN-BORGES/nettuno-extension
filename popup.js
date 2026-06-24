/**
 * NETTUNO BETA - Popup
 * Lê histórico de votos de chrome.storage.local (gravado por content.js no momento do voto).
 *
 * Why ficheiro externo: MV3 bloqueia <script> inline via CSP 'script-src self'.
 */

// Delegators para NettunoUtils (ver nettuno-utils.js)
const fmtNum     = NettunoUtils.formatNumber;
const escapeHtml = NettunoUtils.escapeHtml;

function showPopupError(msg) {
  let el = document.getElementById('scm-popup-error');
  if (!el) {
    el = document.createElement('div');
    el.id = 'scm-popup-error';
    el.style.cssText = 'position:fixed;bottom:8px;left:8px;right:8px;background:#7f1d1d;color:#fca5a5;padding:8px 12px;border-radius:6px;font-size:11px;z-index:9999;cursor:pointer;';
    el.title = 'Clique para fechar';
    el.addEventListener('click', () => el.remove());
    document.body.appendChild(el);
  }
  el.textContent = msg;
  clearTimeout(el._t);
  el._t = setTimeout(() => el.remove(), 6000);
}

function applyTheme(theme) {
  const isLight = theme === 'light';
  document.body.classList.toggle('as-light', isLight);
  const thumb = document.getElementById('theme-toggle-thumb');
  if (thumb) thumb.textContent = isLight ? '☀' : '🌙';
}

async function loadAndApplyTheme() {
  const { scm_theme } = await NettunoUtils.Storage.get(['scm_theme']);
  applyTheme(scm_theme === 'light' ? 'light' : 'dark');
}

function toggleTheme() {
  const isLight = document.body.classList.contains('as-light');
  const newTheme = isLight ? 'dark' : 'light';
  applyTheme(newTheme);
  NettunoUtils.Storage.set({ scm_theme: newTheme });
}

// Reagir a mudanças de tema feitas a partir do painel de votos noutro contexto
chrome.storage.onChanged.addListener((changes, area) => {
  if (area === 'local' && changes.scm_theme) {
    applyTheme(changes.scm_theme.newValue === 'light' ? 'light' : 'dark');
  }
});

function _renderHistoryLoginWall(container) {
  container.innerHTML =
    '<div class="empty" style="padding:48px 20px;">' +
      '<div style="font-size:36px;margin-bottom:14px;">🔒</div>' +
      '<div style="font-size:14px;font-weight:700;letter-spacing:-0.2px;margin-bottom:8px;color:#F0F2F5;">Inicia sessão para ver o histórico</div>' +
      '<div style="font-size:11.5px;color:#8B95A5;font-weight:400;text-transform:none;line-height:1.55;margin-bottom:18px;">' +
        'O histórico de votos é pessoal.<br>Entra com a tua conta Google para acederes.' +
      '</div>' +
      '<button type="button" id="history-signin-btn" style="' +
        'background:rgba(255,255,255,.06);color:#F0F2F5;' +
        'border:1px solid rgba(255,255,255,.12);border-radius:8px;' +
        'box-shadow:inset 0 .5px 0 rgba(255,255,255,.15);' +
        'padding:10px 18px;font-size:12.5px;font-weight:600;cursor:pointer;' +
        'display:inline-flex;align-items:center;gap:8px;letter-spacing:.2px;' +
        'font-family:inherit;transition:background .15s, border-color .15s;">' +
        '<svg width="16" height="16" viewBox="0 0 18 18" xmlns="http://www.w3.org/2000/svg">' +
          '<path d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.875 2.684-6.615z" fill="#4285F4"/>' +
          '<path d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332C2.438 15.983 5.482 18 9 18z" fill="#34A853"/>' +
          '<path d="M3.964 10.71c-.18-.54-.282-1.117-.282-1.71s.102-1.17.282-1.71V4.958H.957C.347 6.173 0 7.548 0 9s.348 2.827.957 4.042l3.007-2.332z" fill="#FBBC05"/>' +
          '<path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0 5.482 0 2.438 2.017.957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58z" fill="#EA4335"/>' +
        '</svg>' +
        'Entrar com Google' +
      '</button>' +
    '</div>';

  const btn = container.querySelector('#history-signin-btn');
  if (btn) {
    btn.addEventListener('click', async () => {
      btn.disabled = true;
      btn.textContent = 'A entrar…';
      try {
        await scmSignInWithGoogle();
        await renderAuthState();
        init(); // recarregar histórico após login
      } catch (e) {
        console.error('[Auth] history signin error:', e);
        btn.disabled = false;
        btn.textContent = 'Erro — tenta novamente';
      }
    });
  }
}

function init() {
  const container = document.getElementById('history-container');
  container.innerHTML = '<div class="loading">A carregar histórico...</div>';

  // Esperar pelo estado de autenticação antes de mostrar histórico
  if (typeof auth === 'undefined') {
    _renderHistoryLoginWall(container);
    return;
  }

  const unsub = auth.onAuthStateChanged((user) => {
    unsub();
    if (!user) {
      _renderHistoryLoginWall(container);
      return;
    }
    _loadHistory(container);
  });
}

async function _loadHistory(container) {
  // Histórico vive no Firestore (collection 'votes') por uid: assim segue a conta
  // Google em qualquer browser/dispositivo. chrome.storage.local seria por-browser.
  if (typeof getUserHistory !== 'function') {
    container.innerHTML = '<div class="empty">Histórico indisponível</div>';
    return;
  }

  let votes = [];
  try {
    votes = await getUserHistory(50);
  } catch (err) {
    container.innerHTML =
      '<div class="empty">Erro ao carregar histórico<br>' +
      '<span style="font-size: 8px; opacity: 0.5; text-transform: none;">' +
      escapeHtml(err?.message || String(err)) + '</span></div>';
    return;
  }

  const tsMs = (v) => {
    const t = v.updatedAt || v.createdAt;
    if (!t) return 0;
    if (typeof t.toMillis === 'function') return t.toMillis();
    if (typeof t.seconds === 'number') return t.seconds * 1000;
    return Number(t) || 0;
  };
  // Excluir votos removidos (voteType:null) — sem este filtro apareciam
  // no histórico com o label errado (👎 DISLIKE).
  votes = votes.filter(v => v.voteType === VOTE_TYPES.LIKE || v.voteType === VOTE_TYPES.DISLIKE);
  votes.sort((a, b) => tsMs(b) - tsMs(a));

  if (votes.length === 0) {
    container.innerHTML =
      '<div class="empty">Sem votos registados<br>' +
      '<span style="font-size: 10px; opacity: 0.7; text-transform: none;">Abre o painel num anúncio e clica 👍 ou 👎.</span>' +
      '</div>';
    return;
  }

  container.innerHTML = '';
  const fallbackImg = 'icon-128.png';

  for (const item of votes) {
    const el = document.createElement('div');
    el.className = 'history-item';
    if (item.url) {
      el.classList.add('clickable');
      el.dataset.url = item.url;
    }

    const voteLabel = item.voteType === VOTE_TYPES.LIKE ? '👍 LIKE' : '👎 DISLIKE';
    const voteClass = item.voteType === VOTE_TYPES.LIKE ? 'vote-like' : 'vote-dislike';
    const title = escapeHtml(item.title || 'Anúncio');
    const site = escapeHtml(item.site || item.platform || 'unknown');
    const description = escapeHtml(item.description || '');

    el.innerHTML =
      '<div class="item-thumb"></div>' +
      '<div class="item-info">' +
        '<div class="item-title" title="' + title + '">' + title + '</div>' +
        (description ? '<div class="item-description">' + description + '</div>' : '') +
        '<div class="item-meta">' +
          '<span class="item-site">' + site + '</span>' +
          '<span class="item-vote ' + voteClass + '">' + voteLabel + '</span>' +
        '</div>' +
      '</div>';

    // Thumbnail via DOM: (1) o URL é validado (só http/https — vem do Firestore
    // e não é validado pelas rules); (2) o fallback usa addEventListener porque
    // a CSP do MV3 bloqueia handlers inline em páginas da extensão — o onerror
    // antigo era código morto e thumbnails partidos ficavam com o ícone roto.
    const img = document.createElement('img');
    img.alt = '';
    img.addEventListener('error', () => { img.src = fallbackImg; }, { once: true });
    img.src = NettunoUtils.safeImgUrl(item.thumbnail) || fallbackImg;
    el.querySelector('.item-thumb').appendChild(img);

    container.appendChild(el);
  }
}

function safeOpenUrl(url) {
  if (typeof url !== 'string' || !/^https?:\/\//i.test(url)) return;
  chrome.tabs.create({ url });
}

// Delegação de cliques fora do init() para evitar duplicar listeners a cada refresh
document.getElementById('history-container').addEventListener('click', (e) => {
  const card = e.target.closest('.history-item.clickable');
  if (!card || !card.dataset.url) return;
  safeOpenUrl(card.dataset.url);
});

document.getElementById('refresh-btn').addEventListener('click', init);

const themeToggle = document.getElementById('theme-toggle');
if (themeToggle) themeToggle.addEventListener('click', toggleTheme);

// Profile view: alterna entre histórico e perfil
function toggleProfileView() {
  const profileView = document.getElementById('profile-view');
  const historyContainer = document.getElementById('history-container');
  const profileBtn = document.getElementById('profile-toggle');
  if (!profileView || !historyContainer) return;

  const showing = profileView.classList.contains('active');
  if (showing) {
    profileView.classList.remove('active');
    historyContainer.style.display = '';
    if (profileBtn) profileBtn.classList.remove('active');
  } else {
    profileView.classList.add('active');
    historyContainer.style.display = 'none';
    if (profileBtn) profileBtn.classList.add('active');
    populateProfile();
    renderAuthState();
  }
}

async function populateProfile() {
  // Contadores do perfil vêm do Firestore (cross-browser). voteCount no user doc
  // é o contador autoritativo; sites são derivados das últimas 50 entradas.
  const voteEl = document.getElementById('profile-vote-count');
  const siteEl = document.getElementById('profile-site-count');
  if (voteEl) voteEl.textContent = '…';
  if (siteEl) siteEl.textContent = '…';

  let votes = 0;
  try {
    if (typeof scmGetUserProfile === 'function') {
      const profile = await scmGetUserProfile();
      if (profile && typeof profile.voteCount === 'number') votes = profile.voteCount;
    }
  } catch (e) { /* offline ou unauthenticated */ }

  let sites = new Set();
  try {
    if (typeof getUserHistory === 'function') {
      const history = await getUserHistory(50);
      history.forEach(v => {
        const s = v.site || v.platform;
        if (s) sites.add(s);
      });
      if (votes === 0) votes = history.length; // fallback se o user doc ainda não foi criado
    }
  } catch (e) { /* noop */ }

  if (voteEl) voteEl.textContent = fmtNum(votes);
  if (siteEl) siteEl.textContent = fmtNum(sites.size);
}

const profileToggle = document.getElementById('profile-toggle');
if (profileToggle) profileToggle.addEventListener('click', toggleProfileView);

// ─────────────────────────────────────────────────────────
// Auth flow — Google sign-in / sign-out / profile editing
// ─────────────────────────────────────────────────────────

async function renderAuthState() {
  // Espera o Firebase auth estar pronto (caso ainda esteja a inicializar)
  if (typeof auth === 'undefined') return;
  await new Promise(resolve => {
    const unsub = auth.onAuthStateChanged(() => { unsub(); resolve(); });
  });

  const isAuthed = typeof scmIsAuthenticated === 'function' && scmIsAuthenticated();
  const loginBlock = document.getElementById('auth-login-block');
  const signedBlock = document.getElementById('auth-signed-block');
  const form = document.getElementById('profile-form');
  const deleteBtn = document.getElementById('profile-delete');

  if (isAuthed) {
    if (loginBlock) loginBlock.style.display = 'none';
    if (signedBlock) signedBlock.style.display = 'block';
    if (form) form.style.display = 'flex';
    if (deleteBtn) deleteBtn.style.display = 'block';

    const user = auth.currentUser;
    const photoEl = document.getElementById('profile-photo');
    if (photoEl) photoEl.src = NettunoUtils.safeImgUrl(user.photoURL) || 'icon-128.png';
    const nameEl = document.getElementById('profile-display-name');
    if (nameEl) nameEl.textContent = user.displayName || 'Sem nome';
    const emailEl = document.getElementById('profile-email');
    if (emailEl) emailEl.textContent = user.email || '';

    // Carregar valores opt-in (com retry se o doc ainda não existir)
    try {
      let profile = await scmGetUserProfile();
      if (!profile && typeof scmEnsureUserProfile === 'function') {
        await scmEnsureUserProfile(user, { provider: 'google' });
        profile = await scmGetUserProfile();
      }
      if (profile) hydrateProfileForm(profile);

      // Badge tier
      const badgeEl = document.getElementById('profile-badge-tier');
      if (badgeEl && profile && typeof scmGetBadgeTier === 'function') {
        const tier = scmGetBadgeTier(profile.voteCount || 0);
        if (tier) {
          badgeEl.textContent = `${tier.icon} ${tier.label.toUpperCase()}`;
          badgeEl.style.display = 'inline-block';
          badgeEl.style.color = tier.color;
          badgeEl.style.borderColor = tier.color;
        }
      }
    } catch (e) { console.warn('[Auth] load profile error', e); }
  } else {
    if (loginBlock) loginBlock.style.display = 'block';
    if (signedBlock) signedBlock.style.display = 'none';
    if (form) form.style.display = 'none';
    if (deleteBtn) deleteBtn.style.display = 'none';
  }
}

function hydrateProfileForm(profile) {
  const n = document.getElementById('prof-nickname');
  if (n) n.value = profile.nickname || '';
  const a = document.getElementById('prof-age');
  if (a) a.value = profile.ageRange || '';
  const g = document.getElementById('prof-gender');
  if (g) g.value = profile.gender || '';
  const checks = document.querySelectorAll('#prof-interests input[type=checkbox]');
  const interests = new Set(profile.interests || []);
  checks.forEach(c => {
    c.checked = interests.has(c.value);
    c.closest('.as-interest-chip')?.classList.toggle('active', c.checked);
  });
}

// Toggle visual nos chips quando o checkbox muda
document.addEventListener('change', (e) => {
  if (e.target.matches('#prof-interests input[type=checkbox]')) {
    e.target.closest('.as-interest-chip')?.classList.toggle('active', e.target.checked);
  }
});

const googleBtn = document.getElementById('btn-google-signin');
if (googleBtn) {
  googleBtn.addEventListener('click', async () => {
    const label = document.getElementById('google-signin-label');
    googleBtn.disabled = true;
    if (label) label.textContent = 'A entrar…';
    try {
      await scmSignInWithGoogle();
      await renderAuthState();
    } catch (err) {
      console.error('[Auth] sign-in error:', err);
      showPopupError('Erro ao entrar com Google. Tenta novamente.');
    } finally {
      googleBtn.disabled = false;
      if (label) label.textContent = 'Entrar com Google';
    }
  });
}

const saveBtn = document.getElementById('btn-save-profile');
if (saveBtn) {
  saveBtn.addEventListener('click', async () => {
    const patch = {
      nickname: (document.getElementById('prof-nickname')?.value || '').trim(),
      ageRange: document.getElementById('prof-age')?.value || '',
      gender: document.getElementById('prof-gender')?.value || '',
      interests: Array.from(document.querySelectorAll('#prof-interests input[type=checkbox]:checked'))
        .map(c => c.value)
    };
    try {
      await scmUpdateUserProfile(patch);
      saveBtn.classList.add('saved');
      saveBtn.textContent = '✓ GUARDADO';
      setTimeout(() => {
        saveBtn.classList.remove('saved');
        saveBtn.textContent = '💾 GUARDAR PERFIL';
      }, 1800);
    } catch (err) {
      console.error('[Auth] save profile error:', err);
      showPopupError('Erro ao guardar perfil. Tenta novamente.');
    }
  });
}

// Apaga apenas as entradas de votos do storage local (preserva tema e outras preferências)
function clearVoteHistory(callback) {
  chrome.storage.local.get(null, (items) => {
    const voteKeys = Object.keys(items || {}).filter(k => k.startsWith('vote_'));
    if (voteKeys.length === 0) { if (callback) callback(); return; }
    chrome.storage.local.remove(voteKeys, () => { if (callback) callback(); });
  });
}

const profileLogout = document.getElementById('profile-logout');
if (profileLogout) {
  profileLogout.addEventListener('click', async () => {
    if (!confirm('Tens a certeza que queres terminar sessão? Vais voltar a estar anónimo.')) return;
    try {
      if (typeof scmSignOut === 'function') await scmSignOut();
    } catch (e) { console.warn('[Auth] signOut error', e); }
    clearVoteHistory(() => {
      toggleProfileView();
      init();
    });
  });
}

const profileDelete = document.getElementById('profile-delete');
if (profileDelete) {
  profileDelete.addEventListener('click', async () => {
    if (!confirm('APAGAR a tua conta e todos os dados associados? Esta ação é irreversível.')) return;
    if (!confirm('Tens a CERTEZA? Os teus votos vão deixar de estar ligados a ti (ficam anónimos).')) return;
    try {
      if (typeof scmDeleteAccount === 'function') await scmDeleteAccount();
      clearVoteHistory(() => {
        toggleProfileView();
        init();
        showPopupError('Conta apagada. Os teus dados foram removidos.');
      });
    } catch (err) {
      console.error('[Auth] delete error:', err);
      const hint = /recent.login/i.test(err.message || '') ? ' Termina sessão, volta a entrar e tenta de novo.' : '';
      showPopupError('Erro ao apagar conta.' + hint);
    }
  });
}

function renderAffiliateInPopup() {
  const slot = document.getElementById('scm-affiliate-popup');
  if (!slot) return;

  const affiliate = (typeof getAffiliate === 'function') ? getAffiliate('*') : null;
  if (!affiliate) return;

  const esc = s => String(s || '').replace(/[&<>"']/g, c => (
    {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]
  ));
  const rawUrl = String(affiliate.url || '');
  const safeUrl = /^https?:\/\//i.test(rawUrl) ? rawUrl : null;
  if (!safeUrl) return; // affiliate URL inseguro — não renderizar

  const banner = document.createElement('a');
  banner.className = 'as-popup-affiliate-banner';
  banner.href = safeUrl;
  banner.target = '_blank';
  banner.rel = 'noopener noreferrer sponsored';
  banner.id = 'scm-affiliate-popup-banner';
  banner.innerHTML =
    '<span class="as-popup-affiliate-badge">' + esc(affiliate.badge || 'PARCEIRO') + '</span>' +
    '<span class="as-popup-affiliate-text">' + esc(affiliate.headline || '') + '</span>' +
    '<span class="as-popup-affiliate-cta">' + esc(affiliate.cta || 'Ver →') + '</span>';

  banner.addEventListener('click', (e) => {
    e.preventDefault();
    safeOpenUrl(safeUrl);
  });

  slot.innerHTML = '';
  slot.appendChild(banner);
}

// ─────────────────────────────────────────────────────────
// Privacy policy link (footer + consent overlay)
// ─────────────────────────────────────────────────────────
function openPrivacyPolicy() {
  chrome.tabs.create({ url: chrome.runtime.getURL('privacy.html') });
}

['popup-privacy-link', 'consent-privacy-link'].forEach(id => {
  const el = document.getElementById(id);
  if (el) el.addEventListener('click', (e) => { e.preventDefault(); openPrivacyPolicy(); });
});

// ─────────────────────────────────────────────────────────
// First-run consent screen
// ─────────────────────────────────────────────────────────
function showConsentIfNeeded(callback) {
  chrome.storage.local.get(['scm_consented'], (res) => {
    if (res && res.scm_consented) { callback(); return; }

    const overlay = document.getElementById('scm-consent-overlay');
    if (!overlay) { callback(); return; }
    overlay.classList.remove('hidden');

    document.getElementById('btn-consent-accept')?.addEventListener('click', () => {
      chrome.storage.local.set({ scm_consented: true, scm_consent_date: Date.now() }, () => {
        overlay.classList.add('hidden');
        callback();
      });
    });

    document.getElementById('btn-consent-decline')?.addEventListener('click', () => {
      // Modo leitura: ocultar overlay mas NÃO gravar consentimento
      // (volta a aparecer na próxima abertura até o utilizador aceitar)
      overlay.classList.add('hidden');
      // Mostrar popup mas sem mostrar perfil nem histórico
      loadAndApplyTheme();
      renderAffiliateInPopup();
      const container = document.getElementById('history-container');
      if (container) {
        container.innerHTML =
          '<div class="empty">' +
            '<div class="as-read-mode-icon">👁️</div>' +
            '<div class="as-read-mode-title">MODO LEITURA</div>' +
            '<div class="as-read-mode-sub">' +
              'Podes ver votos da comunidade nos anúncios.<br>' +
              'Para votar, aceita a política de privacidade.' +
            '</div>' +
          '</div>';
      }
    });
  });
}

function bootstrap() {
  loadAndApplyTheme();
  showConsentIfNeeded(async () => {
    // Aguarda initAuth: faz sign-in silencioso com o token cached pelo chrome.identity
    // para garantir que o popup mostra a mesma conta que o painel de votação.
    try {
      if (typeof initAuth === 'function') await initAuth();
    } catch (e) { /* segue mesmo sem auth */ }
    init();
    renderAffiliateInPopup();
  });
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', bootstrap);
} else {
  bootstrap();
}
