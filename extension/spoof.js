// spoof.js — MAIN world, document_start
// Zero-latency blocking of ALL focus/visibility/blur/mouse-leave detection

(function () {
  let ghost = false;

  const BLOCKED = ['visibilitychange', 'blur', 'focusout', 'pagehide', 'mouseleave', 'mouseout'];
  // We do NOT block 'focus' from firing — we just neutralize what sites do with it
  // But we DO want to suppress focus-return tracking, so we suppress 'focus' on window too
  const BLOCKED_WIN = ['blur', 'focusout', 'pagehide', 'mouseleave', 'mouseout', 'focus'];

  // ── 1. Override Document.prototype ───────────────────────────────────────
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

  // ── 2. Capture-phase blockers — registered FIRST before any page code ────
  function captureBlock(e) {
    if (!ghost) return;
    e.stopImmediatePropagation();
    e.preventDefault();
  }

  // Block on document
  BLOCKED.forEach(type => {
    document.addEventListener(type, captureBlock, { capture: true, passive: false });
  });

  // Block on window (includes focus to hide return-from-elsewhere detection)
  BLOCKED_WIN.forEach(type => {
    window.addEventListener(type, captureBlock, { capture: true, passive: false });
  });

  // ── 3. Wrap addEventListener — drop blocked registrations when ghost on ──
  const _origAdd = EventTarget.prototype.addEventListener;
  EventTarget.prototype.addEventListener = function (type, fn, opts) {
    const allBlocked = [...new Set([...BLOCKED, ...BLOCKED_WIN])];
    if (ghost && allBlocked.includes(type)) return;
    return _origAdd.call(this, type, fn, opts);
  };

  // ── 4. Suppress dispatchEvent ─────────────────────────────────────────────
  const _origDispatch = EventTarget.prototype.dispatchEvent;
  EventTarget.prototype.dispatchEvent = function (evt) {
    const allBlocked = [...new Set([...BLOCKED, ...BLOCKED_WIN])];
    if (ghost && allBlocked.includes(evt.type)) return true;
    return _origDispatch.call(this, evt);
  };

  // ── 5. Suppress all property-based event setters ─────────────────────────
  const allProps = ['onvisibilitychange', 'onpagehide', 'onblur', 'onfocusout', 'onmouseleave', 'onmouseout'];
  allProps.forEach(prop => {
    try {
      Object.defineProperty(document, prop, {
        get() { return null; },
        set(fn) { if (!ghost) _origAdd.call(document, prop.slice(2), fn); },
        configurable: true,
      });
    } catch(e) {}
  });
  ['onblur', 'onfocus', 'onmouseleave', 'onmouseout', 'onfocusout'].forEach(prop => {
    try {
      Object.defineProperty(window, prop, {
        get() { return null; },
        set(fn) { if (!ghost) _origAdd.call(window, prop.slice(2), fn); },
        configurable: true,
      });
    } catch(e) {}
  });

  // ── 6. Freeze document.hasFocus() — always return true when ghost on ─────
  const origHasFocus = Document.prototype.hasFocus;
  Document.prototype.hasFocus = function () {
    if (ghost) return true;
    return origHasFocus.call(this);
  };

  // ── 7. Intercept requestAnimationFrame throttling detection ──────────────
  // Some sites detect tab switching via rAF slowdown (it throttles to 1fps when hidden)
  // We keep rAF running at full speed
  const _origRAF = window.requestAnimationFrame;
  window.requestAnimationFrame = function(cb) {
    if (ghost) {
      // Use setTimeout at 16ms (60fps) to bypass browser throttling when tab is hidden
      return setTimeout(() => cb(performance.now()), 16);
    }
    return _origRAF.call(window, cb);
  };

  // ── 8. Toggle from content.js via CustomEvent ────────────────────────────
  window.addEventListener('__tg_set__', (e) => {
    ghost = !!(e && e.detail && e.detail.on);
    window.__TG_ACTIVE__ = ghost;
    window.dispatchEvent(new CustomEvent('__tg_status__', { detail: { on: ghost } }));
  });

  window.__TG_ACTIVE__ = false;
  window.__TG_READY__ = true;
})();
