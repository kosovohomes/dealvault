(() => {
  const { $, $$, api, esc, toast, download } = window.DVApp;
  const match = location.pathname.match(/^\/room\/([a-z0-9-]+)\/([a-z0-9-]+)\/?$/);
  const projectSlug = match ? match[1] : '';
  const docSlug = match ? match[2] : '';
  const state = { doc: null, reviewed: false, seen: new Set() };

  function paintWatermark(watermark) {
    const mark = `${watermark.name} · ${watermark.email} · ${watermark.receipt}`;
    $('#watermarkLayer').innerHTML = Array.from({ length: 18 }, () => `<span>${esc(mark)}</span>`).join('');
  }

  function paintToc(doc) {
    $('#tocList').innerHTML = doc.sections
      .map((section, index) => `
        <a class="cp-toc-link" href="#s-${esc(section.id)}" data-toc="${esc(section.id)}">
          <span>${String(index + 1).padStart(2, '0')}</span>${esc(section.title.replace(/^\d+\.\s*/, ''))}
        </a>`)
      .join('');
  }

  function paintSections(doc) {
    const host = $('#docSections');
    host.innerHTML = doc.sections
      .map((section) => `
        <section class="cp-doc-section" id="s-${esc(section.id)}" data-section-id="${esc(section.id)}">
          <h2>${esc(section.title)}</h2>
          ${section.html}
        </section>`)
      .join('');
    $('#docEnd').hidden = false;
    if (window.DV) window.DV.observeSections(host);
  }

  function paintReview() {
    $$('[data-review]').forEach((button) => {
      button.disabled = state.reviewed;
      const label = button.querySelector('span');
      if (label) label.textContent = state.reviewed ? 'Reviewed' : 'Mark reviewed';
    });
  }

  function paintProgress() {
    const total = state.doc ? state.doc.sections.length : 0;
    $('#railSections').textContent = `${state.seen.size} / ${total}`;
  }

  function updateReadingBar() {
    const main = $('.cp-reader__main');
    if (!main) return;
    const rect = main.getBoundingClientRect();
    const total = Math.max(1, rect.height - window.innerHeight);
    const value = Math.max(0, Math.min(1, -rect.top / total));
    $('#readingBar').style.width = `${Math.round(value * 100)}%`;
  }

  function initTocObserver() {
    if (!('IntersectionObserver' in window)) return;
    const links = new Map($$('[data-toc]').map((link) => [link.dataset.toc, link]));
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          const id = entry.target.dataset.sectionId;
          links.forEach((link) => link.classList.remove('is-active'));
          const link = links.get(id);
          if (link) link.classList.add('is-active');
          if (!state.seen.has(id)) {
            state.seen.add(id);
            paintProgress();
          }
        }
      },
      { rootMargin: '-15% 0px -55% 0px', threshold: 0 },
    );
    $$('.cp-doc-section').forEach((section) => observer.observe(section));
  }

  async function load() {
    if (!projectSlug || !docSlug) { location.href = '/projects'; return; }
    try {
      const data = await api(`/api/documents/${projectSlug}/${docSlug}`);
      state.doc = data.doc;
      state.reviewed = Boolean(data.progress && data.progress.reviewed);
      const doc = data.doc;

      document.title = `${doc.title} — DealVault`;
      $('#crumbRoom').textContent = data.project.title;
      $('#crumbRoom').href = `/room/${projectSlug}`;
      $('#roomLink').href = `/room/${projectSlug}`;
      $('#crumbDoc').textContent = doc.title;
      $('#docCategory').textContent = `${doc.category} · ${doc.sensitivity}`;
      $('#docTitle').textContent = doc.title;
      $('#docSubtitle').textContent = doc.subtitle;
      $('#docMeta').innerHTML = `
        <span class="cp-tag">Version <strong style="color:var(--ink)">${esc(doc.version)}</strong></span>
        <span class="cp-tag">Updated <strong style="color:var(--ink)">${esc(doc.updated)}</strong></span>
        <span class="cp-tag"><strong style="color:var(--ink)">${doc.pages}</strong> pages</span>
        <span class="cp-tag"><strong style="color:var(--ink)">${doc.minutes}</strong> min read</span>`;
      $('#docAudit').textContent = `Issued to ${data.watermark.name} (${data.watermark.email}). Receipt ${data.watermark.receipt}; watermark ${data.watermark.hash}. Opens, downloads and prints are recorded against this receipt. Figures are illustrative planning cases, not an offer of securities.`;
      $('#railName').textContent = data.watermark.name;
      $('#railReceipt').textContent = data.watermark.receipt;
      $('#railHash').textContent = data.watermark.hash;
      $('#railSections').textContent = `0 / ${doc.sections.length}`;

      paintWatermark(data.watermark);
      paintToc(doc);
      paintSections(doc);
      paintReview();
      paintProgress();
      initTocObserver();
      updateReadingBar();

      if (window.DV) {
        window.DV.setDoc(projectSlug, docSlug);
        window.DV.track('doc_open', { meta: { title: doc.title, version: doc.version } });
      }
    } catch (error) {
      if (error.status === 401) { location.href = `/login?next=${encodeURIComponent(location.pathname)}`; return; }
      if (error.status === 403) { location.href = `/projects/${projectSlug}`; return; }
      $('#docTitle').textContent = 'This document could not be opened';
      $('#docSections').innerHTML = `<div class="cp-vault-empty">${esc(error.message || 'Return to the project room.')}</div>`;
    }
  }

  $$('[data-review]').forEach((button) => button.addEventListener('click', async () => {
    if (!state.doc || state.reviewed) return;
    button.disabled = true;
    try {
      await api(`/api/documents/${projectSlug}/${docSlug}/review`, { method: 'POST' });
      state.reviewed = true;
      paintReview();
      toast('Marked reviewed. Your record has been updated.');
    } catch (error) {
      toast(error.message || 'Could not mark the document reviewed.', 'error');
      button.disabled = false;
    }
  }));

  $$('[data-download]').forEach((button) => button.addEventListener('click', async () => {
    if (!state.doc) return;
    try {
      toast('Preparing your watermarked copy…');
      const name = await download(`/api/documents/${projectSlug}/${docSlug}/download`, { method: 'POST', fallbackName: `DealVault-${docSlug}.html` });
      toast(`Downloaded ${name}. The download is recorded.`);
    } catch (error) {
      toast(error.message || 'The copy could not be downloaded.', 'error');
    }
  }));

  $$('[data-print]').forEach((button) => button.addEventListener('click', () => {
    api(`/api/documents/${projectSlug}/${docSlug}/print`, { method: 'POST' }).catch(() => {});
    window.print();
  }));

  let ticking = false;
  window.addEventListener('scroll', () => {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(() => { updateReadingBar(); ticking = false; });
  }, { passive: true });

  window.addEventListener('pagehide', () => {
    if (!state.doc || !window.DV) return;
    window.DV.track('doc_close', { value: Math.round(window.DV.activeMs || 0), meta: { sections: state.seen.size, reviewed: state.reviewed } });
    window.DV.flush();
  });

  load();
})();
