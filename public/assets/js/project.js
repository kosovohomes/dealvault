(() => {
  const { $, api, esc, fmtDate, statusLabel } = window.DVApp;
  const slug = (location.pathname.match(/^\/projects\/([a-z0-9-]+)\/?$/) || [])[1] || '';

  const REQUEST_ACTIONS = {
    null_key: { label: 'Express interest', hint: 'Creates an access request for this project. The operator reviews it after you sign the agreement.' },
    nda_pending: { label: 'Sign the agreement', hint: 'Your request is recorded. Sign the confidentiality agreement to move it into the review queue.', href: '/nda?project=SLUG' },
    nda_signed: { hint: 'Signed and in the queue. The operator reviews requests for this project and opens the room on approval — usually within one business day.' },
    approved: { label: 'Open the data room', hint: 'You are approved for this project. The room is watermarked to you and every action is recorded.', href: '/room/SLUG' },
    rejected: { hint: 'The operator declined this request. If you believe that is an error, write to the platform team.' },
    revoked: { hint: 'Access to this project was withdrawn. The record of what you read remains on your account.' },
  };

  function actionHtml(status, slugValue) {
    const action = REQUEST_ACTIONS[status || 'null_key'];
    if (!action) return '';
    let button = '';
    if (action.label) {
      const href = (action.href || '').replace('SLUG', slugValue);
      if (href) button = `<a class="cp-btn cp-btn--primary" href="${esc(href)}">${esc(action.label)}</a>`;
      else button = `<button class="cp-btn cp-btn--primary" type="button" id="interestBtn">${esc(action.label)}</button>`;
    }
    return `
      ${button}
      <p style="margin:.7rem 0 0;font-size:.78rem;line-height:1.55;color:var(--muted)">${esc(action.hint || '')}</p>`;
  }

  function paintRequest(status, slugValue) {
    const box = $('#requestState');
    const badge = status ? `<span class="cp-badge cp-badge--${esc(status)}">${esc(statusLabel(status))}</span>` : '';
    box.innerHTML = `
      ${badge}
      ${actionHtml(status, slugValue)}
    `;
    const interestBtn = $('#interestBtn');
    if (interestBtn) {
      interestBtn.addEventListener('click', async () => {
        interestBtn.disabled = true;
        interestBtn.textContent = 'Recording…';
        try {
          const data = await api(`/api/projects/${slugValue}/interest`, { method: 'POST' });
          if (data.ndaSigned) {
            window.location.reload();
          } else {
            location.href = data.next || `/nda?project=${encodeURIComponent(slugValue)}`;
          }
        } catch (error) {
          if (error.status === 409 && error.data && error.data.request) {
            window.location.reload();
            return;
          }
          interestBtn.disabled = false;
          interestBtn.textContent = 'Express interest';
          if (error.status === 403) {
            location.href = '/nda?project=' + encodeURIComponent(slugValue);
            return;
          }
          alert(error.message || 'Could not record the interest.');
        }
      });
    }
  }

  async function load() {
    if (!slug) { location.href = '/projects'; return; }
    try {
      const data = await api(`/api/projects/${slug}`);
      const project = data.project;
      document.title = `${project.title} — DealVault`;
      $('#crumbTitle').textContent = project.title;
      $('#briefSector').textContent = project.sector;
      $('#briefUpdated').textContent = `Brief updated ${fmtDate(project.updated)}`;
      $('#briefTitle').textContent = project.title;
      $('#briefTagline').textContent = project.tagline;
      $('#briefMeta').innerHTML = `
        <span class="cp-tag">Stage <strong style="color:var(--ink)">${esc(project.stage)}</strong></span>
        <span class="cp-tag">Geography <strong style="color:var(--ink)">${esc(project.geography)}</strong></span>
        <span class="cp-tag">Raising <strong style="color:var(--ink)">${esc(project.ticket)}</strong></span>
        <span class="cp-tag">${project.documents.length ? `${project.documents.length} confidential documents` : 'Data room in preparation'}</span>`;
      $('#briefStory').innerHTML = project.story.map((paragraph) => `<p>${esc(paragraph)}</p>`).join('');
      $('#briefKv').innerHTML = `
        <div><dt>Status</dt><dd>${esc(project.status === 'open' ? 'Open for interest' : 'Coming soon')}</dd></div>
        <div><dt>Raise</dt><dd>${esc(project.ticket)}</dd></div>
        <div><dt>Documents</dt><dd>${project.documents.length} under NDA</dd></div>
        <div><dt>Pages</dt><dd>${project.documents.reduce((sum, doc) => sum + doc.pages, 0)}</dd></div>
        <div><dt>Updated</dt><dd>${fmtDate(project.updated)}</dd></div>`;
      $('#briefHighlights').innerHTML = project.highlights.map((item) => `<li>${esc(item)}</li>`).join('');
      $('#docPreview').innerHTML = project.documents
        .map((doc) => `<li>${esc(doc.title)} <span style="color:var(--muted)">· ${doc.pages} pages · v${esc(doc.version)}</span></li>`)
        .join('');
      $('#briefMetrics').innerHTML = project.metrics
        .map((metric) => `<div><dt>${esc(metric.value)}</dt><dd>${esc(metric.label)}${metric.note ? ` · ${esc(metric.note)}` : ''}</dd></div>`)
        .join('');
      paintRequest(data.request ? data.request.status : null, slug);
    } catch (error) {
      if (error.status === 401) { location.href = `/login?next=${encodeURIComponent(location.pathname)}`; return; }
      if (error.status === 403) { location.href = '/verify'; return; }
      $('#briefTitle').textContent = 'This brief could not be loaded';
      $('#briefStory').innerHTML = `<p>${esc(error.message || 'Refresh the page to try again.')}</p>`;
    }
  }

  load();
})();
