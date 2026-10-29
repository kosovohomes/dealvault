(() => {
  const { $, $$, api, esc, statusLabel } = window.DVApp;
  const grid = $('#projectGrid');
  const emptyState = $('#emptyState');
  const resultCount = $('#resultCount');

  const filters = {
    q: $('#filterSearch'),
    sector: $('#filterSector'),
    stage: $('#filterStage'),
    geography: $('#filterGeography'),
    ticket: $('#filterTicket'),
  };

  let catalogue = null;
  let debounceTimer = 0;

  function cardHtml(project) {
    const state = project.request
      ? `<span class="cp-badge cp-badge--${esc(project.request.status)}">${esc(statusLabel(project.request.status))}</span>`
      : '';
    const docs = project.documents.length;
    const pages = project.documents.reduce((sum, doc) => sum + doc.pages, 0);
    return `
      <a class="cp-vault-card" href="/projects/${esc(project.slug)}">
        <div class="cp-vault-card__top">
          <span class="cp-vault-card__sector">${esc(project.sector)}</span>
          ${state}
        </div>
        <h3>${esc(project.title)}</h3>
        <p class="cp-vault-card__tagline">${esc(project.tagline)}</p>
        <div class="cp-vault-card__meta">
          <span>Stage <strong>${esc(project.stage)}</strong></span>
          <span>Geography <strong>${esc(project.geography)}</strong></span>
          <span>Raising <strong>${esc(project.ticket)}</strong></span>
        </div>
        <div class="cp-vault-card__foot">
          <span class="cp-vault-card__docs">${docs ? `${docs} document${docs === 1 ? '' : 's'} · ${pages} pages` : 'Brief only · documents to come'}</span>
          <span class="cp-vault-card__go">${project.request && project.request.status === 'approved' ? 'Open the room' : 'View the brief'} <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M4 12h15M13 6l6 6-6 6"/></svg></span>
        </div>
      </a>`;
  }

  function paint(list) {
    grid.innerHTML = list.map(cardHtml).join('');
    emptyState.hidden = list.length > 0;
    resultCount.innerHTML = `<strong>${list.length}</strong> project${list.length === 1 ? '' : 's'} shown`;
  }

  async function load() {
    const params = new URLSearchParams();
    Object.entries(filters).forEach(([key, el]) => {
      const value = (el.value || '').trim();
      if (value) params.set(key, value);
    });
    const query = params.toString();
    const data = await api(`/api/projects${query ? `?${query}` : ''}`);
    catalogue = data;
    const tag = $('#catalogueTag');
    if (tag && data.totals) {
      tag.textContent = `${data.totals.projects} projects · ${data.totals.documents} documents · ${data.totals.pages} pages under NDA`;
    }
    paint(data.projects);
  }

  function initFacets() {
    if (!catalogue) return;
    const fill = (el, values) => {
      const current = el.value;
      el.innerHTML = `<option value="">${el.id === 'filterSector' ? 'All sectors' : el.id === 'filterStage' ? 'All stages' : 'All geographies'}</option>` +
        values.map((value) => `<option value="${esc(value)}">${esc(value)}</option>`).join('');
      el.value = current;
    };
    fill(filters.sector, catalogue.facets.sectors);
    fill(filters.stage, catalogue.facets.stages);
    fill(filters.geography, catalogue.facets.geographies);
  }

  async function refresh() {
    try {
      await load();
    } catch (error) {
      if (error.status === 401) { location.href = `/login?next=${encodeURIComponent('/projects')}`; return; }
      if (error.status === 403) { location.href = '/verify'; return; }
      grid.innerHTML = '';
      emptyState.hidden = false;
      emptyState.textContent = error.message || 'The showcase could not load. Refresh to try again.';
    }
  }

  Object.values(filters).forEach((el) => {
    el.addEventListener(el.tagName === 'INPUT' ? 'input' : 'change', () => {
      clearTimeout(debounceTimer);
      debounceTimer = setTimeout(() => {
        refresh().then(initFacets);
      }, el.tagName === 'INPUT' ? 220 : 0);
    });
  });

  $('#resetFilters').addEventListener('click', () => {
    Object.values(filters).forEach((el) => { el.value = ''; });
    refresh().then(initFacets);
  });

  refresh().then(initFacets);
})();
