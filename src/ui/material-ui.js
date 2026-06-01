export class MaterialSolarUI {
  constructor({ objects, dockOrder, filters, elements, onSelect }) {
    this.objects = objects;
    this.dockOrder = dockOrder;
    this.filters = filters;
    this.elements = elements;
    this.onSelect = onSelect;
    this.state = { selectedId: 'saturn', activeFilter: 'همه' };
  }

  current() {
    return this.objects.find(item => item.id === this.state.selectedId) || this.objects[0];
  }

  init() {
    this.renderAll();
    this.bindEvents();
  }

  iconMarkup(item, className = 'planet-icon') {
    return `<span class="${className}" style="background:${item.color}">${item.id === 'saturn' ? '<i></i>' : ''}</span>`;
  }

  formatKm(value) { return value ? `${Number(value).toLocaleString('fa-IR')} km` : 'گروه/ناحیه'; }
  formatDistance(value) { return value ? `${value.toLocaleString('fa-IR')} میلیون km` : 'مرکز منظومه'; }
  formatAu(value) { return value ? `${(value / 149.6).toLocaleString('fa-IR', { maximumFractionDigits: 1 })} AU` : '۰ AU'; }

  renderAll() {
    this.renderFilters();
    this.renderDock();
    this.renderQuickCard();
    this.renderCards();
    this.renderDetail();
  }

  renderDock() {
    this.elements.dock.innerHTML = this.dockOrder.map(id => {
      const item = this.objects.find(entry => entry.id === id);
      return `<button class="dock-item ${id === this.state.selectedId ? 'is-active' : ''}" data-select="${id}" title="${item.fa}" aria-label="${item.fa}">${this.iconMarkup(item)}</button>`;
    }).join('');
  }

  renderQuickCard() {
    const item = this.current();
    const ordinal = item.order ? `${item.order}th object from the Sun` : 'Central star';
    this.elements.quickCard.innerHTML = `
      <div class="quick-title">
        ${this.iconMarkup(item, 'quick-icon')}
        <div><h2>${item.en}</h2><p>${ordinal}</p></div>
      </div>
      <div class="quick-stats">
        <span><b>Ø</b><strong>${this.formatKm(item.diameter)}</strong><small>قطر</small></span>
        <span><b>♨</b><strong>${item.gravity}</strong><small>گرانش</small></span>
        <span><b>◷</b><strong>${item.year}</strong><small>سال</small></span>
      </div>
      <p class="quick-summary">${item.summary}</p>
      <button class="explore-btn" data-open-atlas>Explore <span>←</span></button>`;
  }

  visibleObjects() {
    const query = this.elements.searchInput.value.trim().toLowerCase();
    return this.objects.filter(item => {
      const matchesFilter = this.state.activeFilter === 'همه' || item.type === this.state.activeFilter;
      const haystack = `${item.fa} ${item.en} ${item.type} ${item.summary} ${item.note}`.toLowerCase();
      return matchesFilter && (!query || haystack.includes(query));
    });
  }

  renderFilters() {
    this.elements.filtersEl.innerHTML = this.filters.map(filter => `<button class="filter-chip ${filter === this.state.activeFilter ? 'is-active' : ''}" data-filter="${filter}">${filter}</button>`).join('');
  }

  renderCards() {
    const list = this.visibleObjects();
    this.elements.cards.innerHTML = list.map(item => `
      <button class="object-card ${item.id === this.state.selectedId ? 'is-selected' : ''}" data-select="${item.id}">
        ${this.iconMarkup(item)}
        <span><b>${item.fa}</b><small>${item.en} · ${item.type}</small></span>
        <em>${this.formatAu(item.distance)}</em>
      </button>`).join('') || '<p class="empty-state">چیزی پیدا نشد؛ واژه دیگری امتحان کنید.</p>';
  }

  renderDetail() {
    const item = this.current();
    this.elements.detail.innerHTML = `
      <div class="detail-visual">${this.iconMarkup(item, 'detail-orb')}</div>
      <p class="kicker">${item.en}</p>
      <h2>${item.fa}</h2>
      <p class="detail-summary">${item.summary}</p>
      <dl class="facts">
        <div><dt>نوع جرم</dt><dd>${item.type}</dd></div>
        <div><dt>جایگاه</dt><dd>${item.order}</dd></div>
        <div><dt>قطر میانگین</dt><dd>${this.formatKm(item.diameter)}</dd></div>
        <div><dt>فاصله از خورشید</dt><dd>${this.formatDistance(item.distance)}</dd></div>
        <div><dt>واحد نجومی</dt><dd>${this.formatAu(item.distance)}</dd></div>
        <div><dt>دوره مداری</dt><dd>${item.year}</dd></div>
        <div><dt>دوره چرخش</dt><dd>${item.day}</dd></div>
        <div><dt>قمرها</dt><dd>${item.moons}</dd></div>
        <div><dt>گرانش</dt><dd>${item.gravity}</dd></div>
        <div><dt>دما</dt><dd>${item.temp}</dd></div>
      </dl>
      <p class="note">${item.note}</p>`;
  }

  select(id) {
    this.state.selectedId = id;
    this.renderDock();
    this.renderQuickCard();
    this.renderCards();
    this.renderDetail();
    this.onSelect?.(id);
  }

  openAtlas() {
    this.elements.atlasSheet.classList.add('open');
    this.elements.atlasSheet.setAttribute('aria-hidden', 'false');
    this.renderCards();
    this.renderDetail();
  }

  closeAtlas() {
    this.elements.atlasSheet.classList.remove('open');
    this.elements.atlasSheet.setAttribute('aria-hidden', 'true');
  }

  setTheme(theme) {
    document.body.classList.toggle('dark', theme === 'dark');
    document.querySelectorAll('[data-theme]').forEach(button => button.classList.toggle('is-active', button.dataset.theme === theme));
  }

  bindEvents() {
    document.addEventListener('click', event => {
      const selectButton = event.target.closest('[data-select]');
      if (selectButton) this.select(selectButton.dataset.select);
      if (event.target.closest('[data-open-atlas]')) this.openAtlas();
      if (event.target.closest('[data-close-atlas]')) this.closeAtlas();
      const filterButton = event.target.closest('[data-filter]');
      if (filterButton) { this.state.activeFilter = filterButton.dataset.filter; this.renderFilters(); this.renderCards(); }
      const themeButton = event.target.closest('[data-theme]');
      if (themeButton) this.setTheme(themeButton.dataset.theme);
      const panelButton = event.target.closest('[data-panel]');
      if (panelButton) document.getElementById(panelButton.dataset.panel)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    });
    document.querySelector('#themeToggle').addEventListener('click', () => this.setTheme(document.body.classList.contains('dark') ? 'light' : 'dark'));
    this.elements.searchInput.addEventListener('input', () => this.renderCards());
    document.addEventListener('keydown', event => { if (event.key === 'Escape') this.closeAtlas(); });
  }
}
