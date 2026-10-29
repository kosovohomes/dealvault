/* Shared client helpers + shell behaviour for DealVault. */
(() => {
  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];

  async function api(path, options = {}) {
    const init = {
      method: options.method || 'GET',
      credentials: 'same-origin',
      headers: { Accept: 'application/json', ...(options.headers || {}) },
    };
    if (options.body !== undefined) {
      init.headers['Content-Type'] = 'application/json';
      init.body = JSON.stringify(options.body);
    }
    const response = await fetch(path, init);
    const type = response.headers.get('content-type') || '';
    let data = null;
    if (type.includes('application/json')) data = await response.json().catch(() => null);
    if (!response.ok) {
      const error = new Error((data && (data.message || data.error)) || `Request failed (${response.status})`);
      error.status = response.status;
      error.data = data;
      throw error;
    }
    return data;
  }

  function esc(value) {
    return String(value ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  let toastTimer = null;
  function toast(message, kind = 'info') {
    let node = $('.toast');
    if (!node) {
      node = document.createElement('div');
      node.className = 'toast';
      node.setAttribute('role', 'status');
      node.setAttribute('aria-live', 'polite');
      document.body.appendChild(node);
    }
    node.innerHTML = '<span class="toast__dot"></span><span></span>';
    node.lastElementChild.textContent = message;
    node.classList.toggle('is-error', kind === 'error');
    node.classList.add('is-visible');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => node.classList.remove('is-visible'), kind === 'error' ? 6200 : 4200);
  }

  const dateFmt = new Intl.DateTimeFormat('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
  const dateTimeFmt = new Intl.DateTimeFormat('en-GB', {
    day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
  });

  function validDate(value) {
    if (!value) return null;
    const date = value instanceof Date ? value : new Date(value);
    return Number.isNaN(date.getTime()) ? null : date;
  }
  const fmtDate = (value) => {
    const date = validDate(value);
    return date ? dateFmt.format(date) : '—';
  };
  const fmtDateTime = (value) => {
    const date = validDate(value);
    return date ? dateTimeFmt.format(date) : '—';
  };

  function relative(value) {
    const date = validDate(value);
    if (!date) return '—';
    const seconds = Math.round((Date.now() - date.getTime()) / 1000);
    if (seconds < 45) return 'just now';
    if (seconds < 3600) return `${Math.max(1, Math.round(seconds / 60))} min ago`;
    if (seconds < 86400) return `${Math.round(seconds / 3600)} h ago`;
    if (seconds < 172800) return 'yesterday';
    if (seconds < 604800) return `${Math.round(seconds / 86400)} days ago`;
    return fmtDate(date);
  }

  const firstName = (name) => String(name || '').trim().split(/\s+/)[0] || 'there';

  function setStatus(el, message, kind = '') {
    if (!el) return;
    el.textContent = message || '';
    el.className = 'cp-form-status' + (kind ? ` is-${kind}` : '');
  }

  const STATUS_LABELS = {
    nda_pending: 'NDA to sign',
    nda_signed: 'NDA signed · awaiting approval',
    approved: 'Approved',
    rejected: 'Not approved',
    revoked: 'Access revoked',
  };
  const statusLabel = (status) => STATUS_LABELS[status] || status || '—';

  function fileFromDisposition(header, fallback) {
    if (!header) return fallback;
    const match = /filename="?([^";]+)"?/i.exec(header);
    return match ? match[1] : fallback;
  }

  async function download(path, options = {}) {
    const response = await fetch(path, {
      method: options.method || 'GET',
      credentials: 'same-origin',
      headers: options.body ? { 'Content-Type': 'application/json' } : {},
      body: options.body ? JSON.stringify(options.body) : undefined,
    });
    if (!response.ok) {
      let message = `Download failed (${response.status})`;
      try {
        const data = await response.json();
        message = data.message || data.error || message;
      } catch { /* ignore */ }
      throw new Error(message);
    }
    const blob = await response.blob();
    const filename = fileFromDisposition(response.headers.get('content-disposition'), options.fallbackName || 'dealvault-document.html');
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 4000);
    return filename;
  }

  function signOut() {
    return api('/api/auth/logout', { method: 'POST' }).finally(() => {
      location.href = '/';
    });
  }

  /* ------------------------- shell: nav auth state ------------------------- */

  function initShell() {
    $$('[data-year]').forEach((el) => { el.textContent = String(new Date().getFullYear()); });

    $$('[data-signout]').forEach((button) => {
      button.addEventListener('click', async (event) => {
        event.preventDefault();
        button.disabled = true;
        try { await signOut(); } catch { button.disabled = false; toast('Could not sign out. Try again.', 'error'); }
      });
    });

    const burger = $('.cp-burger');
    const mobile = document.getElementById('cp-mobile');
    if (burger && mobile) {
      burger.addEventListener('click', () => {
        const open = burger.getAttribute('aria-expanded') === 'true';
        burger.setAttribute('aria-expanded', String(!open));
        mobile.hidden = open;
        document.body.classList.toggle('cp-menu-open', !open);
      });
      document.addEventListener('keydown', (event) => {
        if (event.key !== 'Escape') return;
        burger.setAttribute('aria-expanded', 'false');
        mobile.hidden = true;
        document.body.classList.remove('cp-menu-open');
      });
    }

    const bar = $('.cp-bar');
    if (bar) {
      const onScroll = () => bar.classList.toggle('is-scrolled', window.scrollY > 8);
      window.addEventListener('scroll', onScroll, { passive: true });
      onScroll();
    }

    /* Swap the header CTA depending on session state. */
    api('/api/me')
      .then((data) => {
        window.DV_SESSION = data;
        const open = Boolean(data.user && data.user.emailVerified);
        $$('[data-auth-cta]').forEach((a) => {
          const label = a.querySelector('[data-cta-label]') || a;
          a.setAttribute('href', open ? a.getAttribute('data-open-href') || '/projects' : a.getAttribute('data-locked-href') || '/login');
          label.textContent = open ? a.getAttribute('data-open-label') || 'Open vault' : a.getAttribute('data-locked-label') || 'Sign in';
        });
        $$('[data-auth-mobile]').forEach((a) => {
          a.setAttribute('href', open ? '/projects' : '/register');
          a.textContent = open ? 'Open the vault' : 'Request an account';
        });
      })
      .catch(() => { /* public shell still works */ });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initShell);
  } else {
    initShell();
  }

  window.DVApp = {
    $, $$, api, esc, toast, fmtDate, fmtDateTime, relative, firstName,
    setStatus, statusLabel, download, signOut,
  };
})();
