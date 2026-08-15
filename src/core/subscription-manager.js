class SubscriptionManager {
  constructor() {
    this.listeners = new Set();
  }

  subscribe(listener) {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  notify(payload) {
    this.listeners.forEach(listener => {
      try {
        listener(payload);
      } catch (error) {
        console.error('Error in feature toggle listener:', error);
      }
    });
  }

  clear() {
    this.listeners.clear();
  }
}

export { SubscriptionManager };
export default SubscriptionManager;
