/*
 * Reading tracker — first-party, sent to /api/track.
 * The server rejects every document event without a verified session, so
 * anonymous visitors cannot pollute the record.
 */
(() => {
  const state = {
    doc: '',
    project: '',
    activeMs: 0,
    lastActive: Date.now(),
    lastBeat: 0,
    maxScroll: 0,
    queue: [],
    sessionMark: null,
  };

  const path = window.location.pathname;
  const roomMatch = path.match(/^\/room\/([a-z0-9-]+)\/([a-z0-9-]+)\/?$/);
  if (roomMatch) {
    state.project = roomMatch[1];
    state.doc = roomMatch[2];
  } else {
    return; /* only the document reader is tracked */
  }

  function session() {
    if (!state.sessionMark) {
      state.sessionMark = Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
    }
    return state.sessionMark;
  }

  function track(name, extra = {}) {
    state.queue.push({
      name,
      project: state.project,
      doc: state.doc,
      path,
      value: extra.value || 0,
      section: extra.section || '',
      meta: extra.meta || null,
    });
    if (state.queue.length >= 6) flush();
  }

  let flushing = false;
  function flush() {
    if (flushing || !state.queue.length) return;
    flushing = true;
    const events = state.queue.splice(0, 20);
    const payload = JSON.stringify({ events, session: session() });
    fetch('/api/track', {
      method: 'POST',
      credentials: 'same-origin',
      headers: { 'Content-Type': 'application/json' },
      body: payload,
      keepalive: true,
    })
      .catch(() => { /* the record is best-effort on close */ })
      .finally(() => { flushing = false; });
  }

  /* active-time heartbeat: only while visible and recently interacted */
  let lastInteraction = Date.now();
  ['pointerdown', 'keydown', 'wheel', 'touchstart', 'scroll'].forEach((name) => {
    window.addEventListener(name, () => { lastInteraction = Date.now(); }, { passive: true });
  });

  setInterval(() => {
    const now = Date.now();
    const visible = document.visibilityState === 'visible';
    const engaged = now - lastInteraction < 90000;
    if (visible && engaged) {
      const since = now - state.lastActive;
      if (since > 0) {
        state.activeMs += since;
        if (now - state.lastBeat > 15000) {
          state.lastBeat = now;
          track('heartbeat', { value: Math.round(since), meta: { activeMs: Math.round(state.activeMs) } });
        }
      }
    }
    state.lastActive = visible && engaged ? now : state.lastActive;
  }, 5000);

  /* section dwell via IntersectionObserver */
  function observeSections(host) {
    if (!('IntersectionObserver' in window) || !host) return;
    const seen = new Set();
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          const id = entry.target.dataset.sectionId || entry.target.id;
          if (!id || seen.has(id)) return;
          seen.add(id);
          entry.target.dataset.seenAt = String(Date.now());
          entry.target.__dwellStart = Date.now();
        });
      },
      { rootMargin: '-15% 0px -55% 0px', threshold: 0 },
    );
    host.querySelectorAll('[data-section-id]').forEach((section) => observer.observe(section));
    /* confirm dwell ≥ 2.5s on exit */
    const dwell = new MutationObserver(() => {});
    window.addEventListener('scroll', () => {
      host.querySelectorAll('[data-section-id][__dwell-start], [data-section-id]').forEach((section) => {
        if (!section.__dwellStart || section.__counted) return;
        const rect = section.getBoundingClientRect();
        if (rect.top > window.innerHeight * 0.9) {
          section.__counted = true;
          const ms = Date.now() - section.__dwellStart;
          if (ms >= 2500) track('section_dwell', { section: section.dataset.sectionId, value: Math.round(ms) });
        }
      });
    }, { passive: true });
    void dwell;
  }

  /* scroll depth milestones */
  window.addEventListener('scroll', () => {
    const doc = document.documentElement;
    const total = Math.max(1, doc.scrollHeight - window.innerHeight);
    const pct = Math.min(100, Math.round((window.scrollY / total) * 100));
    if (pct > state.maxScroll) {
      const before = state.maxScroll;
      state.maxScroll = pct;
      if (pct - before >= 25 && pct >= 50) track('scroll_depth', { value: pct });
    }
  }, { passive: true });

  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') flush();
  });
  window.addEventListener('pagehide', () => {
    track('doc_close', { value: Math.round(state.activeMs), meta: { maxScroll: state.maxScroll } });
    flush();
  });

  window.DV = {
    setDoc: (project, doc) => { state.project = project; state.doc = doc; },
    track,
    flush,
    observeSections,
    get activeMs() { return state.activeMs; },
  };
})();
