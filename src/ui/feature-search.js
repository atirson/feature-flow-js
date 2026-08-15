export class FeatureSearch {
  constructor({ getFeatures, setOverride }) {
    this.getFeatures = getFeatures;
    this.setOverride = setOverride;
  }

  featureCardHTML(feature) {
    const originBadge = feature.remote
      ? '<span class="ft-remote-badge">Remote</span>'
      : '<span class="ft-local-badge">Local</span>';

    const manualBadge = feature.hasOverride
      ? '<span class="ft-override-badge">Manual</span>'
      : '';

    const expiredBadge = feature.isExpired
      ? '<span class="ft-expired-badge">⚠ Expired</span>'
      : '';

    const formatDate = (dateStr) => {
      if (!dateStr) return null;
      try {
        return new Date(dateStr).toLocaleDateString(undefined, {
          year: 'numeric', month: 'short', day: 'numeric',
        });
      } catch {
        return dateStr;
      }
    };

    const createdLabel = feature.createdAt
      ? `<span>Created: ${formatDate(feature.createdAt)}</span>`
      : '';
    const expiredLabel = feature.expiredAt
      ? `<span class="${feature.isExpired ? 'ft-date-expired' : ''}">Expires: ${formatDate(feature.expiredAt)}</span>`
      : '';
    const datesBlock = (createdLabel || expiredLabel)
      ? `<div class="ft-feature-dates">${createdLabel}${expiredLabel}</div>`
      : '';

    return `
      <div class="ft-feature-item${feature.isExpired ? ' ft-item-expired' : ''}">
        <div class="ft-feature-info">
          <div class="ft-feature-name">
            ${feature.name}
            ${originBadge}
            ${manualBadge}
            ${expiredBadge}
          </div>
          ${feature.description ? `<p class="ft-feature-description">${feature.description}</p>` : ''}
          <div class="ft-feature-key">${feature.key}</div>
          ${datesBlock}
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
    `;
  }

  attachToggleListeners(content, afterChange) {
    content.querySelectorAll('.ft-toggle-input').forEach(input => {
      input.addEventListener('change', (e) => {
        const key = e.target.dataset.featureKey;
        const enabled = e.target.checked;
        this.setOverride(key, enabled);
        if (afterChange) afterChange();
      });
    });
  }

  filterFeatures(searchTerm) {
    const content = document.getElementById('ft-content');
    if (!content) return;

    const features = this.getFeatures();
    const term = searchTerm.toLowerCase().trim();

    const filteredFeatures = features.filter(feature => {
      const nameMatch = (feature.name || '').toLowerCase().includes(term);
      const keyMatch = (feature.key || '').toLowerCase().includes(term);
      const descMatch = (feature.description || '').toLowerCase().includes(term);
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

    this.renderFilteredFeatures(filteredFeatures);
  }

  renderFilteredFeatures(features) {
    const content = document.getElementById('ft-content');
    if (!content) return;

    content.innerHTML = features.map(f => this.featureCardHTML(f)).join('');
    this.attachToggleListeners(content, () => {
      const searchInput = document.getElementById('ft-search');
      if (searchInput && searchInput.value) this.filterFeatures(searchInput.value);
      else this.renderFeatures();
    });
  }

  renderFeatures() {
    const content = document.getElementById('ft-content');
    if (!content) return;

    const features = this.getFeatures();

    if (features.length === 0) {
      content.innerHTML = `
        <div class="ft-empty-state">
          <div class="ft-empty-state-icon">📭</div>
          <p>No features registered</p>
        </div>
      `;
      return;
    }

    content.innerHTML = features.map(f => this.featureCardHTML(f)).join('');
    this.attachToggleListeners(content, () => this.renderFeatures());
  }
}