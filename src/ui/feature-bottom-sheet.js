export class FeatureBottomSheet {
  constructor({ theme = 'light', getEnvironmentConfig, searchEngine, onResetAll }) {
    this.theme = theme;
    this.getEnvironmentConfig = getEnvironmentConfig;
    this.searchEngine = searchEngine;
    this.onResetAll = onResetAll;
    this.overlayElement = null;

    this._onClickHandler = this._onClickHandler.bind(this);
    this._onInputHandler = this._onInputHandler.bind(this);
  }

  render() {
    const overlay = document.createElement('div');
    overlay.className = 'ft-bottom-sheet-overlay';
    overlay.id = 'ft-overlay';

    const sheet = document.createElement('div');
    sheet.className = `ft-bottom-sheet ${this.theme === 'dark' ? 'dark' : ''}`;
    sheet.id = 'ft-sheet';

    const env = this.getEnvironmentConfig();

    const envBadge = document.createElement('div');
    envBadge.className = 'ft-env-badge';
    envBadge.id = 'ft-env-badge';
    envBadge.textContent = env.label;
    envBadge.style.backgroundColor = env.color;

    const header = document.createElement('div');
    header.className = 'ft-sheet-header';
    header.innerHTML = `
      <h2 class="ft-sheet-title">⚡ Feature Toggles</h2>
      <button class="ft-close-button" id="ft-close">×</button>
    `;

    const searchContainer = document.createElement('div');
    searchContainer.className = 'ft-search-container';
    searchContainer.innerHTML = `
      <input
        type="text"
        class="ft-search-input"
        id="ft-search"
        placeholder="Search features by name or key..."
        autocomplete="off"
      >
    `;

    const content = document.createElement('div');
    content.className = 'ft-sheet-content';
    content.id = 'ft-content';

    const footer = document.createElement('div');
    footer.className = 'ft-sheet-footer';
    footer.innerHTML = `
      <button class="ft-button ft-button-secondary" id="ft-reset">Reset All</button>
      <button class="ft-button ft-button-primary" id="ft-save">Save</button>
    `;

    sheet.appendChild(envBadge);
    sheet.appendChild(header);
    sheet.appendChild(searchContainer);
    sheet.appendChild(content);
    sheet.appendChild(footer);
    overlay.appendChild(sheet);

    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) {
        this.close();
      }
    });

    document.addEventListener('click', this._onClickHandler);
    document.addEventListener('input', this._onInputHandler);

    this.overlayElement = overlay;
    return overlay;
  }

  _onClickHandler(e) {
    if (!e.target) return;
    if (e.target.id === 'ft-close') {
      this.close();
    } else if (e.target.id === 'ft-save') {
      this.close();
    } else if (e.target.id === 'ft-reset') {
      if (this.onResetAll) this.onResetAll();
    }
  }

  _onInputHandler(e) {
    if (e.target && e.target.id === 'ft-search') {
      this.searchEngine.filterFeatures(e.target.value);
    }
  }

  updateEnvironmentBadge() {
    if (typeof document === 'undefined') return;
    const badge = document.getElementById('ft-env-badge');
    if (!badge) return;

    const env = this.getEnvironmentConfig();
    badge.textContent = env.label;
    badge.style.backgroundColor = env.color;
  }

  open() {
    const overlay = document.getElementById('ft-overlay');
    const sheet = document.getElementById('ft-sheet');
    const searchInput = document.getElementById('ft-search');

    if (searchInput) searchInput.value = '';

    this.updateEnvironmentBadge();
    this.searchEngine.renderFeatures();

    if (overlay) overlay.classList.add('open');
    setTimeout(() => {
      if (sheet) sheet.classList.add('open');
      if (searchInput) {
        setTimeout(() => searchInput.focus(), 100);
      }
    }, 10);
  }

  close() {
    const overlay = document.getElementById('ft-overlay');
    const sheet = document.getElementById('ft-sheet');

    if (sheet) sheet.classList.remove('open');
    setTimeout(() => {
      if (overlay) overlay.classList.remove('open');
    }, 300);
  }

  destroy() {
    document.removeEventListener('click', this._onClickHandler);
    document.removeEventListener('input', this._onInputHandler);
    if (this.overlayElement) {
      this.overlayElement.remove();
      this.overlayElement = null;
    }
  }
}