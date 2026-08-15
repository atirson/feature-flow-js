class FeatureRegistry {
  constructor() {
    this.features = new Map();
  }

  registerFeature(config) {
    if (!config.key) {
      throw new Error('Feature key is required');
    }

    this.features.set(config.key, {
      key: config.key,
      name: config.name || config.key,
      description: config.description || '',
      defaultEnabled: config.defaultEnabled ?? false,
      rolloutRule: config.rolloutRule || null,
      remote: false,
      createdAt: config.createdAt || null,
      expiredAt: config.expiredAt || null,
    });

    return this.features.get(config.key);
  }

  registerFeatures(configs) {
    (configs || []).forEach(config => this.registerFeature(config));
  }

  hasFeature(key) {
    return this.features.has(key);
  }

  getFeature(key) {
    return this.features.get(key);
  }

  getAll() {
    return Array.from(this.features.values());
  }

  applyRemoteFeatures(response) {
    const list = response?.remoteFeature || response?.features || (Array.isArray(response) ? response : []);
    const appliedKeys = [];
  
    list.forEach(item => {
      if (!item?.key) return;
      
      appliedKeys.push(item.key);
      const existing = this.features.get(item.key);
  
      if (existing) {
        existing.defaultEnabled = item.defaultEnabled ?? existing.defaultEnabled;
        existing.remote = true;
        if (item.name) existing.name = item.name;
        if (item.description) existing.description = item.description;
        if (item.createdAt) existing.createdAt = item.createdAt;
        if (item.expiredAt) existing.expiredAt = item.expiredAt;
      } else {
        this.features.set(item.key, {
          key: item.key,
          name: item.name || item.key,
          description: item.description || '',
          defaultEnabled: item.defaultEnabled ?? false,
          rolloutRule: null,
          remote: true,
          createdAt: item.createdAt || null,
          expiredAt: item.expiredAt || null,
        });
      }
    });
  
    return appliedKeys;
  }

  clear() {
    this.features.clear();
  }
}

export { FeatureRegistry };
export default FeatureRegistry;
