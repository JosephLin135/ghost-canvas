// content.js — isolated world
// Floating button with live 4-line event log + zero-latency ghost toggling

(function () {
  'use strict';

  let ghostMode = false;
  let showButton = true;
  let eventLog = []; // last 4 events shown on button

  const CURRENT_HOST = location.hostname;

  // ── Load settings & apply immediately ────────────────────────────────────
  chrome.storage.local.get(['ghostEnabled', 'showButton', 'autoEnableDomains'], (s) => {
    showButton = s.showButton !== false;
    const domains = s.autoEnableDomains || [];
    let enabled = s.ghostEnabled === true;
    if (!enabled && domains.includes(CURRENT_HOST)) {
      enabled = true;
      chrome.storage.local.set({ ghostEnabled: true });
    }
    applyGhost(enabled);
    if (showButton) setupButton(enabled);
  });

  // ── Zero-latency ghost apply ──────────────────────────────────────────────
  function applyGhost(enabled) {
    ghostMode = enabled;
    // queueMicrotask = fastest possible async, before next event loop tick
    queueMicrotask(() => {
      window.dispatchEvent(new CustomEvent('__tg_set__', { detail: { on: enabled } }));
    });
  }

  // ── Listen for popup/options messages ────────────────────────────────────
  chrome.runtime.onMessage.addListener((msg, _sender, reply) => {
    if (msg.type === 'SET_GHOST') {
      applyGhost(msg.on);
      updateButtonState(msg.on);
      reply({ ok: true });
    }
    if (msg.type === 'SET_BUTTON_VISIBLE') {
      showButton = msg.visible;
      const btn = document.getElementById('__tgbtn__');
      if (btn) btn.style.display = msg.visible ? 'flex' : 'none';
      reply({ ok: true });
    }
    if (msg.type === 'GET_STATUS') {
      reply({ ghostMode, host: CURRENT_HOST });
    }
    return true;
  });

  // ── Listen for blocked events coming back from MAIN world ─────────────────
  // spoof.js fires __tg_status__ after each toggle — we use it to add log entries
  window.addEventListener('__tg_status__', (e) => {
    const on = e && e.detail && e.detail.on;
    addLogEntry(on ? '👻 Ghost enabled' : '👁 Ghost disabled', on ? '#a78bfa' : '#888');
  });

  // ── Log blocked events so user sees them on the button ───────────────────
  // We intercept at capture phase AFTER spoof.js to count what got blocked
  ['visibilitychange', 'blur', 'focus', 'mouseleave'].forEach(type => {
    document.addEventListener(type, (e) => {
      if (ghostMode) {
        addLogEntry(`🛡 ${type} blocked`, '#22c55e');
      } else {
        addLogEntry(`⚠ ${type} fired`, '#ef4444');
      }
    }, { capture: false }); // runs AFTER spoof.js capture-phase block
  });

  window.addEventListener('blur', (e) => {
    if (ghostMode) {
      addLogEntry('🛡 window blur blocked', '#22c55e');
    } else {
      addLogEntry('⚠ window blur fired', '#ef4444');
    }
  }, { capture: false });

  function addLogEntry(msg, color) {
    const now = new Date();
    const ts = now.toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' }) +
      '.' + String(now.getMilliseconds()).padStart(3, '0');
    eventLog.unshift({ ts, msg, color });
    if (eventLog.length > 4) eventLog = eventLog.slice(0, 4);
    renderLog();
  }

  // ── Button setup ──────────────────────────────────────────────────────────
  function setupButton(active) {
    if (document.getElementById('__tgbtn__')) { updateButtonState(active); return; }

    const style = document.createElement('style');
    style.id = '__tgstyle__';
    style.textContent = `
      #__tgbtn__ {
        all: initial !important;
        position: fixed !important;
        top: 64px !important;
        right: 14px !important;
        z-index: 2147483647 !important;
        display: flex !important;
        flex-direction: column !important;
        align-items: stretch !important;
        cursor: default !important;
        user-select: none !important;
        border-radius: 12px !important;
        box-shadow: 0 4px 24px rgba(0,0,0,0.55), 0 1px 4px rgba(0,0,0,0.3) !important;
        overflow: hidden !important;
        min-width: 200px !important;
        animation: __tgpop__ .3s cubic-bezier(.34,1.56,.64,1) both !important;
        font-family: 'Segoe UI', system-ui, sans-serif !important;
        transition: box-shadow .2s !important;
      }
      @keyframes __tgpop__ {
        from { opacity:0; transform: scale(.4) translateX(60px); }
        to   { opacity:1; transform: scale(1) translateX(0); }
      }
      #__tgbtn__.on {
        box-shadow: 0 4px 28px rgba(124,58,237,0.45), 0 1px 4px rgba(0,0,0,0.3) !important;
      }

      /* Top toggle row */
      #__tgtop__ {
        display: flex !important;
        align-items: center !important;
        gap: 8px !important;
        padding: 9px 13px !important;
        background: #16162a !important;
        border-bottom: 1px solid rgba(255,255,255,0.06) !important;
        cursor: pointer !important;
        transition: background .15s !important;
      }
      #__tgtop__:hover { background: #1e1e38 !important; }
      #__tgbtn__.on #__tgtop__ {
        background: linear-gradient(135deg, #1a0f50, #2e1070) !important;
        border-bottom-color: rgba(140,90,255,0.2) !important;
      }

      #__tgico__ { font-size: 16px !important; line-height: 1 !important; flex-shrink: 0 !important; }
      #__tgbtn__.on #__tgico__ { animation: __tgfloat__ 2s ease-in-out infinite !important; }
      @keyframes __tgfloat__ { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-3px)} }

      #__tglbl__ {
        flex: 1 !important;
        font-size: 12px !important;
        font-weight: 700 !important;
        color: #bbb !important;
        white-space: nowrap !important;
      }
      #__tgbtn__.on #__tglbl__ { color: #d8b8ff !important; }

      /* Pill indicator */
      #__tgpill__ {
        width: 30px !important; height: 17px !important;
        background: #2a2a3a !important;
        border-radius: 999px !important;
        position: relative !important;
        flex-shrink: 0 !important;
        transition: background .2s !important;
      }
      #__tgpill__::after {
        content: '' !important;
        position: absolute !important;
        width: 11px !important; height: 11px !important;
        background: #555 !important;
        border-radius: 50% !important;
        top: 3px !important; left: 3px !important;
        transition: transform .2s cubic-bezier(.34,1.56,.64,1), background .2s !important;
      }
      #__tgbtn__.on #__tgpill__ { background: #5b21b6 !important; }
      #__tgbtn__.on #__tgpill__::after { transform: translateX(13px) !important; background: #e8d8ff !important; }

      /* Event log area */
      #__tglog__ {
        background: #0c0c18 !important;
        padding: 5px 10px 7px !important;
        display: flex !important;
        flex-direction: column !important;
        gap: 1px !important;
        min-height: 68px !important;
      }

      .tgle {
        display: flex !important;
        align-items: baseline !important;
        gap: 6px !important;
        font-size: 9.5px !important;
        line-height: 1.7 !important;
        font-family: 'Segoe UI', monospace !important;
        opacity: 1 !important;
        animation: __tgfade__ .2s ease !important;
      }
      @keyframes __tgfade__ { from{opacity:0;transform:translateY(-4px)} to{opacity:1;transform:translateY(0)} }

      .tgle-ts {
        color: #2a2a4a !important;
        font-size: 9px !important;
        flex-shrink: 0 !important;
        font-family: 'Courier New', monospace !important;
      }
      .tgle-msg { font-weight: 600 !important; }

      .tgle-empty {
        font-size: 10px !important;
        color: #2a2a3a !important;
        padding: 16px 0 !important;
        text-align: center !important;
        font-style: italic !important;
        width: 100% !important;
      }
    `;

    const btn = document.createElement('div');
    btn.id = '__tgbtn__';
    if (active) btn.classList.add('on');

    btn.innerHTML = `
      <div id="__tgtop__">
        <span id="__tgico__">${active ? '👻' : '👁️'}</span>
        <span id="__tglbl__">${active ? 'Ghost ON' : 'Ghost OFF'}</span>
        <div id="__tgpill__"></div>
      </div>
      <div id="__tglog__">
        <div class="tgle-empty">no events yet…</div>
      </div>
    `;

    // Click top row to toggle
    btn.querySelector('#__tgtop__').addEventListener('click', () => {
      ghostMode = !ghostMode;
      chrome.storage.local.set({ ghostEnabled: ghostMode });
      applyGhost(ghostMode);
      updateButtonState(ghostMode);
      chrome.runtime.sendMessage({ type: 'GHOST_CHANGED', on: ghostMode }).catch(() => {});
    });

    const root = document.body || document.documentElement;
    root.appendChild(style);
    root.appendChild(btn);
  }

  function updateButtonState(active) {
    const btn = document.getElementById('__tgbtn__');
    if (!btn) return;
    btn.classList.toggle('on', active);
    const ico = document.getElementById('__tgico__');
    const lbl = document.getElementById('__tglbl__');
    if (ico) ico.textContent = active ? '👻' : '👁️';
    if (lbl) lbl.textContent = active ? 'Ghost ON' : 'Ghost OFF';
  }

  function renderLog() {
    const logEl = document.getElementById('__tglog__');
    if (!logEl) return;
    if (eventLog.length === 0) {
      logEl.innerHTML = '<div class="tgle-empty">no events yet…</div>';
      return;
    }
    logEl.innerHTML = eventLog.map(e => `
      <div class="tgle">
        <span class="tgle-ts">${e.ts}</span>
        <span class="tgle-msg" style="color:${e.color}!important">${e.msg}</span>
      </div>
    `).join('');
  }

  // Wait for body then inject
  function tryInject() {
    chrome.storage.local.get(['ghostEnabled', 'showButton'], (s) => {
      if (s.showButton !== false) setupButton(s.ghostEnabled === true);
    });
  }

  if (document.body) {
    tryInject();
  } else {
    document.addEventListener('DOMContentLoaded', tryInject);
  }

})();
