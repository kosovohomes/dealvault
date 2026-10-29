(() => {
  const { $, api, setStatus, toast } = window.DVApp;
  const status = $('#status');
  let email = '';

  function showDemo(code) {
    if (!code) return;
    $('#demoWrap').hidden = false;
    $('#demoCode').textContent = code;
  }

  $('#copyCode').addEventListener('click', async () => {
    try {
      await navigator.clipboard.writeText($('#demoCode').textContent.trim());
      toast('Code copied');
    } catch { toast('Copy failed — read it off the screen.', 'error'); }
  });

  $('#requestCodeForm').addEventListener('submit', async (event) => {
    event.preventDefault();
    email = $('#email').value.trim().toLowerCase();
    const button = $('#requestBtn');
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) return setStatus(status, 'Enter the account email.', 'error');
    button.disabled = true;
    button.textContent = 'Sending…';
    try {
      const data = await api('/api/auth/reset/request', { method: 'POST', body: { email } });
      showDemo(data.demoCode);
      $('#requestCodeForm').hidden = true;
      $('#confirmForm').hidden = false;
      setStatus(status, 'If that address has an account, a reset code is on its way (15 minutes).', 'ok');
    } catch (error) {
      setStatus(status, error.message || 'Could not send the reset code.', 'error');
    } finally {
      button.disabled = false;
      button.textContent = 'Send the reset code';
    }
  });

  $('#confirmForm').addEventListener('submit', async (event) => {
    event.preventDefault();
    const code = $('#code').value.trim();
    const password = $('#password').value;
    const button = $('#confirmBtn');
    if (!/^\d{6}$/.test(code)) return setStatus(status, 'Enter the six-digit reset code.', 'error');
    button.disabled = true;
    button.textContent = 'Setting…';
    try {
      const data = await api('/api/auth/reset/confirm', { method: 'POST', body: { email, code, password } });
      toast('Password updated. All sessions were signed out.');
      location.href = data.next || '/login';
    } catch (error) {
      setStatus(status, error.message || 'Could not set the new password.', 'error');
      button.disabled = false;
      button.textContent = 'Set the new password';
    }
  });

  $('#resendBtn').addEventListener('click', async () => {
    try {
      const data = await api('/api/auth/verify/resend', { method: 'POST', body: { email, purpose: 'reset' } });
      showDemo(data.demoCode);
      setStatus(status, 'A new code was sent.', 'ok');
    } catch (error) {
      setStatus(status, error.message || 'Could not send a new code.', 'error');
    }
  });
})();
