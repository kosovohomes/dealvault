(() => {
  const { $, api, esc, fmtDate, fmtDateTime, relative, statusLabel, toast } = window.DVApp;

  function paintIdentity(user) {
    $('#accountName').textContent = user.name;
    $('#memberSince').textContent = `Member since ${fmtDate(user.createdAt)}`;
    $('#identityKv').innerHTML = `
      <div><dt>Name</dt><dd>${esc(user.name)}</dd></div>
      <div><dt>Email</dt><dd>${esc(user.email)} ${user.emailVerified ? '· verified' : ''}</dd></div>
      <div><dt>Firm</dt><dd>${esc(user.firm)}</dd></div>
      <div><dt>Jurisdiction</dt><dd>${esc(user.country)}</dd></div>
      <div><dt>Investor type</dt><dd>${esc(user.qualification ? user.qualification.type : '—')}</dd></div>
      <div><dt>Last seen</dt><dd>${esc(relative(user.lastSeenAt))}</dd></div>`;
    const nda = user.nda;
    $('#ndaKv').innerHTML = nda
      ? `
        <div><dt>Version</dt><dd>${esc(nda.version)}</dd></div>
        <div><dt>Signed as</dt><dd>${esc(nda.signedName)}</dd></div>
        <div><dt>Signed at</dt><dd>${esc(fmtDateTime(nda.signedAt))}</dd></div>
        <div><dt>Receipt</dt><dd class="is-mono">${esc(nda.receipt)}</dd></div>
        <div><dt>Text hash</dt><dd class="is-mono">${esc(String(nda.hash).slice(0, 12))}…</dd></div>`
      : '<div><dt>Not signed yet</dt><dd><a href="/nda" style="color:var(--green)">Sign the agreement</a></dd></div>';
  }

  function paintRequests(requests) {
    const body = $('#requestsTable tbody');
    if (!requests.length) {
      body.innerHTML = '<tr><td colspan="5">No requests yet. Express interest from a <a href="/projects" style="color:var(--green)">project brief</a>.</td></tr>';
      return;
    }
    body.innerHTML = requests
      .map((request) => `
        <tr>
          <td><strong>${esc(request.projectTitle)}</strong></td>
          <td><span class="cp-badge cp-badge--${esc(request.status)}">${esc(statusLabel(request.status))}</span></td>
          <td class="is-mono">${esc(fmtDate(request.createdAt))}</td>
          <td class="is-mono">${esc(relative(request.updatedAt))}</td>
          <td>${request.status === 'nda_pending' ? '<a href="/nda" style="color:var(--green)">Sign</a>' : request.status === 'approved' ? `<a href="/room/${esc(request.projectSlug)}" style="color:var(--green)">Room</a>` : ''}</td>
        </tr>`)
      .join('');
  }

  const ACTION_LABELS = {
    'auth.register': 'Account created',
    'auth.email_verified': 'Email verified',
    'auth.login': 'Signed in',
    'auth.login_failed': 'Sign-in failed',
    'auth.logout': 'Signed out',
    'auth.password_reset_requested': 'Reset requested',
    'auth.password_reset': 'Password changed',
    'auth.all_sessions_revoked': 'All sessions revoked',
    'auth.code_resent': 'Code re-sent',
    'auth.verify_failed': 'Verification failed',
    'request.created': 'Interest expressed',
    'nda.signed': 'Agreement signed',
    'request.approved': 'Request approved',
    'request.rejected': 'Request declined',
    'request.revoked': 'Access revoked',
    'doc.opened': 'Document opened',
    'doc.downloaded': 'Document downloaded',
    'doc.printed': 'Document printed',
    'doc.reviewed': 'Marked reviewed',
    'question.created': 'Question asked',
  };

  function paintAudit(rows) {
    const body = $('#auditTable tbody');
    if (!rows.length) {
      body.innerHTML = '<tr><td colspan="3">Nothing recorded yet.</td></tr>';
      return;
    }
    body.innerHTML = rows
      .map((row) => `
        <tr>
          <td class="is-mono">${esc(fmtDateTime(row.at))}</td>
          <td><strong>${esc(ACTION_LABELS[row.action] || row.action)}</strong></td>
          <td>${esc(row.project || row.doc || row.receipt || row.ip || '—')}</td>
        </tr>`)
      .join('');
  }

  async function load() {
    try {
      const me = await api('/api/me');
      if (!me.user) { location.href = '/login?next=%2Faccount'; return; }
      paintIdentity(me.user);
      const [requests, audit] = await Promise.all([api('/api/requests'), api('/api/admin/audit?userId=' + encodeURIComponent(me.user.id) + '&limit=60').catch(() => ({ rows: [] }))]);
      paintRequests(requests.requests);
      paintAudit(audit.rows || []);
    } catch (error) {
      if (error.status === 401) { location.href = '/login?next=%2Faccount'; return; }
      toast(error.message || 'The account page could not load fully.', 'error');
    }
  }

  $('#lockBtn').addEventListener('click', async () => {
    const button = $('#lockBtn');
    button.disabled = true;
    try {
      await api('/api/account/lock', { method: 'POST' });
      location.href = '/login?reset=1';
    } catch (error) {
      toast(error.message || 'Could not revoke the sessions.', 'error');
      button.disabled = false;
    }
  });

  load();
})();
