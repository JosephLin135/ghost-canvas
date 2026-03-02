// spoof.js — MAIN world, document_start
// Uses capture-phase stopImmediatePropagation for zero-latency blocking

(function () {
  // Read initial state immediately from a flag set by previous navigation
  // (stored on window so it survives across same-tab navigations)
  let ghost = false;

  const BLOCKED = ['visibilitychange', 'blur', 'focusout', 'pagehide'];

  // ── 1. Override Document.prototype properties ─────────────────────────────
  const proto = Document.prototype;
  const origHidden = Object.getOwnPropertyDescriptor(proto, 'hidden');
  const origVis    = Object.getOwnPropertyDescriptor(proto, 'visibilityState');

  Object.defineProperty(proto, 'hidden', {
    get() { return ghost ? false : (origHidden ? origHidden.get.call(this) : false); },
    configurable: true,
  });
  Object.defineProperty(proto, 'visibilityState', {
    get() { return ghost ? 'visible' : (origVis ? origVis.get.call(this) : 'visible'); },
    configurable: true,
  });

  // ── 2. Capture-phase blocker — registered FIRST, blocks all other handlers ─
  function captureBlock(e) {
    if (ghost) {
      e.stopImmediatePropagation();
      e.preventDefault();
    }
  }

  BLOCKED.forEach(type => {
    document.addEventListener(type, captureBlock, { capture: true, passive: false });
    window.addEventListener(type, captureBlock, { capture: true, passive: false });
  });

  // ── 3. Wrap addEventListener to suppress registration when ghost is on ────
  const _origAdd = EventTarget.prototype.addEventListener;
  EventTarget.prototype.addEventListener = function (type, fn, opts) {
    if (ghost && BLOCKED.includes(type)) return; // drop silently
    return _origAdd.call(this, type, fn, opts);
  };

  // ── 4. Suppress dispatchEvent ─────────────────────────────────────────────
  const _origDispatch = EventTarget.prototype.dispatchEvent;
  EventTarget.prototype.dispatchEvent = function (evt) {
    if (ghost && BLOCKED.includes(evt.type)) return true;
    return _origDispatch.call(this, evt);
  };

  // ── 5. Suppress property setters ─────────────────────────────────────────
  ['onvisibilitychange', 'onpagehide'].forEach(prop => {
    Object.defineProperty(document, prop, {
      get() { return null; },
      set(fn) { if (!ghost) _origAdd.call(document, prop.slice(2), fn); },
      configurable: true,
    });
  });
  Object.defineProperty(window, 'onblur', {
    get() { return null; },
    set(fn) { if (!ghost) _origAdd.call(window, 'blur', fn); },
    configurable: true,
  });

  // ── 6. Toggle handler from content.js ────────────────────────────────────
  // Using a unique event name to avoid conflicts
  window.addEventListener('__tg_set__', (e) => {
    ghost = !!(e && e.detail && e.detail.on);
    window.__TG_ACTIVE__ = ghost;
    // Broadcast back so test page can react
    window.dispatchEvent(new CustomEvent('__tg_status__', { detail: { on: ghost } }));
  });

  // ── 7. Also intercept History API to prevent tab-hidden detection via nav ─
  const _origPushState = history.pushState.bind(history);
  const _origReplaceState = history.replaceState.bind(history);
  // (just ensuring these still work normally — placeholder for future routing intercept)

  window.__TG_ACTIVE__ = false;
  window.__TG_READY__ = true;
})();
