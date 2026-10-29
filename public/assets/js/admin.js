(() => {
  const { $, $$, api, esc, fmtDate, fmtDateTime, relative, statusLabel, setStatus, toast } = window.DVApp;
  const loginView = $('#loginView');
  const consoleView = $('#consoleView');
  let activeTab = 'overview';
  let loadedTabs = new Set();

  /* ------------------------------ auth ------------------------------ */

  $('#loginForm').addEventListener('submit', async (event) => {
    event.preventDefault();
    const status = $('#loginStatus');
    const button = event.target.querySelector('button[type="submit"]');
    button.disabled = true;
    try {
      await api('/api/admin/login', { method: 'POST', body: { key: $('#adminKey').value } });
      openConsole();
    } catch (error) {
      setStatus(status, error.message || 'That key was not accepted.', 'error');
    } finally {
      button.disabled = false;
    }
  });

  $('#adminSignout').addEventListener('click', async () => {
    await api('/api/admin/logout', { method: 'POST' }).catch(() => {});
    location.reload();
  });

  async function openConsole() {
    loginView.hidden = true;
    consoleView.hidden = false;
    $('#adminSignout').hidden = false;
    await loadTab('overview', true);
    $$('[data-count]');
  }

  /* ------------------------------ tabs ------------------------------ */

  $$('.cp-tabbar button').forEach((button) => {
    button.addEventListener('click', () => {
      activeTab = button.dataset.tab;
      $$('.cp-tabbar button').forEach((other) => other.classList.toggle('is-active', other === button));
      $$('[data-panel]').forEach((panel) => { panel.hidden = panel.dataset.panel !== activeTab; });
      loadTab(activeTab);
    });
  });

  async function loadTab(tab, force = false) {
    if (loadedTabs.has(tab) && !force) return;
    loadedTabs.add(tab);
    try {
      if (tab === 'overview') await paintOverview();
      if (tab === 'requests') await paintRequests();
      if (tab === 'investors') await paintInvestors();
      if (tab === 'projects') await paintProjects();
      if (tab === 'audit') await paintAudit();
    } catch (error) {
      if (error.status === 401) { loginView.hidden = false; consoleView.hidden = true; }
      else toast(error.message || 'Could not load the panel.', 'error');
    }
  }

  /* ---------------------------- overview ---------------------------- */

  async function paintOverview() {
    const data = await api('/api/admin/overview');
    $('#consoleCatalogue').textContent = `${data.catalogue.projects} projects · ${data.catalogue.documents} documents · ${data.catalogue.pages} pages`;
    $('#overviewStats').innerHTML = `
      <div><dt>${data.users.total}</dt><dd>Investors</dd></div>
      <div><dt>${data.users.verified}</dt><dd>Verified</dd></div>
      <div><dt>${data.users.ndaSigned}</dt><dd>NDA signed</dd></div>
      <div><dt>${data.requests.nda_pending}</dt><dd>NDA to sign</dd></div>
      <div><dt>${data.requests.nda_signed}</dt><dd>Awaiting review</dd></div>
      <div><dt>${data.requests.approved}</dt><dd>Approved</dd></div>`;
    $('#overviewActivity').innerHTML = (data.recent || [])
      .map((row) => `
        <tr>
          <td class="is-mono">${esc(relative(row.at))}</td>
          <td><strong>${esc(row.label)}</strong></td>
          <td>${row.userId ? esc(row.userId.replace('inv_seed_', 'seed-').replace('inv_', '')) : '—'}</td>
          <td>${esc(row.project || row.doc || row.email || row.ip || '—')}</td>
        </tr>`)
      .join('');
    $('#overviewInterest').innerHTML = Object.entries(data.projectInterest)
      .map(([project, count]) => `<div><dt>${esc(project)}</dt><dd>${count} request${count === 1 ? '' : 's'}</dd></div>`)
      .join('') || '<div><dt>—</dt><dd>No interest yet</dd></div>';
  }

  /* ---------------------------- requests ---------------------------- */

  async function paintRequests() {
    const data = await api('/api/admin/requests');
    const pending = data.requests.filter((request) => request.status === 'nda_signed').length;
    const tabButton = document.querySelector('[data-tab="requests"]');
    if (tabButton) tabButton.dataset.count = String(pending);

    $('#requestsBody').innerHTML = data.requests
      .map((request) => {
        const user = request.user || {};
        const pendingRow = request.status === 'nda_signed';
        return `
        <tr>
          <td><strong>${esc(user.name || '—')}</strong><br><span class="is-mono">${esc(user.email || '')}</span><br><span style="color:var(--muted)">${esc(user.firm || '')} · ${esc(user.country || '')}</span></td>
          <td>${esc(request.projectTitle)}</td>
          <td><span class="cp-badge cp-badge--${esc(request.status)}">${esc(statusLabel(request.status))}</span></td>
          <td class="is-mono">${esc(fmtDate(request.createdAt))}</td>
          <td>
            ${pendingRow ? `
              <div class="cp-table__actions">
                <button class="cp-btn cp-btn--primary cp-btn--sm" type="button" data-decide="approved" data-request="${esc(request.id)}">Approve</button>
                <button class="cp-btn cp-btn--ghost cp-btn--sm" type="button" data-decide="rejected" data-request="${esc(request.id)}">Reject</button>
              </div>
              <input type="text" placeholder="Decision note (optional)" data-note="${esc(request.id)}" style="margin-top:.5rem;width:100%;border:1px solid var(--line-strong);padding:.4rem .55rem;font-size:.76rem">`
            : `<span style="font-size:.74rem;color:var(--muted)">${esc(request.decisionNote || '')}</span>`}
          </td>
        </tr>`;
      })
      .join('');

    $$('[data-decide]').forEach((button) => {
      button.addEventListener('click', async () => {
        const id = button.dataset.request;
        const decision = button.dataset.decide;
        const noteInput = document.querySelector(`[data-note="${id}"]`);
        button.disabled = true;
        try {
          await api(`/api/admin/requests/${encodeURIComponent(id)}/decision`, {
            method: 'POST',
            body: { decision, note: noteInput ? noteInput.value.trim() : '' },
          });
          toast(decision === 'approved' ? 'Access approved. The room is open for this investor.' : 'Request declined.');
          loadedTabs.delete('overview');
          await paintRequests();
        } catch (error) {
          toast(error.message || 'The decision could not be recorded.', 'error');
          button.disabled = false;
        }
      });
    });
  }

  /* ---------------------------- investors ---------------------------- */

  async function paintInvestors() {
    const data = await api('/api/admin/users');
    $('#investorsBody').innerHTML = data.users
      .map((user) => `
        <tr>
          <td><strong>${esc(user.name)}</strong><br><span class="is-mono">${esc(user.email)}</span></td>
          <td>${esc(user.firm)}<br><span style="color:var(--muted)">${esc(user.country || '')}</span></td>
          <td><span class="cp-badge cp-badge--${esc(user.status)}">${esc(user.status)}</span></td>
          <td>${user.nda ? '<span class="cp-badge cp-badge--approved">Signed</span>' : '<span class="cp-badge">No</span>'}</td>
          <td>${(user.requests || []).map((request) => `<div style="font-size:.68rem">${esc(request.projectSlug)} · ${esc(request.status)}</div>`).join('')}</td>
          <td>
            <div class="cp-table__actions">
              <button class="cp-btn cp-btn--ghost cp-btn--sm" type="button" data-user-view="${esc(user.id)}">Record</button>
              ${user.status === 'suspended'
                ? `<button class="cp-btn cp-btn--primary cp-btn--sm" type="button" data-user-status="${esc(user.id)}" data-to="active">Re-activate</button>`
                : `<button class="cp-btn cp-btn--ghost cp-btn--sm" type="button" data-user-status="${esc(user.id)}" data-to="suspended">Suspend</button>`}
            </div>
          </td>
        </tr>`)
      .join('');

    $$('[data-user-view]').forEach((button) => {
      button.addEventListener('click', async () => {
        const detail = $('#investorDetail');
        detail.hidden = false;
        detail.innerHTML = '<p style="color:var(--muted);font-size:.82rem">Loading the record…</p>';
        try {
          const data = await api(`/api/admin/users/${encodeURIComponent(button.dataset.userView)}`);
          detail.innerHTML = `
            <h2 style="font-family:var(--font-display);font-size:1.15rem;letter-spacing:-.02em;margin:0 0 .9rem">Record — ${esc(data.user.name)}</h2>
            <div class="cp-table-wrap">
              <table class="cp-table"><thead><tr><th>When</th><th>Action</th><th>Detail</th></tr></thead>
              <tbody>${(data.audit || []).map((row) => `
                <tr><td class="is-mono">${esc(fmtDateTime(row.at))}</td><td><strong>${esc(row.label || row.action)}</strong></td><td>${esc(row.project || row.doc || row.ip || '—')}</td></tr>`).join('') || '<tr><td colspan="3">No activity recorded.</td></tr>'}</tbody></table>
            </div>`;
          detail.scrollIntoView({ behavior: 'smooth', block: 'start' });
        } catch (error) {
          detail.innerHTML = `<p style="color:var(--terra);font-size:.82rem">${esc(error.message)}</p>`;
        }
      });
    });

    $$('[data-user-status]').forEach((button) => {
      button.addEventListener('click', async () => {
        button.disabled = true;
        try {
          await api(`/api/admin/users/${encodeURIComponent(button.dataset.userStatus)}`, {
            method: 'PATCH',
            body: { status: button.dataset.to },
          });
          toast(button.dataset.to === 'suspended' ? 'Investor suspended; sessions revoked.' : 'Investor re-activated.');
          await paintInvestors();
        } catch (error) {
          toast(error.message || 'Could not update the investor.', 'error');
          button.disabled = false;
        }
      });
    });
  }

  /* ---------------------------- projects ---------------------------- */

  async function paintProjects() {
    const data = await api('/api/admin/projects');
    $('#projectsBody').innerHTML = data.projects
      .map((project) => `
        <tr>
          <td><strong>${esc(project.title)}</strong><br><span class="is-mono">${esc(project.slug)}</span></td>
          <td>${esc(project.sector)}</td>
          <td>${esc(project.stage)}</td>
          <td>${esc(project.ticket)}</td>
          <td>${project.documents} docs · ${project.pages}p</td>
          <td><strong>${project.interest}</strong></td>
          <td class="is-mono">${esc(project.updated)}</td>
        </tr>`)
      .join('');
  }

  /* ------------------------------ audit ------------------------------ */

  async function paintAudit() {
    const params = new URLSearchParams({ limit: '150' });
    if ($('#auditAction').value) params.set('action', $('#auditAction').value);
    if ($('#auditProject').value) params.set('project', $('#auditProject').value);
    const data = await api(`/api/admin/audit?${params.toString()}`);
    $('#auditBody').innerHTML = (data.rows || [])
      .map((row) => `
        <tr>
          <td class="is-mono">${esc(fmtDateTime(row.at))}</td>
          <td><strong>${esc(row.label || row.action)}</strong><br><span class="is-mono" style="color:var(--muted)">${esc(row.action)}</span></td>
          <td>${row.user ? esc(`${row.user.name} · ${row.user.email}`) : row.ip ? esc(row.ip) : '—'}</td>
          <td>${esc(row.project || '—')}</td>
          <td>${esc(row.doc || row.requestId || row.email || row.note || '—')}</td>
        </tr>`)
      .join('') || '<tr><td colspan="5">No matching audit rows.</td></tr>';
  }

  $('#auditApply').addEventListener('click', () => paintAudit());

  /* ------------------------------ import ------------------------------ */

  function importSummaryHtml(data) {
    const counts = data.counts || {};
    const chips = [
      [counts.total, 'data rows'],
      [counts.valid, 'valid'],
      [counts.wouldCreate, 'to create'],
      [counts.wouldUpdate, 'to update'],
      [counts.errors, 'errors'],
      [counts.warnings, 'warnings'],
    ]
      .filter((chip) => chip[0] !== undefined)
      .map(
        ([value, label]) =>
          `<div><dt style="color:${label === 'errors' && value ? 'var(--terra)' : 'inherit'}">${value}</dt><dd>${label}</dd></div>`,
      )
      .join('');

    const fileErrors = (data.fileErrors || []).length
      ? `<div class="cp-table-wrap" style="margin-top:1rem"><table class="cp-table"><tbody>${(data.fileErrors || [])
          .map((message) => `<tr><td><strong style="color:var(--terra)">File</strong></td><td>${esc(message)}</td></tr>`)
          .join('')}</tbody></table></div>`
      : '';

    const preview = (data.preview || []).length
      ? `<h3 style="font-family:var(--font-display);font-size:1rem;margin:1.4rem 0 .7rem">First rows, normalised</h3>
         <div class="cp-table-wrap"><table class="cp-table">
         <thead><tr><th>Project</th><th>Slug</th><th>Stage</th><th>Sector</th><th>Ticket</th><th>Status</th><th>Action</th></tr></thead>
         <tbody>${data.preview
           .map(
             (row) => `<tr>
                <td><strong>${esc(row.title)}</strong><br><span style="color:var(--muted)">${esc(row.geography)}</span></td>
                <td class="is-mono">${esc(row.slug)}</td>
                <td>${esc(row.stage)}</td>
                <td>${esc(row.sector)}</td>
                <td>${esc(row.ticket)}</td>
                <td>${esc(row.status)}</td>
                <td><span class="cp-badge ${row.action === 'update' ? 'cp-badge--nda_signed' : 'cp-badge--approved'}">${esc(row.action)}</span></td>
              </tr>`,
           )
           .join('')}</tbody></table></div>`
      : '';

    const issues = (data.issues || []).length
      ? `<h3 style="font-family:var(--font-display);font-size:1rem;margin:1.4rem 0 .7rem">Row issues (${data.issues.length})</h3>
         <div class="cp-table-wrap"><table class="cp-table">
         <thead><tr><th>Row</th><th>Severity</th><th>Field</th><th>Message</th></tr></thead>
         <tbody>${data.issues
           .map(
             (issue) => `<tr${issue.severity === 'error' ? ' style="background:rgba(178,58,58,.05)"' : ''}>
                <td class="is-mono">${issue.row}</td>
                <td><strong style="color:${issue.severity === 'error' ? 'var(--terra)' : 'var(--gold)'}">${esc(issue.severity)}</strong></td>
                <td>${esc(issue.field)}</td>
                <td>${esc(issue.message)}</td>
              </tr>`,
           )
           .join('')}</tbody></table></div>`
      : '';

    return `<div class="cp-stat-row">${chips}</div>${fileErrors}${preview}${issues}`;
  }

  function downloadErrorReport(data) {
    const lines = ['Row,Severity,Field,Message'];
    for (const message of data.fileErrors || []) lines.push(`file,error,,"${String(message).replace(/"/g, '""')}"`);
    for (const issue of data.issues || []) {
      lines.push(
        [issue.row, issue.severity, `"${String(issue.field).replace(/"/g, '""')}"`, `"${String(issue.message).replace(/"/g, '""')}"`].join(','),
      );
    }
    const blob = new Blob([lines.join('\r\n')], { type: 'text/csv' });
    const anchor = document.createElement('a');
    anchor.href = URL.createObjectURL(blob);
    anchor.download = `dealvault-import-errors-${new Date().toISOString().slice(0, 10)}.csv`;
    anchor.click();
    URL.revokeObjectURL(anchor.href);
  }

  $('#importRun').addEventListener('click', async () => {
    const input = $('#importFile');
    const status = $('#importStatus');
    const result = $('#importResult');
    const button = $('#importRun');
    const mode = $('#importMode').value;

    result.innerHTML = '';
    if (!input.files || !input.files[0]) {
      setStatus(status, 'Choose a CSV or XLSX file first.', 'error');
      return;
    }
    const file = input.files[0];
    const isXlsx = /\.xlsx$/i.test(file.name) || file.type.includes('spreadsheetml');
    button.disabled = true;
    setStatus(status, 'Validating…', 'info');

    try {
      const body = await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = () => reject(new Error('The file could not be read.'));
        if (isXlsx) reader.readAsArrayBuffer(file);
        else reader.readAsText(file);
      });

      const response = await fetch(`/api/admin/import/projects?mode=${mode}`, {
        method: 'POST',
        credentials: 'same-origin',
        headers: {
          'Content-Type': isXlsx ? 'application/octet-stream' : 'text/csv; charset=utf-8',
          'X-File-Name': file.name.slice(0, 120),
        },
        body,
      });
      const data = await response.json().catch(() => null);
      if (!data) throw new Error(`Request failed (${response.status}).`);

      result.innerHTML = importSummaryHtml(data);

      const hasProblems = (data.fileErrors || []).length || (data.counts && data.counts.errors);
      const reportButton = hasProblems
        ? `<button class="cp-btn cp-btn--ghost cp-btn--sm" type="button" id="errorReport" style="margin-top:1rem">Download error report</button>`
        : '';
      if (reportButton) result.insertAdjacentHTML('beforeend', reportButton);
      if ($('#errorReport')) $('#errorReport').addEventListener('click', () => downloadErrorReport(data));

      if (data.message) setStatus(status, data.message, data.ok ? (data.counts.warnings ? 'info' : 'success') : 'error');
      else if (data.ok) setStatus(status, `Validation passed — ${data.counts.valid} row(s) ready to commit.`, 'success');
      else setStatus(status, 'Validation found blocking errors. Nothing was committed.', 'error');

      if (data.committed) {
        loadedTabs.delete('overview');
        loadedTabs.delete('projects');
        input.value = '';
      }
    } catch (error) {
      setStatus(status, error.message || 'The import could not be run.', 'error');
    } finally {
      button.disabled = false;
    }
  });

  /* ------------------------------ boot ------------------------------ */

  api('/api/me')
    .then((data) => { if (data.admin) openConsole(); })
    .catch(() => {});
})();
