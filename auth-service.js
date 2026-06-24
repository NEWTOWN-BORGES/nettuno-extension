/**
 * NETTUNO — Auth Service
 *
 * Centraliza autenticação: Google SSO via chrome.identity, anónimo, link
 * de conta anónima a credencial, sign-out e delete account (RGPD).
 *
 * NOTA: O Firebase init e `auth`/`db` globais vêm de firebase-config.js.
 * Este ficheiro é carregado depois desse no manifest.
 */

// ──────────────────────────────────────────────────────────
// Google SSO via chrome.identity (caminho nativo Chrome MV3)
// ──────────────────────────────────────────────────────────

// Rota o pedido de token pelo background service worker.
// chrome.identity.getAuthToken({ interactive: true }) não funciona em content scripts MV3.
async function scmGetGoogleAuthToken({ interactive = true } = {}) {
  return new Promise((resolve, reject) => {
    chrome.runtime.sendMessage({ type: 'SCM_GET_GOOGLE_TOKEN', interactive }, (response) => {
      if (chrome.runtime.lastError) {
        reject(new Error(chrome.runtime.lastError.message));
        return;
      }
      if (response?.error) {
        reject(new Error(response.error));
        return;
      }
      if (response?.token) {
        resolve(response.token);
      } else {
        reject(new Error('Sem token Google'));
      }
    });
  });
}

async function scmRevokeGoogleAuthToken(token) {
  if (!token) return;
  chrome.runtime.sendMessage({ type: 'SCM_REVOKE_GOOGLE_TOKEN', token }, () => {});
}

/**
 * Faz sign-in com Google. Se o utilizador atual é anónimo, faz LINK
 * (preservando UID e histórico). Senão, faz sign-in direto.
 */
async function scmSignInWithGoogle() {
  const token = await scmGetGoogleAuthToken({ interactive: true });
  const credential = firebase.auth.GoogleAuthProvider.credential(null, token);
  const userCred = await auth.signInWithCredential(credential);

  try {
    await scmEnsureUserProfile(userCred.user, { provider: 'google' });
  } catch (e) {
    console.warn('[Auth] profile sync failed (will retry on next open):', e.message);
  }
  return userCred.user;
}

/**
 * Sign-out completo: limpa token Google em cache + signOut Firebase.
 * NÃO apaga a conta — o utilizador pode voltar a entrar e ter o mesmo perfil.
 */
async function scmSignOut() {
  try {
    const token = await scmGetGoogleAuthToken({ interactive: false }).catch(() => null);
    if (token) await scmRevokeGoogleAuthToken(token);
  } catch (e) { /* noop */ }
  await auth.signOut();
}

/**
 * Apaga conta + dados RGPD. Irrecuperável.
 */
async function scmDeleteAccount() {
  const user = auth.currentUser;
  if (!user) return;
  const uid = user.uid;

  // Apagar doc de perfil (regras Firestore devem permitir delete pelo próprio uid)
  try { await db.collection('users').doc(uid).delete(); } catch (e) { /* noop */ }

  // Revogar token Google
  try {
    const token = await scmGetGoogleAuthToken({ interactive: false }).catch(() => null);
    if (token) await scmRevokeGoogleAuthToken(token);
  } catch (e) { /* noop */ }

  // Apagar conta Firebase Auth
  await user.delete();
}

// ──────────────────────────────────────────────────────────
// Perfil de utilizador — Firestore users/{uid}
// ──────────────────────────────────────────────────────────

/**
 * Cria/atualiza o doc de perfil. Chamado em todos os sign-ins.
 * Idempotente: usa merge para nunca sobrescrever campos opt-in.
 */
async function scmEnsureUserProfile(user, { provider } = {}) {
  if (!user || !db) return;
  const ref = db.collection('users').doc(user.uid);
  const snap = await ref.get();
  const now = firebase.firestore.FieldValue.serverTimestamp();

  // Detetar idioma e país automaticamente (se disponível)
  let language = 'pt', country = '';
  try {
    if (typeof scmDetectLang === 'function') language = scmDetectLang();
  } catch (e) { /* noop */ }
  try {
    const host = (typeof window !== 'undefined') ? window.location.hostname : '';
    if (/\.pt$/.test(host)) country = 'PT';
    else if (/\.es$|wallapop\.com$/.test(host)) country = 'ES';
    else if (/\.fr$/.test(host)) country = 'FR';
    else if (/\.de$/.test(host)) country = 'DE';
    else if (/\.it$/.test(host)) country = 'IT';
    else if (/\.co\.uk$/.test(host)) country = 'GB';
    else if (/mercadolivre\.com\.br$|olx\.com\.br$/.test(host)) country = 'BR';
  } catch (e) { /* noop */ }

  if (!snap.exists) {
    await ref.set({
      uid: user.uid,
      email: user.email || null,
      displayName: user.displayName || null,
      photoURL: user.photoURL || null,
      provider: provider || (user.providerData?.[0]?.providerId) || 'google',
      language,
      country,
      createdAt: now,
      lastSeenAt: now,
      nickname: '',
      ageRange: '',
      gender: '',
      interests: [],
      consents: { analytics: false, marketing: false, categoryTracking: false },
      // Counters inicializados a 0 para o utilizador aparecer no leaderboard
      // (orderBy('voteCount') no dashboard exclui docs sem o campo).
      voteCount: 0,
      signalCount: 0,
      lastVoteAt: null
    });
  } else {
    await ref.set({
      email: user.email || null,
      displayName: user.displayName || null,
      photoURL: user.photoURL || null,
      provider: provider || (user.providerData?.[0]?.providerId) || 'google',
      lastSeenAt: now
    }, { merge: true });
  }
}

async function scmGetUserProfile() {
  const user = auth.currentUser;
  if (!user) return null;
  try {
    const snap = await db.collection('users').doc(user.uid).get();
    return snap.exists ? snap.data() : null;
  } catch (e) {
    console.error('[Auth] getUserProfile error:', e);
    return null;
  }
}

/**
 * Atualiza campos opt-in do perfil (nickname, ageRange, interests, etc).
 * Whitelist explícita + sanitização de comprimento para evitar data bloat.
 */
async function scmUpdateUserProfile(patch) {
  const user = auth.currentUser;
  if (!user) throw new Error('Não autenticado');

  // Validação/sanitização centralizada em profile-validation.js (carregado antes
  // deste ficheiro no manifest). Fonte única de verdade, testável em isolamento.
  const safe = sanitizeProfilePatch(patch);

  if (Object.keys(safe).length === 0) return; // nada para gravar
  safe.lastSeenAt = firebase.firestore.FieldValue.serverTimestamp();
  await db.collection('users').doc(user.uid).set(safe, { merge: true });
}

/**
 * Atualiza apenas consents (granular: { analytics, marketing, categoryTracking }).
 */
async function scmUpdateConsents(consents) {
  return scmUpdateUserProfile({ consents });
}

// ──────────────────────────────────────────────────────────
// Helpers para a UI
// ──────────────────────────────────────────────────────────

function scmIsAuthenticated() {
  return !!auth.currentUser;
}

function scmAuthDisplayName() {
  const u = auth.currentUser;
  return u ? (u.displayName || u.email || null) : null;
}

function scmAuthPhotoURL() {
  const u = auth.currentUser;
  return u ? (u.photoURL || null) : null;
}

// ── Badge system ──────────────────────────────────────────
// Tiers: 0-4 votos = sem badge | 5-19 = Colaborador | 20-49 = Vigilante | 50+ = Verificador Experiente
function scmGetBadgeTier(voteCount) {
  const n = Number(voteCount) || 0;
  if (n >= 50) return { tier: 3, label: 'Verificador Experiente', icon: '🥇', color: '#FACC15' };
  if (n >= 20) return { tier: 2, label: 'Vigilante',              icon: '🥈', color: '#94A3B8' };
  if (n >= 5)  return { tier: 1, label: 'Colaborador',            icon: '🥉', color: '#CD7C2F' };
  return null;
}
