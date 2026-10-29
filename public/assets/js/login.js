(() => {
  const { $, api, setStatus } = window.DVApp;
  const status = $('#status');
  const params = new URLSearchParams(location.search);
  const next = params.get('next') || '/projects';
  const emailParam = params.get('email') || '';
  if (emailParam) $('#email').value = emailParam;
  if (params.get('reset')) {
    setStatus(status, 'Password changed. Sign in with the new one.', 'ok');
  }

  $('#loginForm').addEventListener('submit', async (event) => {
    event.preventDefault();
    const email = $('#email').value.trim().toLowerCase();
    const password = $('#password').value;
    const button = $('#submitBtn');
    if (!email || !password) return setStatus(status, 'Enter your email and password.', 'error');
    button.disabled = true;
    button.textContent = 'Signing in…';
    setStatus(status, '', '');
    try {
      const data = await api('/api/auth/login', { method: 'POST', body: { email, password, next } });
      if (!data.user.emailVerified) {
        location.href = `/verify?email=${encodeURIComponent(data.user.email)}&next=${encodeURIComponent(next)}`;
        return;
      }
      location.href = data.next || '/projects';
    } catch (error) {
      setStatus(status, error.message || 'Sign-in failed.', 'error');
      button.disabled = false;
      button.textContent = 'Sign in';
    }
  });
})();
