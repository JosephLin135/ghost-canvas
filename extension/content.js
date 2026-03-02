// content.js — isolated world
// Handles UI button, storage sync, and fast ghost toggling

(function () {
  'use strict';

  let ghostMode = false;
  let showButton = true;
  let autoEnableDomains = [];

  const CURRENT_HOST = location.hostname;

  // ── Load all settings at once ─────────────────────────────────────────────
  chrome.storage.local.get(['ghostEnabled', 'showButton', 'autoEnableDomains'], (s) => {
    showButton = s.showButton !== false; // default true
    autoEnableDomains = s.autoEnableDomains || [];

    // Auto-enable if this domain is in the list
    let enabled = s.ghostEnabled === true;
    if (!enabled && autoEnableDomains.includes(CURRENT_HOST)) {
      enabled = true;
      chrome.storage.local.set({ ghostEnabled: true });
    }

    applyGhost(enabled);
    if (showButton) injectButton(enabled);
  });

  // ── Apply ghost state — dispatch to MAIN world immediately ────────────────
  function applyGhost(enabled) {
    ghostMode = enabled;
    // Use queueMicrotask for zero-delay dispatch
    queueMicrotask(() => {
      window.dispatchEvent(new CustomEvent('__tg_set__', { detail: { on: enabled } }));
    });
  }

  // ── Listen for messages from popup / options ──────────────────────────────
  chrome.runtime.onMessage.addListener((msg, _sender, reply) => {
    if (msg.type === 'SET_GHOST') {
      applyGhost(msg.on);
      updateButton(msg.on);
      reply({ ok: true });
    }
    if (msg.type === 'SET_BUTTON_VISIBLE') {
      showButton = msg.visible;
      const btn = document.getElementById('__tgbtn__');
      if (btn) btn.style.display = msg.visible ? 'block' : 'none';
      reply({ ok: true });
    }
    if (msg.type === 'GET_STATUS') {
      reply({ ghostMode, host: CURRENT_HOST });
    }
    return true;
  });

  // ── Floating button ───────────────────────────────────────────────────────
  function injectButton(active) {
    if (document.getElementById('__tgbtn__')) { updateButton(active); return; }

    const style = document.createElement('style');
    style.textContent = `
      #__tgbtn__ {
        all:initial!important;
        position:fixed!important;
        top:68px!important;
        right:14px!important;
        z-index:2147483647!important;
        cursor:pointer!important;
        user-select:none!important;
        display:block!important;
        border-radius:999px!important;
        box-shadow:0 4px 20px rgba(0,0,0,0.5)!important;
        transition:transform .18s cubic-bezier(.34,1.56,.64,1),box-shadow .18s!important;
        animation:__tgpop__ .3s cubic-bezier(.34,1.56,.64,1) both!important;
      }
      @keyframes __tgpop__ {
        from{opacity:0;transform:scale(.3) translateX(50px)}
        to{opacity:1;transform:scale(1) translateX(0)}
      }
      #__tgbtn__:hover{transform:scale(1.1)!important;box-shadow:0 6px 28px rgba(0,0,0,0.6)!important}
      #__tgbtn__:active{transform:scale(.93)!important}
      #__tgin__{
        display:flex!important;align-items:center!important;gap:6px!important;
        padding:8px 14px 8px 11px!important;border-radius:999px!important;
        font-family:'Segoe UI',system-ui,sans-serif!important;
        font-size:12px!important;font-weight:700!important;
        background:#18182a!important;border:1.5px solid rgba(255,255,255,0.08)!important;
        color:#bbb!important;transition:background .2s,color .2s,border-color .2s!important;
        white-space:nowrap!important;
      }
      #__tgbtn__.on #__tgin__{
        background:linear-gradient(135deg,#1a0f5c,#3d1a8a)!important;
        border-color:rgba(140,90,255,0.7)!important;color:#e8d8ff!important;
      }
      #__tgico__{font-size:15px!important;display:inline-block!important;line-height:1!important}
      #__tgbtn__.on #__tgico__{animation:__tgfloat__ 2s ease-in-out infinite!important}
      @keyframes __tgfloat__{0%,100%{transform:translateY(0)}50%{transform:translateY(-3px)}}
    `;

    const btn = document.createElement('div');
    btn.id = '__tgbtn__';
    if (active) btn.classList.add('on');
    btn.innerHTML = `<div id="__tgin__"><span id="__tgico__">${active ? '👻' : '👁️'}</span><span id="__tglbl__">${active ? 'Ghost ON' : 'Ghost OFF'}</span></div>`;

    btn.addEventListener('click', () => {
      ghostMode = !ghostMode;
      chrome.storage.local.set({ ghostEnabled: ghostMode });
      applyGhost(ghostMode);
      updateButton(ghostMode);
      // Notify popup if open
      chrome.runtime.sendMessage({ type: 'GHOST_CHANGED', on: ghostMode }).catch(() => {});
    });

    const root = document.body || document.documentElement;
    root.appendChild(style);
    root.appendChild(btn);
  }

  function updateButton(active) {
    const btn = document.getElementById('__tgbtn__');
    if (!btn) return;
    btn.classList.toggle('on', active);
    const ico = document.getElementById('__tgico__');
    const lbl = document.getElementById('__tglbl__');
    if (ico) ico.textContent = active ? '👻' : '👁️';
    if (lbl) lbl.textContent = active ? 'Ghost ON' : 'Ghost OFF';
  }

  // Inject button after DOM ready
  if (document.body) {
    chrome.storage.local.get(['ghostEnabled', 'showButton'], (s) => {
      if (s.showButton !== false) injectButton(s.ghostEnabled === true);
    });
  } else {
    document.addEventListener('DOMContentLoaded', () => {
      chrome.storage.local.get(['ghostEnabled', 'showButton'], (s) => {
        if (s.showButton !== false) injectButton(s.ghostEnabled === true);
      });
    });
  }
})();
