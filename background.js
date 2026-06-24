/**
 * NETTUNO — Background Service Worker (MV3)
 */

// ── Alerta pós-visita ─────────────────────────────────────────────────────────
// Project ID tem de coincidir com firebase-config.js (projectId: 'nettuno-e6036').
const FIRESTORE_BASE = 'https://firestore.googleapis.com/v1/projects/nettuno-e6036/databases/(default)/documents';
const ALARM_NAME     = 'scm_check_visited_ads';
const CHECK_INTERVAL = 30; // minutos
const MIN_DISLIKES   = 5;  // mínimo de dislikes para notificar
const MIN_NEW        = 3;  // mínimo de dislikes novos desde a visita

function ensureAlarm() {
  chrome.alarms.get(ALARM_NAME, (alarm) => {
    if (!alarm) chrome.alarms.create(ALARM_NAME, { periodInMinutes: CHECK_INTERVAL });
  });
}

chrome.runtime.onInstalled.addListener(ensureAlarm);
chrome.runtime.onStartup.addListener(ensureAlarm);

chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === ALARM_NAME) checkVisitedAds();
});

async function checkVisitedAds() {
  const { scm_visited_ads = {}, scm_notified_ads = {} } =
    await chrome.storage.local.get(['scm_visited_ads', 'scm_notified_ads']);

  // Limpar anúncios com mais de 7 dias
  const weekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
  let cleaned = false;
  for (const id of Object.keys(scm_visited_ads)) {
    if ((scm_visited_ads[id].visitedAt || 0) < weekAgo) {
      delete scm_visited_ads[id];
      delete scm_notified_ads[id];
      cleaned = true;
    }
  }
  if (cleaned) await chrome.storage.local.set({ scm_visited_ads, scm_notified_ads });

  for (const adId of Object.keys(scm_visited_ads)) {
    if (scm_notified_ads[adId]) continue;
    const visited = scm_visited_ads[adId];

    try {
      const res = await fetch(`${FIRESTORE_BASE}/ads/${encodeURIComponent(adId)}`);
      if (!res.ok) continue;
      const doc = await res.json();
      const f = doc.fields || {};
      const currentDislikes = parseInt(f.dislikes?.integerValue || '0', 10);
      const newDislikes = currentDislikes - (visited.dislikesAtVisit || 0);

      if (currentDislikes >= MIN_DISLIKES && newDislikes >= MIN_NEW) {
        const title = (visited.title || 'Anúncio visitado').slice(0, 60);
        chrome.notifications.create(`scm_alert_${adId}`, {
          type: 'basic',
          iconUrl: 'icon-128.png',
          title: '⚠️ NETTUNO — Alerta de Burla',
          message: `"${title}" recebeu ${newDislikes} novos alertas de burla desde a tua visita.`,
          priority: 2
        });
        scm_notified_ads[adId] = true;
        await chrome.storage.local.set({ scm_notified_ads });
      }
    } catch (e) {
      // Rede indisponível ou Firestore unreachable — tenta na próxima ronda (30 min).
      // Log para DevTools do service worker: ajuda a detetar regressões como
      // projectId desalinhado (404 silencioso até aqui).
      console.warn('[NETTUNO bg] checkVisitedAds fetch falhou para', adId, e?.message || e);
    }
  }
}

// Abrir anúncio quando o utilizador clica na notificação
chrome.notifications.onClicked.addListener(async (notifId) => {
  if (!notifId.startsWith('scm_alert_')) return;
  const adId = notifId.replace('scm_alert_', '');
  const { scm_visited_ads = {} } = await chrome.storage.local.get('scm_visited_ads');
  const url = scm_visited_ads[adId]?.url;
  if (url) chrome.tabs.create({ url });
  chrome.notifications.clear(notifId);
});

// ── Mensagens do content script / popup ──────────────────────────────────────
chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {

  // ── Obter token Google ──────────────────────────────────
  if (msg.type === 'SCM_GET_GOOGLE_TOKEN') {
    chrome.identity.getAuthToken({ interactive: msg.interactive !== false }, (token) => {
      if (chrome.runtime.lastError || !token) {
        sendResponse({ error: chrome.runtime.lastError?.message || 'Sem token Google' });
      } else {
        sendResponse({ token });
      }
    });
    return true; // manter canal aberto para resposta assíncrona
  }

  // ── Abrir o popup do toolbar (usado pelo avatar no painel de votação) ──
  // chrome.action.openPopup() existe a partir do Chrome 127 e só funciona em
  // resposta a um user-gesture. Se falhar (browser antigo / sem gesture),
  // cai para abrir popup.html numa tab nova como fallback.
  if (msg.type === 'SCM_OPEN_HISTORY_POPUP') {
    const openInTab = () => chrome.tabs.create({ url: chrome.runtime.getURL('popup.html'), active: true });
    if (chrome.action && typeof chrome.action.openPopup === 'function') {
      try {
        const p = chrome.action.openPopup();
        if (p && typeof p.then === 'function') {
          p.then(() => sendResponse({ ok: true }))
           .catch(() => { openInTab(); sendResponse({ ok: true, fallback: 'tab' }); });
        } else {
          sendResponse({ ok: true });
        }
      } catch (e) {
        openInTab();
        sendResponse({ ok: true, fallback: 'tab' });
      }
    } else {
      openInTab();
      sendResponse({ ok: true, fallback: 'tab' });
    }
    return true;
  }

  // ── Revogar token Google (sign-out / delete account) ───
  if (msg.type === 'SCM_REVOKE_GOOGLE_TOKEN') {
    const token = msg.token;
    if (!token) { sendResponse({ ok: true }); return false; }

    fetch(`https://oauth2.googleapis.com/revoke?token=${encodeURIComponent(token)}`, { method: 'POST' })
      .catch(() => {})
      .finally(() => {
        chrome.identity.removeCachedAuthToken({ token }, () => sendResponse({ ok: true }));
      });
    return true;
  }

  return false;
});
