export class FeatureFloatingButton {
  constructor({ positionKey, position = 'bottom-right', customStyles = {}, onClick }) {
    this.positionKey = positionKey;
    this.position = position;
    this.customStyles = customStyles;
    this.onClick = onClick;
    this.element = null;
    this.dragging = false;

    this._onResize = this._onResize.bind(this);
    this._onMouseDown = this._onMouseDown.bind(this);
    this._onMouseMove = this._onMouseMove.bind(this);
    this._onMouseUp = this._onMouseUp.bind(this);
    this._onTouchMove = this._onTouchMove.bind(this);
    this._onTouchEnd = this._onTouchEnd.bind(this);

    this.startX = 0;
    this.startY = 0;
    this.initialMouseX = 0;
    this.initialMouseY = 0;
    this.wasDragged = false;
    this.dragThreshold = 5;
  }

  render() {
    const button = document.createElement('button');
    button.className = `ft-floating-button ${this.position}`;
    button.innerHTML = '⚡';
    button.setAttribute('aria-label', 'Feature Toggles');

    const savedPosition = this._loadButtonPosition();
    if (savedPosition) {
      button.style.left = savedPosition.x + 'px';
      button.style.top = savedPosition.y + 'px';
      button.style.bottom = 'auto';
      button.style.right = 'auto';
    }

    if (this.customStyles) {
      Object.assign(button.style, this.customStyles);
    }

    this.element = button;
    this._enableDrag();

    if (this.onClick) {
      button.addEventListener('click', this.onClick);
    }

    window.addEventListener('resize', this._onResize);
    return button;
  }

  _onResize() {
    if (this.element) {
      this.keepInViewport();
    }
  }

  keepInViewport() {
    if (!this.element) return;
    const maxX = window.innerWidth - this.element.offsetWidth;
    const maxY = window.innerHeight - this.element.offsetHeight;

    let x = parseInt(this.element.style.left) || 0;
    let y = parseInt(this.element.style.top) || 0;

    x = Math.max(0, Math.min(x, maxX));
    y = Math.max(0, Math.min(y, maxY));

    this.element.style.left = x + 'px';
    this.element.style.top = y + 'px';

    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(this.positionKey, JSON.stringify({ x, y }));
    }
  }

  _enableDrag() {
    if (!this.element) return;
    this.element.addEventListener('mousedown', this._onMouseDown);
    this.element.addEventListener('touchstart', this._onMouseDown, { passive: false });
  }

  _onMouseDown(e) {
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;

    this.dragging = true;
    this.wasDragged = false;

    this.initialMouseX = clientX;
    this.initialMouseY = clientY;

    const rect = this.element.getBoundingClientRect();
    this.startX = clientX - rect.left;
    this.startY = clientY - rect.top;

    if (e.type === 'mousedown') {
      document.addEventListener('mousemove', this._onMouseMove);
      document.addEventListener('mouseup', this._onMouseUp);
    } else {
      document.addEventListener('touchmove', this._onTouchMove, { passive: false });
      document.addEventListener('touchend', this._onTouchEnd);
    }
  }

  _onMouseMove(e) {
    if (!this.dragging) return;

    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;

    const moveX = Math.abs(clientX - this.initialMouseX);
    const moveY = Math.abs(clientY - this.initialMouseY);

    if (moveX > this.dragThreshold || moveY > this.dragThreshold) {
      this.wasDragged = true;
    }

    if (this.wasDragged) {
      const x = clientX - this.startX;
      const y = clientY - this.startY;

      this.element.style.left = `${x}px`;
      this.element.style.top = `${y}px`;
      this.element.style.bottom = 'auto';
      this.element.style.right = 'auto';
    }
  }

  _onTouchMove(e) {
    if (e.cancelable) e.preventDefault();
    this._onMouseMove(e);
  }

  _onMouseUp() {
    this.dragging = false;

    document.removeEventListener('mousemove', this._onMouseMove);
    document.removeEventListener('mouseup', this._onMouseUp);
    document.removeEventListener('touchmove', this._onTouchMove);
    document.removeEventListener('touchend', this._onTouchEnd);

    if (this.wasDragged) {
      this.keepInViewport();
      this._saveButtonPosition();

      const clickPreventer = (event) => {
        event.stopImmediatePropagation();
        this.element.removeEventListener('click', clickPreventer, true);
      };
      this.element.addEventListener('click', clickPreventer, true);
    }
  }

  _onTouchEnd() {
    this._onMouseUp();
  }

  _saveButtonPosition() {
    if (typeof localStorage === 'undefined' || !this.element) return;
    const rect = this.element.getBoundingClientRect();
    localStorage.setItem(this.positionKey, JSON.stringify({
      x: rect.left,
      y: rect.top,
    }));
  }

  _loadButtonPosition() {
    if (typeof localStorage === 'undefined') return null;
    try {
      const data = localStorage.getItem(this.positionKey);
      return data ? JSON.parse(data) : null;
    } catch {
      return null;
    }
  }

  destroy() {
    window.removeEventListener('resize', this._onResize);
    if (this.element) {
      this.element.removeEventListener('mousedown', this._onMouseDown);
      this.element.removeEventListener('touchstart', this._onMouseDown);
      this.element.remove();
      this.element = null;
    }
  }
}