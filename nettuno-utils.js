/**
 * NETTUNO — Utilitários partilhados (DRY)
 * Exposto como `NettunoUtils` global. Carregado antes de popup.js/ui-renderer.js/content.js.
 */
(function (global) {
  'use strict';

  function formatNumber(n) {
    n = Number(n) || 0;
    if (n >= 1e9) return (n / 1e9).toFixed(n >= 10e9 ? 0 : 1).replace(/\.0$/, '') + 'B';
    if (n >= 1e6) return (n / 1e6).toFixed(n >= 10e6 ? 0 : 1).replace(/\.0$/, '') + 'M';
    if (n >= 1e3) return (n / 1e3).toFixed(n >= 10e3 ? 0 : 1).replace(/\.0$/, '') + 'k';
    return String(n);
  }

  function escapeHtml(s) {
    return String(s || '').replace(/[&<>"']/g, c => (
      { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]
    ));
  }

  // Segurança: só aceita URLs http(s) absolutos para imagens (thumbnails de
  // anúncios, fotos de perfil, avatares de votantes — todos vêm de dados
  // escritos por outros utilizadores e NÃO são validados pelas Firestore Rules).
  // Devolve '' se o URL não for seguro. Aspas são neutralizadas por defesa em
  // profundidade caso o chamador interpole em HTML.
  function safeImgUrl(u) {
    try {
      const url = new URL(String(u));
      if (url.protocol !== 'https:' && url.protocol !== 'http:') return '';
      return url.href.replace(/"/g, '%22');
    } catch {
      return '';
    }
  }

  const Storage = {
    get(keys) {
      return new Promise((resolve) => {
        try {
          chrome.storage.local.get(keys, (res) => resolve(res || {}));
        } catch (e) { resolve({}); }
      });
    },
    set(obj) {
      return new Promise((resolve) => {
        try {
          chrome.storage.local.set(obj, () => resolve());
        } catch (e) { resolve(); }
      });
    }
  };

  // Enums partilhados — single source of truth para strings que aparecem em
  // comparações ===, switch, e validações. Cada novo valor adicionado aqui
  // automaticamente passa nas validações de Object.values(X).includes(...).
  const VOTE_TYPES = Object.freeze({
    LIKE:    'like',
    DISLIKE: 'dislike',
  });

  const BADGE_STATES = Object.freeze({
    RISK:    'RISK',     // vermelho — comunidade marcou como risco
    ALERT:   'ALERT',    // laranja  — análise automática da app detetou sinais (sem comunidade)
    WARNING: 'WARNING',  // amarelo  — sem dados (neutro)
    SAFE:    'SAFE',     // verde
    TRUSTED: 'TRUSTED',  // azul — comunidade confia
  });

  const PHASES = Object.freeze({
    CONTACT:     'contact',
    INTERACTION: 'interaction',
    RESULT:      'result',
  });

  global.NettunoUtils = { formatNumber, escapeHtml, safeImgUrl, Storage, VOTE_TYPES, BADGE_STATES, PHASES };
  // Também expor como globais top-level para callsites mais legíveis
  global.VOTE_TYPES   = VOTE_TYPES;
  global.BADGE_STATES = BADGE_STATES;
  global.PHASES       = PHASES;
})(typeof window !== 'undefined' ? window : globalThis);
