(() => {
  const { $, api, setStatus, toast } = window.DVApp;
  const status = $('#status');
  const params = new URLSearchParams(location.search);
  const email = (params.get('email') || '').toLowerCase();
  const next = params.get('next') || '/projects';

  if (email) {
    $('#emailEcho').textContent = email;
  } else {
    $('#lead').innerHTML = 'Open this page from the verification email, or <a href="/login" style="color:var(--green)">sign in</a> to restart verification.';
  }

  function showDemo(code) {
    if (!code) return;
    $('#demoWrap').hidden = false;
    $('#demoCode').textContent = code;
  }

  /* Demo mode: show the code issued at registration (and fetch one when a
     cached value is missing, e.g. when arriving from an old session). */
  (async () => {
    let cached = '';
    try { cached = sessionStorage.getItem('dv_demo_code') || ''; } catch { /* private mode */ }
    if (cached) {
      sessionStorage.removeItem('dv_demo_code');
      showDemo(cached);
      return;
    }
    if (!email) return;
    try {
      const data = await api('/api/auth/verify/resend', { method: 'POST', body: { email, purpose: 'verify' } });
      showDemo(data.demoCode);
    } catch { /* cooldown or non-demo: the user can request a code manually */ }
  })();

  $('#copyCode').addEventListener('click', async () => {
    try {
      await navigator.clipboard.writeText($('#demoCode').textContent.trim());
      toast('Code copied');
    } catch { toast('Copy failed — read it off the screen.', 'error'); }
  });

  $('#verifyForm').addEventListener('submit', async (event) => {
    event.preventDefault();
    const code = $('#code').value.trim();
    if (!/^\d{6}$/.test(code)) return setStatus(status, 'Enter the six-digit code.', 'error');
    const button = $('#submitBtn');
    button.disabled = true;
    button.textContent = 'Verifying…';
    try {
      const data = await api('/api/auth/verify', { method: 'POST', body: { email, code, next } });
      toast(`Verified. Welcome, ${data.user.name.split(' ')[0]}.`);
      location.href = data.next || '/projects';
    } catch (error) {
      setStatus(status, error.message || 'Verification failed.', 'error');
      button.disabled = false;
      button.textContent = 'Verify and continue';
    }
  });

  $('#resendBtn').addEventListener('click', async () => {
    const button = $('#resendBtn');
    button.disabled = true;
    try {
      const data = await api('/api/auth/verify/resend', { method: 'POST', body: { email, purpose: 'verify' } });
      showDemo(data.demoCode);
      setStatus(status, 'A new code was sent. It expires in fifteen minutes.', 'ok');
    } catch (error) {
      if (error.status === 429) setStatus(status, 'Slow down a moment, then request another code.', 'error');
      else setStatus(status, error.message || 'Could not send a new code.', 'error');
    } finally {
      button.disabled = false;
    }
  });
})();
