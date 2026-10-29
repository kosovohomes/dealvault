(() => {
  const { $, api, esc, fmtDate, fmtDateTime, relative } = window.DVApp;
  const slug = (location.pathname.match(/^\/room\/([a-z0-9-]+)\/?$/) || [])[1] || '';

  function docRow(doc) {
    const total = doc.sections.length || 1;
    const coverage = Math.min(100, Math.round(((doc.sectionsSeen || 0) / total) * 100));
    const state = doc.reviewed
      ? '<span class="cp-room-item__state">Reviewed</span>'
      : doc.opened
        ? `<span class="cp-room-item__state">In progress</span><div class="cp-progress"><span style="width:${coverage}%"></span></div>`
        : '<span class="cp-room-item__state cp-room-item__state--new">Not opened</span>';
    return `
      <a class="cp-room-item" href="/room/${esc(slug)}/${esc(doc.slug)}">
        <div class="cp-room-item__main">
          <p class="cp-room-item__cat">${esc(doc.category)} · ${esc(doc.sensitivity)}</p>
          <h3>${esc(doc.title)}</h3>
          <p class="cp-room-item__sub">${esc(doc.subtitle)}</p>
          <div class="cp-room-item__stats">
            <span>v${esc(doc.version)}</span>
            <span>${doc.pages} pages</span>
            <span>${doc.minutes} min read</span>
            ${doc.downloads ? `<span>${doc.downloads} download${doc.downloads === 1 ? '' : 's'}</span>` : ''}
            ${doc.prints ? `<span>${doc.prints} print${doc.prints === 1 ? '' : 's'}</span>` : ''}
            ${doc.lastAt ? `<span>last opened ${esc(relative(doc.lastAt))}</span>` : ''}
          </div>
        </div>
        <div class="cp-room-item__side">
          ${state}
          <span class="cp-room-item__go"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" aria-hidden="true"><path d="M4 12h15M13 6l6 6-6 6"/></svg></span>
        </div>
      </a>`;
  }

  function paintQuestions(questions) {
    const host = $('#questionList');
    if (!questions || !questions.length) {
      host.innerHTML = '<p style="margin:0;font-size:.78rem;color:var(--muted)">No questions yet. Your thread with the owners starts here.</p>';
      return;
    }
    host.innerHTML = questions
      .map((question) => `
        <div style="border-top:1px solid var(--line);padding:.8rem 0">
          <p style="margin:0 0 .2rem;font-size:.66rem;letter-spacing:.1em;text-transform:uppercase;color:var(--muted)">${esc(fmtDateTime(question.createdAt))}${question.docSlug ? ` · on ${esc(question.docSlug)}` : ''} · ${esc(question.status)}</p>
          <p style="margin:0 0 .4rem;font-size:.86rem;color:var(--ink)">${esc(question.body)}</p>
          ${question.reply ? `<p style="margin:0;font-size:.82rem;color:var(--ink-soft)"><strong style="color:var(--green)">Owner:</strong> ${esc(question.reply)}</p>` : '<p style="margin:0;font-size:.76rem;color:var(--muted);font-style:italic">Awaiting the owners\u2019 reply.</p>'}
        </div>`)
      .join('');
  }

  async function load() {
    if (!slug) { location.href = '/projects'; return; }
    try {
      const data = await api(`/api/room/${slug}`);
      document.title = `${data.project.title} room — DealVault`;
      $('#crumbProject').textContent = data.project.title;
      $('#roomTitle').textContent = data.project.title;
      $('#roomTagline').textContent = data.project.tagline;
      $('#roomReceipt').textContent = `Receipt ${data.request.receipt || '—'} · approved ${data.request.approvedAt ? fmtDate(data.request.approvedAt) : '—'}`;
      $('#roomTotals').textContent = `${data.totals.documents} documents · ${data.totals.pages} pages · ${data.totals.minutes} min`;
      $('#roomStats').innerHTML = `
        <div><dt>${data.totals.documents}</dt><dd>Documents</dd></div>
        <div><dt>${data.totals.opened}</dt><dd>Opened</dd></div>
        <div><dt>${data.totals.reviewed}</dt><dd>Reviewed</dd></div>
        <div><dt>${data.totals.pages}</dt><dd>Pages</dd></div>`;
      $('#docList').innerHTML = data.docs.map(docRow).join('');
      paintQuestions(data.questions);
    } catch (error) {
      if (error.status === 401) { location.href = `/login?next=${encodeURIComponent(location.pathname)}`; return; }
      if (error.status === 403) { location.href = `/projects/${slug}`; return; }
      $('#docList').innerHTML = `<div class="cp-vault-empty">${esc(error.message || 'The room could not open.')}</div>`;
    }
  }

  $('#questionForm').addEventListener('submit', async (event) => {
    event.preventDefault();
    const input = $('#questionBody');
    const text = input.value.trim();
    const status = $('#questionStatus');
    if (text.length < 12) {
      status.textContent = 'Please add a little more detail.';
      status.className = 'cp-form-status is-error';
      return;
    }
    const button = $('#questionBtn');
    button.disabled = true;
    button.textContent = 'Sending…';
    try {
      const data = await api('/api/questions', { method: 'POST', body: { question: text, project: slug } });
      input.value = '';
      status.textContent = 'Question sent. Answers appear here.';
      status.className = 'cp-form-status is-ok';
      const list = document.querySelector('#questionList');
      if (list) {
        const questions = await api(`/api/room/${slug}`);
        paintQuestions(questions.questions);
      }
    } catch (error) {
      status.textContent = error.message || 'The question could not be sent.';
      status.className = 'cp-form-status is-error';
    } finally {
      button.disabled = false;
      button.textContent = 'Send the question';
    }
  });

  load();
})();
