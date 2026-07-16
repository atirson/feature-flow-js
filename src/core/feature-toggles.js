// feature-toggles.js

/**
 * @typedef {Object} FeatureConfig
 * @property {string} key - Identificador único da feature
 * @property {string} name - Nome amigável da feature
 * @property {string} [description] - Descrição da feature
 * @property {boolean} defaultEnabled - Estado padrão (fallback)
 * @property {Function} [rolloutRule] - Função de validação customizada
 */

/**
 * @typedef {Object} FeatureContext
 * @property {Object} [user] - Dados do usuário
 * @property {string} [environment] - Ambiente (dev, staging, prod)
 * @property {Object} [flags] - Flags adicionais
 * @property {Object} [payload] - Dados customizados
 */

/**
 * @typedef {Object} UIConfig
 * @property {string} [position] - Posição do botão (bottom-left, bottom-right, top-left, top-right)
 * @property {Object} [styles] - Estilos customizados para o botão
 * @property {string} [theme] - Tema (light, dark)
 */

class FeatureToggles {
  constructor() {
    this.features = new Map();
    this.overrides = new Map();
    this.context = {};
    this.listeners = new Set();
    this.apiEndpoint = null;
    this.dragging = false;
    this.dragOffset = { x: 0, y: 0 };
    this.positionKey = 'feature-toggles-button-position';
    this.uiConfig = {
      position: 'bottom-right',
      theme: 'light',
      styles: {}
    };
    this.uiInitialized = false;
    
    // Environment configuration
    this.environment = 'local';
    this.environments = {
      local: { label: 'LOCAL', color: '#6b7280' },
      dev: { label: 'DEV', color: '#3b82f6' },
      hml: { label: 'HML', color: '#f59e0b' },
      prod: { label: 'PROD', color: '#10b981' }
    };
  
    // Carrega overrides do localStorage
    this._loadFromStorage();
  }

  /**
   * Define o ambiente atual
   * @param {string} env - Nome do ambiente (local, dev, hml, prod)
   * @param {Object} [config] - Configuração customizada { label, color }
   */
  setEnvironment(env, config = {}) {
    this.environment = env;
    
    if (config.label || config.color) {
      this.environments[env] = {
        label: config.label || env.toUpperCase(),
        color: config.color || '#6b7280'
      };
    }
    
    this._updateEnvironmentBadge();
  }

  /**
   * Registra uma nova feature toggle
   * @param {FeatureConfig} config
   */
  registerFeature(config) {
    if (!config.key) {
      throw new Error('Feature key is required');
    }
  
    this.features.set(config.key, {
      key: config.key,
      name: config.name || config.key,
      description: config.description || '',
      defaultEnabled: config.defaultEnabled || false,
      rolloutRule: config.rolloutRule || null
    });
  
    this._notifyListeners();
  }

  /**
   * Registra múltiplas features de uma vez
   * @param {FeatureConfig[]} configs
   */
  registerFeatures(configs) {
    configs.forEach(config => this.registerFeature(config));
  }

  /**
   * Verifica se uma feature está habilitada
   * @param {string} key
   * @param {FeatureContext} [context]
   * @returns {boolean}
   */
  isEnabled(key, context = {}) {
    const feature = this.features.get(key);
  
    if (!feature) {
      console.warn(`Feature "${key}" not registered`);
      return false;
    }

    // 1. Verifica override manual (UI)
    if (this.overrides.has(key)) {
      return this.overrides.get(key);
    }

    // 2. Aplica rollout rule se existir
    if (feature.rolloutRule) {
      const mergedContext = { ...this.context, ...context };
      try {
        return feature.rolloutRule(mergedContext);
      } catch (error) {
        console.error(`Error in rollout rule for "${key}":`, error);
        return feature.defaultEnabled;
      }
    }

    // 3. Retorna valor padrão
    return feature.defaultEnabled;
  }

  /**
   * Define o contexto global
   * @param {FeatureContext} context
   */
  setContext(context) {
    this.context = { ...this.context, ...context };
    this._notifyListeners();
  }

  /**
   * Aplica configuração remota
   * @private
   */
  _applyRemoteConfig(config) {
    if (config.features) {
      config.features.forEach(feature => {
        if (this.features.has(feature.key)) {
          const existing = this.features.get(feature.key);
          this.features.set(feature.key, {
            ...existing,
            defaultEnabled: feature.defaultEnabled ?? existing.defaultEnabled
          });
        }
      });
    }
  
    this._notifyListeners();
  }

  /**
   * Define override manual para uma feature
   * @param {string} key
   * @param {boolean} enabled
   */
  setOverride(key, enabled) {
    this.overrides.set(key, enabled);
    this._saveToStorage();
    this._notifyListeners();
  }

  /**
   * Remove override manual
   * @param {string} key
   */
  clearOverride(key) {
    this.overrides.delete(key);
    this._saveToStorage();
    this._notifyListeners();
  }

  /**
   * Remove todos os overrides
   */
  clearAllOverrides() {
    this.overrides.clear();
    this._saveToStorage();
    this._notifyListeners();
  }

  /**
   * Retorna todas as features registradas
   * @returns {Array}
   */
  getAllFeatures() {
    return Array.from(this.features.values()).map(feature => ({
      ...feature,
      currentState: this.isEnabled(feature.key),
      hasOverride: this.overrides.has(feature.key),
      overrideValue: this.overrides.get(feature.key)
    }));
  }

  /**
   * Adiciona listener para mudanças
   * @param {Function} callback
   * @returns {Function} Função para remover o listener
   */
  subscribe(callback) {
    this.listeners.add(callback);
    return () => this.listeners.delete(callback);
  }

  /**
   * Notifica listeners sobre mudanças
   * @private
   */
  _notifyListeners() {
    this.listeners.forEach(callback => {
      try {
        callback(this.getAllFeatures());
      } catch (error) {
        console.error('Error in feature toggle listener:', error);
      }
    });
  }

  /**
   * Salva overrides no localStorage
   * @private
   */
  _saveToStorage() {
    if (typeof localStorage !== 'undefined') {
      try {
        const data = Array.from(this.overrides.entries());
        localStorage.setItem('feature-toggles-overrides', JSON.stringify(data));
      } catch (error) {
        console.error('Failed to save to localStorage:', error);
      }
    }
  }

  /**
   * Carrega overrides do localStorage
   * @private
   */
  _loadFromStorage() {
    if (typeof localStorage !== 'undefined') {
      try {
        const data = localStorage.getItem('feature-toggles-overrides');
        if (data) {
          const entries = JSON.parse(data);
          this.overrides = new Map(entries);
        }
      } catch (error) {
        console.error('Failed to load from localStorage:', error);
      }
    }
  }

  /**
   * Configura e inicializa a UI
   * @param {UIConfig} config
   */
  initUI(config = {}) {
    this.uiConfig = {
      ...this.uiConfig,
      ...config
    };

    if (typeof document === 'undefined') {
      console.warn('UI not available in this environment');
      return;
    }

    if (this.uiInitialized) {
      return;
    }

    this._createUI();
    this.uiInitialized = true;
  }

  /**
   * Cria a interface do usuário
   * @private
   */
  _createUI() {
    // Injeta estilos
    this._injectStyles();

    // Cria botão flutuante
    const button = this._createFloatingButton();
    document.body.appendChild(button);

    // Cria bottom sheet
    const sheet = this._createBottomSheet();
    document.body.appendChild(sheet);

    // Event listeners
    button.addEventListener('click', () => this._openBottomSheet());
    
    // Listener para manter botão visível ao redimensionar
    window.addEventListener('resize', () => this._keepButtonInViewport(button));
  }

  /**
   * Injeta estilos CSS
   * @private
   */
  _injectStyles() {
    const styleId = 'feature-toggles-styles';
    if (document.getElementById(styleId)) {
      return;
    }

    const style = document.createElement('style');
    style.id = styleId;
    style.textContent = `
      .ft-floating-button {
        position: fixed;
        width: 56px;
        height: 56px;
        border-radius: 50%;
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        color: white;
        border: none;
        cursor: pointer;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
        z-index: 9998;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 24px;
        transition: transform 0.2s, box-shadow 0.2s;
      }

      .ft-floating-button:hover {
        transform: scale(1.05);
        box-shadow: 0 6px 16px rgba(0, 0, 0, 0.2);
      }

      .ft-floating-button:active {
        transform: scale(0.95);
      }

      .ft-floating-button.bottom-left {
        bottom: 24px;
        left: 24px;
      }

      .ft-floating-button.bottom-right {
        bottom: 24px;
        right: 24px;
      }

      .ft-floating-button.top-left {
        top: 24px;
        left: 24px;
      }

      .ft-floating-button.top-right {
        top: 24px;
        right: 24px;
      }

      .ft-bottom-sheet-overlay {
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: rgba(0, 0, 0, 0.5);
        z-index: 9999;
        display: none;
        opacity: 0;
        transition: opacity 0.3s;
      }

      .ft-bottom-sheet-overlay.open {
        display: block;
        opacity: 1;
      }

      .ft-bottom-sheet {
        position: fixed;
        bottom: 0;
        left: 0;
        right: 0;
        background: white;
        border-radius: 16px 16px 0 0;
        max-height: 80vh;
        transform: translateY(100%);
        transition: transform 0.3s ease-out;
        z-index: 10000;
        display: flex;
        flex-direction: column;
      }

      .ft-bottom-sheet.open {
        transform: translateY(0);
      }

      .ft-bottom-sheet.dark {
        background: #1a1a1a;
        color: #ffffff;
      }

      .ft-sheet-header {
        padding: 20px 24px;
        border-bottom: 1px solid #e5e7eb;
        display: flex;
        justify-content: space-between;
        align-items: center;
      }

      .ft-bottom-sheet.dark .ft-sheet-header {
        border-bottom-color: #333;
      }

      .ft-sheet-title {
        font-size: 20px;
        font-weight: 600;
        margin: 0;
      }

      .ft-close-button {
        background: none;
        border: none;
        font-size: 24px;
        cursor: pointer;
        color: #6b7280;
        padding: 0;
        width: 32px;
        height: 32px;
        display: flex;
        align-items: center;
        justify-content: center;
        border-radius: 4px;
        transition: background 0.2s;
      }

      .ft-close-button:hover {
        background: #f3f4f6;
      }

      .ft-bottom-sheet.dark .ft-close-button {
        color: #9ca3af;
      }

      .ft-bottom-sheet.dark .ft-close-button:hover {
        background: #333;
      }

      .ft-env-badge {
        padding: 8px 16px;
        font-weight: 700;
        font-size: 11px;
        color: white;
        text-align: center;
        letter-spacing: 1px;
      }

      .ft-search-container {
        padding: 16px 24px;
        border-bottom: 1px solid #e5e7eb;
        position: sticky;
        top: 0;
        background: white;
        z-index: 10;
      }

      .ft-bottom-sheet.dark .ft-search-container {
        background: #1a1a1a;
        border-bottom-color: #333;
      }

      .ft-search-input {
        width: 100%;
        padding: 10px 16px;
        border: 1px solid #e5e7eb;
        border-radius: 8px;
        font-size: 14px;
        outline: none;
        transition: border-color 0.2s;
        font-family: inherit;
      }

      .ft-bottom-sheet.dark .ft-search-input {
        background: #252525;
        border-color: #333;
        color: white;
      }

      .ft-search-input:focus {
        border-color: #667eea;
      }

      .ft-search-input::placeholder {
        color: #9ca3af;
      }

      .ft-sheet-content {
        flex: 1;
        overflow-y: auto;
        padding: 10px;
        padding-left: 10px;
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(240px, 300px));
        gap: 10px;
        justify-content: flex-start;
        align-content: start;
      }

      .ft-feature-item {
        padding: 16px;
        border: 1px solid #e5e7eb;
        border-radius: 8px;
        display: flex;
        flex-direction: column;
        justify-content: space-between;
        transition: background 0.2s, border-color 0.2s;
        height: 100%;
      }

      .ft-bottom-sheet.dark .ft-feature-item {
        border-color: #333;
      }

      .ft-feature-item:hover {
        background: #f9fafb;
        border-color: #d1d5db;
      }

      .ft-bottom-sheet.dark .ft-feature-item:hover {
        background: #252525;
        border-color: #404040;
      }

      .ft-feature-info {
        flex: 1;
        margin-bottom: 12px;
      }

      .ft-feature-name {
        font-weight: 600;
        margin-bottom: 6px;
        display: flex;
        align-items: center;
        gap: 8px;
        flex-wrap: wrap;
        font-size: 15px;
      }

      .ft-override-badge {
        font-size: 9px;
        padding: 2px 6px;
        background: #fbbf24;
        color: #78350f;
        border-radius: 4px;
        font-weight: 600;
        text-transform: uppercase;
        letter-spacing: 0.5px;
      }

      .ft-feature-description {
        font-size: 13px;
        color: #6b7280;
        margin: 0 0 6px 0;
        line-height: 1.4;
      }

      .ft-bottom-sheet.dark .ft-feature-description {
        color: #9ca3af;
      }

      .ft-feature-key {
        font-size: 11px;
        color: #9ca3af;
        font-family: 'Courier New', monospace;
        margin-top: 4px;
      }

      .ft-toggle-container {
        display: flex;
        justify-content: flex-end;
        align-items: center;
        padding-top: 8px;
        border-top: 1px solid #f3f4f6;
      }

      .ft-bottom-sheet.dark .ft-toggle-container {
        border-top-color: #333;
      }

      .ft-toggle-switch {
        position: relative;
        width: 48px;
        height: 28px;
        flex-shrink: 0;
      }

      .ft-toggle-input {
        opacity: 0;
        width: 0;
        height: 0;
      }

      .ft-toggle-slider {
        position: absolute;
        cursor: pointer;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background-color: #d1d5db;
        transition: 0.3s;
        border-radius: 28px;
      }

      .ft-toggle-slider:before {
        position: absolute;
        content: "";
        height: 20px;
        width: 20px;
        left: 4px;
        bottom: 4px;
        background-color: white;
        transition: 0.3s;
        border-radius: 50%;
      }

      .ft-toggle-input:checked + .ft-toggle-slider {
        background-color: #10b981;
      }

      .ft-toggle-input:checked + .ft-toggle-slider:before {
        transform: translateX(20px);
      }

      .ft-sheet-footer {
        padding: 16px 24px;
        border-top: 1px solid #e5e7eb;
        display: flex;
        gap: 12px;
        justify-content: flex-end;
      }

      .ft-bottom-sheet.dark .ft-sheet-footer {
        border-top-color: #333;
      }

      .ft-button {
        padding: 10px 20px;
        border: none;
        border-radius: 8px;
        font-size: 14px;
        font-weight: 600;
        cursor: pointer;
        transition: all 0.2s;
        min-width: 100px;
      }

      .ft-button-primary {
        background: #10b981;
        color: white;
      }

      .ft-button-primary:hover {
        background: #059669;
        transform: translateY(-1px);
        box-shadow: 0 2px 8px rgba(16, 185, 129, 0.3);
      }

      .ft-button-primary:active {
        transform: translateY(0);
      }

      .ft-button-secondary {
        background: #f3f4f6;
        color: #374151;
      }

      .ft-button-secondary:hover {
        background: #e5e7eb;
      }

      .ft-bottom-sheet.dark .ft-button-secondary {
        background: #333;
        color: #e5e7eb;
      }

      .ft-bottom-sheet.dark .ft-button-secondary:hover {
        background: #404040;
      }

      .ft-empty-state {
        text-align: center;
        padding: 48px 24px;
        color: #9ca3af;
        grid-column: 1 / -1;
      }

      .ft-empty-state-icon {
        font-size: 48px;
        margin-bottom: 16px;
      }

      .ft-no-results {
        text-align: center;
        padding: 48px 24px;
        color: #9ca3af;
        grid-column: 1 / -1;
      }

      .ft-no-results-icon {
        font-size: 48px;
        margin-bottom: 16px;
      }

      @media (max-width: 640px) {
        .ft-bottom-sheet {
          max-height: 90vh;
        }

        .ft-sheet-content {
          grid-template-columns: 1fr;
          padding: 12px 16px;
        }

        .ft-search-container {
          padding: 12px 16px;
        }

        .ft-sheet-header {
          padding: 16px;
        }

        .ft-sheet-footer {
          padding: 12px 16px;
        }
      }
    `;
    document.head.appendChild(style);
  }

  /**
   * Mantém o botão dentro do viewport
   * @private
   */
  _keepButtonInViewport(button) {
    const maxX = window.innerWidth - button.offsetWidth;
    const maxY = window.innerHeight - button.offsetHeight;

    let x = parseInt(button.style.left) || 0;
    let y = parseInt(button.style.top) || 0;

    x = Math.max(0, Math.min(x, maxX));
    y = Math.max(0, Math.min(y, maxY));

    button.style.left = x + 'px';
    button.style.top = y + 'px';

    // Salva nova posição
    localStorage.setItem(this.positionKey, JSON.stringify({ x, y }));
  }

  /**
   * Habilita drag no botão flutuante
   * @private
   */
  _enableDrag(button) {
    let startX = 0;
    let startY = 0;
    let initialMouseX = 0;
    let initialMouseY = 0;
    let wasDragged = false;
    const dragThreshold = 5;

    const onMouseDown = (e) => {
      const clientX = e.touches ? e.touches[0].clientX : e.clientX;
      const clientY = e.touches ? e.touches[0].clientY : e.clientY;

      this.dragging = true;
      wasDragged = false;
    
      initialMouseX = clientX;
      initialMouseY = clientY;

      const rect = button.getBoundingClientRect();
      startX = clientX - rect.left;
      startY = clientY - rect.top;

      if (e.type === 'mousedown') {
        document.addEventListener('mousemove', onMouseMove);
        document.addEventListener('mouseup', onMouseUp);
      } else {
        document.addEventListener('touchmove', onTouchMove, { passive: false });
        document.addEventListener('touchend', onTouchEnd);
      }
    };

    const onMouseMove = (e) => {
      if (!this.dragging) return;

      const clientX = e.touches ? e.touches[0].clientX : e.clientX;
      const clientY = e.touches ? e.touches[0].clientY : e.clientY;

      const moveX = Math.abs(clientX - initialMouseX);
      const moveY = Math.abs(clientY - initialMouseY);

      if (moveX > dragThreshold || moveY > dragThreshold) {
        wasDragged = true;
      }

      if (wasDragged) {
        const x = clientX - startX;
        const y = clientY - startY;

        button.style.left = `${x}px`;
        button.style.top = `${y}px`;
        button.style.bottom = 'auto';
        button.style.right = 'auto';
      }
    };

    const onMouseUp = (e) => {
      this.dragging = false;
    
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseup', onMouseUp);
      document.removeEventListener('touchmove', onTouchMove);
      document.removeEventListener('touchend', onTouchEnd);

      if (wasDragged) {
        this._keepButtonInViewport(button);
        this._saveButtonPosition(button);
      
        const clickPreventer = (event) => {
          event.stopImmediatePropagation();
          button.removeEventListener('click', clickPreventer, true);
        };
        button.addEventListener('click', clickPreventer, true);
      }
    };

    const onTouchMove = (e) => {
      if (e.cancelable) e.preventDefault();
      onMouseMove(e);
    };
    const onTouchEnd = (e) => onMouseUp(e);

    button.addEventListener('mousedown', onMouseDown);
    button.addEventListener('touchstart', onMouseDown, { passive: false });
  }

  /**
   * Salva posição do botão no localStorage
   * @private
   */
  _saveButtonPosition(button) {
    if (typeof localStorage === 'undefined') return;

    const rect = button.getBoundingClientRect();
    const position = {
      x: rect.left,
      y: rect.top
    };

    localStorage.setItem(this.positionKey, JSON.stringify(position));
  }

  /**
   * Carrega posição do botão do localStorage
   * @private
   */
  _loadButtonPosition() {
    if (typeof localStorage === 'undefined') return null;

    try {
      const data = localStorage.getItem(this.positionKey);
      return data ? JSON.parse(data) : null;
    } catch {
      return null;
    }
  }

  /**
   * Cria botão flutuante
   * @private
   */
  _createFloatingButton() {
    const button = document.createElement('button');
    button.className = `ft-floating-button ${this.uiConfig.position}`;
    button.innerHTML = '⚡';
    button.setAttribute('aria-label', 'Feature Toggles');

    // Aplica posição salva (se existir)
    const savedPosition = this._loadButtonPosition();
    if (savedPosition) {
      button.style.left = savedPosition.x + 'px';
      button.style.top = savedPosition.y + 'px';
      button.style.bottom = 'auto';
      button.style.right = 'auto';
    }

    // Aplica estilos customizados
    if (this.uiConfig.styles) {
      Object.assign(button.style, this.uiConfig.styles);
    }

    this._enableDrag(button);

    return button;
  }

  /**
   * Atualiza o badge de ambiente
   * @private
   */
  _updateEnvironmentBadge() {
    const badge = document.getElementById('ft-env-badge');
    if (!badge) return;

    const env = this.environments[this.environment];
    if (env) {
      badge.textContent = env.label;
      badge.style.backgroundColor = env.color;
    }
  }

  /**
   * Cria bottom sheet
   * @private
   */
  _createBottomSheet() {
    const overlay = document.createElement('div');
    overlay.className = 'ft-bottom-sheet-overlay';
    overlay.id = 'ft-overlay';

    const sheet = document.createElement('div');
    sheet.className = `ft-bottom-sheet ${this.uiConfig.theme === 'dark' ? 'dark' : ''}`;
    sheet.id = 'ft-sheet';

    // Environment Badge
    const envBadge = document.createElement('div');
    envBadge.className = 'ft-env-badge';
    envBadge.id = 'ft-env-badge';
    const env = this.environments[this.environment];
    envBadge.textContent = env.label;
    envBadge.style.backgroundColor = env.color;

    // Header
    const header = document.createElement('div');
    header.className = 'ft-sheet-header';
    header.innerHTML = `
      <h2 class="ft-sheet-title">⚡ Feature Toggles</h2>
      <button class="ft-close-button" id="ft-close">×</button>
    `;

    // Search Container
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

    // Content
    const content = document.createElement('div');
    content.className = 'ft-sheet-content';
    content.id = 'ft-content';

    // Footer
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

    // Event listeners
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) {
        this._closeBottomSheet();
      }
    });

    document.addEventListener('click', (e) => {
      if (e.target.id === 'ft-close') {
        this._closeBottomSheet();
      } else if (e.target.id === 'ft-save') {
        this._closeBottomSheet();
      } else if (e.target.id === 'ft-reset') {
        this._resetAllToggles();
      }
    });

    // Search functionality
    document.addEventListener('input', (e) => {
      if (e.target.id === 'ft-search') {
        this._filterFeatures(e.target.value);
      }
    });

    return overlay;
  }

  /**
   * Abre o bottom sheet
   * @private
   */
  _openBottomSheet() {
    const overlay = document.getElementById('ft-overlay');
    const sheet = document.getElementById('ft-sheet');
    const searchInput = document.getElementById('ft-search');
    
    // Limpa busca anterior
    if (searchInput) {
      searchInput.value = '';
    }
    
    this._updateEnvironmentBadge();
    this._renderFeatures();
    
    overlay.classList.add('open');
    setTimeout(() => {
      sheet.classList.add('open');
      // Foca no campo de busca após abrir
      if (searchInput) {
        setTimeout(() => searchInput.focus(), 100);
      }
    }, 10);
  }

  /**
   * Fecha o bottom sheet
   * @private
   */
  _closeBottomSheet() {
    const overlay = document.getElementById('ft-overlay');
    const sheet = document.getElementById('ft-sheet');
  
    sheet.classList.remove('open');
    setTimeout(() => overlay.classList.remove('open'), 300);
  }

  /**
   * Filtra features baseado no termo de busca
   * @private
   */
  _filterFeatures(searchTerm) {
    const content = document.getElementById('ft-content');
    const features = this.getAllFeatures();
    
    const term = searchTerm.toLowerCase().trim();
    
    const filteredFeatures = features.filter(feature => {
      const nameMatch = feature.name.toLowerCase().includes(term);
      const keyMatch = feature.key.toLowerCase().includes(term);
      const descMatch = feature.description.toLowerCase().includes(term);
      return nameMatch || keyMatch || descMatch;
    });

    if (filteredFeatures.length === 0) {
      content.innerHTML = `
        <div class="ft-no-results">
          <div class="ft-no-results-icon">🔍</div>
          <p>No features found matching "${searchTerm}"</p>
        </div>
      `;
      return;
    }

    this._renderFilteredFeatures(filteredFeatures);
  }

  /**
   * Renderiza features filtradas
   * @private
   */
  _renderFilteredFeatures(features) {
    const content = document.getElementById('ft-content');

    content.innerHTML = features.map(feature => `
      <div class="ft-feature-item">
        <div class="ft-feature-info">
          <div class="ft-feature-name">
            ${feature.name}
            ${feature.hasOverride ? '<span class="ft-override-badge">Manual</span>' : ''}
          </div>
          ${feature.description ? `<p class="ft-feature-description">${feature.description}</p>` : ''}
          <div class="ft-feature-key">${feature.key}</div>
        </div>
        <div class="ft-toggle-container">
          <label class="ft-toggle-switch">
            <input 
              type="checkbox" 
              class="ft-toggle-input" 
              data-feature-key="${feature.key}"
              ${feature.currentState ? 'checked' : ''}
            >
            <span class="ft-toggle-slider"></span>
          </label>
        </div>
      </div>
    `).join('');

    // Adiciona listeners aos toggles
    content.querySelectorAll('.ft-toggle-input').forEach(input => {
      input.addEventListener('change', (e) => {
        const key = e.target.dataset.featureKey;
        const enabled = e.target.checked;
        this.setOverride(key, enabled);
        
        // Re-renderiza mantendo o filtro atual
        const searchInput = document.getElementById('ft-search');
        if (searchInput && searchInput.value) {
          this._filterFeatures(searchInput.value);
        } else {
          this._renderFeatures();
        }
      });
    });
  }

  /**
   * Renderiza lista de features
   * @private
   */
  _renderFeatures() {
    const content = document.getElementById('ft-content');
    const features = this.getAllFeatures();

    if (features.length === 0) {
      content.innerHTML = `
        <div class="ft-empty-state">
          <div class="ft-empty-state-icon">📭</div>
          <p>No features registered</p>
        </div>
      `;
      return;
    }

    content.innerHTML = features.map(feature => `
      <div class="ft-feature-item">
        <div class="ft-feature-info">
          <div class="ft-feature-name">
            ${feature.name}
            ${feature.hasOverride ? '<span class="ft-override-badge">Manual</span>' : ''}
          </div>
          ${feature.description ? `<p class="ft-feature-description">${feature.description}</p>` : ''}
          <div class="ft-feature-key">${feature.key}</div>
        </div>
        <div class="ft-toggle-container">
          <label class="ft-toggle-switch">
            <input 
              type="checkbox" 
              class="ft-toggle-input" 
              data-feature-key="${feature.key}"
              ${feature.currentState ? 'checked' : ''}
            >
            <span class="ft-toggle-slider"></span>
          </label>
        </div>
      </div>
    `).join('');

    // Adiciona listeners aos toggles
    content.querySelectorAll('.ft-toggle-input').forEach(input => {
      input.addEventListener('change', (e) => {
        const key = e.target.dataset.featureKey;
        const enabled = e.target.checked;
        this.setOverride(key, enabled);
        this._renderFeatures();
      });
    });
  }

  /**
   * (Ponto 3) Aplica dados de toggles vindos do back-end.
   * O dev faz a chamada como quiser (fetch, axios, graphql...) e
   * passa aqui o response JÁ no formato { features: [{ key, defaultEnabled }] }.
   * Os valores remotos TÊM PREFERÊNCIA sobre os defaults das constantes.
   * @param {import('../types').RemoteConfig} response
   */
  applyRemoteFeatures(response) {
    this._applyRemoteConfig(response || {});
    return this;
  }

  /**
   * (Opcional) Conveniência: busca sozinho via fetch.
   * Prefira applyRemoteFeatures() se já tiver o response.
   */
  async setRemoteConfig(url, options = {}) {
    this.apiEndpoint = url;
    try {
      const response = await fetch(url, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json', ...options.headers },
        ...options,
      });
      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
      this._applyRemoteConfig(await response.json());
      return true;
    } catch (error) {
      console.error('Failed to fetch remote config, using local fallback:', error);
      return false;
    }
  }

  /**
   * Reseta todos os toggles
   * @private
   */
  _resetAllToggles() {
    if (confirm('Are you sure you want to reset all manual configurations?')) {
      this.clearAllOverrides();
      
      // Limpa o campo de busca
      const searchInput = document.getElementById('ft-search');
      if (searchInput) {
        searchInput.value = '';
      }
      
      this._renderFeatures();
    }
  }

  /**
   * Destrói a UI
   */
  destroyUI() {
    const button = document.querySelector('.ft-floating-button');
    const overlay = document.getElementById('ft-overlay');
    const styles = document.getElementById('feature-toggles-styles');

    if (button) button.remove();
    if (overlay) overlay.remove();
    if (styles) styles.remove();

    this.uiInitialized = false;
  }
}

// Instância singleton
const featureToggles = new FeatureToggles();

export { FeatureToggles, featureToggles };
export default featureToggles;

// Expor em window para debug manual no browser
if (typeof window !== 'undefined') {
  window.FeatureToggles = FeatureToggles;
  window.featureToggles = featureToggles;
}