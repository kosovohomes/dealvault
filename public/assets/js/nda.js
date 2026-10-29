(() => {
  const { $, $$, api, esc, setStatus, toast } = window.DVApp;
  const status = $('#status');
  const form = $('#ndaForm');
  const params = new URLSearchParams(location.search);
  const project = params.get('project') || '';
  const next = params.get('next') || (project ? `/projects/${encodeURIComponent(project)}` : '/projects');

  async function load() {
    try {
      const data = await api('/api/agreement');
      $('#agreementVersion').textContent = `Version ${data.agreement.version}`;
      $('#agreementText').innerHTML = `
        <h2>${esc(data.agreement.title)}</h2>
        <p class="cp-agreement__meta">Version ${esc(data.agreement.version)} · Effective ${esc(data.agreement.effective)} · SHA-256 ${esc(String(data.hash).slice(0, 16))}…</p>
        <p>${esc(data.agreement.preamble)}</p>
        ${data.agreement.clauses.map((clause) => `<h3>${esc(clause.heading)}</h3><p>${esc(clause.text)}</p>`).join('')}`;
      $('#consentChecks').innerHTML = data.consentItems
        .map((item) => `<label class="cp-check"><input type="checkbox" data-consent="${esc(item.id)}"><span>${esc(item.label)}</span></label>`)
        .join('');
      $('#recVersion').textContent = data.agreement.version;
      $('#recHash').textContent = String(data.hash).slice(0, 14) + '…';
    } catch {
      $('#agreementText').innerHTML = '<p>The agreement could not be loaded. Refresh the page.</p>';
    }

    try {
      const me = await api('/api/me');
      if (me.user) {
        $('#recName').textContent = me.user.name;
        $('#recEmail').textContent = me.user.email;
        $('#signature').value = '';
        $('#signature').placeholder = me.user.name;
        if (me.user.nda) {
          /* Already signed: show state instead of the form. */
          $('#agreementText').insertAdjacentHTML('afterend', `
            <div class="cp-note" style="margin-block-start:1.4rem">
              <p><strong>You have already signed this agreement</strong> on ${esc(me.user.nda.signedAt.slice(0, 10))} as ${esc(me.user.nda.signedName)}, receipt ${esc(me.user.nda.receipt)}. No further action is needed here — approval is granted per project from the console.</p>
            </div>`);
          form.hidden = true;
        }
      }
    } catch { /* gating redirects handle it */ }
  }

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    const signature = $('#signature').value.trim();
    const initials = $('#initials').value.trim().toUpperCase();
    const consent = {};
    $$('#consentChecks input[data-consent]').forEach((box) => { consent[box.dataset.consent] = box.checked; });

    const missing = Object.values(consent).some((checked) => !checked);
    if (missing) return setStatus(status, 'Confirm every acknowledgement above to sign.', 'error');
    if (signature.length < 3) return setStatus(status, 'Type your full name to sign.', 'error');
    if (initials.length < 2) return setStatus(status, 'Add your initials.', 'error');

    const button = $('#submitBtn');
    button.disabled = true;
    button.textContent = 'Signing…';
    setStatus(status, '', '');
    try {
      const data = await api('/api/nda/sign', { method: 'POST', body: { signature, initials, consent, next } });
      toast(`Signed. Receipt ${data.user.nda.receipt}.`);
      location.href = data.next || '/projects';
    } catch (error) {
      setStatus(status, error.message || 'The signature could not be recorded.', 'error');
      button.disabled = false;
      button.textContent = 'Sign and return';
    }
  });

  load();
})();
