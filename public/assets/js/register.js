(() => {
  const { $, api, setStatus, toast } = window.DVApp;
  const form = $('#registerForm');
  const status = $('#status');
  const submit = $('#submitBtn');

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    const name = $('#name').value.trim();
    const email = $('#email').value.trim();
    const firm = $('#firm').value.trim();
    const country = $('#country').value.trim();
    const password = $('#password').value;
    const password2 = $('#password2').value;

    if (name.length < 3) return setStatus(status, 'Add your full name.', 'error');
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) return setStatus(status, 'That email does not look right.', 'error');
    if (firm.length < 2) return setStatus(status, 'Add your firm or company.', 'error');
    if (country.length < 2) return setStatus(status, 'Add your jurisdiction.', 'error');
    if (password !== password2) return setStatus(status, 'The two passwords do not match.', 'error');
    if (!$('#type').value) return setStatus(status, 'Select an investor type.', 'error');
    if (!$('#ticket').value) return setStatus(status, 'Select an intended ticket size.', 'error');
    if (!$('#accredited').checked) return setStatus(status, 'Confirm your investor status to continue.', 'error');
    if (!$('#terms').checked) return setStatus(status, 'Accept the terms to continue.', 'error');

    submit.disabled = true;
    submit.textContent = 'Creating…';
    setStatus(status, '', '');
    try {
      const data = await api('/api/auth/register', {
        method: 'POST',
        body: {
          name,
          email,
          firm,
          country,
          password,
          qualification: { type: $('#type').value, ticket: $('#ticket').value, accredited: true },
        },
      });
      toast('Account created. Check the verification step.');
      try { sessionStorage.setItem('dv_demo_code', String(data.demoCode || '')); } catch { /* private mode */ }
      const params = new URLSearchParams({ email: data.email });
      const next = new URLSearchParams(location.search).get('next');
      if (next) params.set('next', next);
      location.href = `/verify?${params.toString()}`;
    } catch (error) {
      setStatus(status, error.message || 'Could not create the account.', 'error');
      submit.disabled = false;
      submit.textContent = 'Create account';
    }
  });
})();
