export class FeatureStyles {
  static STYLE_ID = 'feature-toggles-styles';

  static inject() {
    if (typeof document === 'undefined') return;
    if (document.getElementById(FeatureStyles.STYLE_ID)) return;

    const style = document.createElement('style');
    style.id = FeatureStyles.STYLE_ID;
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

      .ft-floating-button.bottom-left { bottom: 24px; left: 24px; }
      .ft-floating-button.bottom-right { bottom: 24px; right: 24px; }
      .ft-floating-button.top-left { top: 24px; left: 24px; }
      .ft-floating-button.top-right { top: 24px; right: 24px; }

      .ft-bottom-sheet-overlay {
        position: fixed;
        top: 0; left: 0; right: 0; bottom: 0;
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
        bottom: 0; left: 0; right: 0;
        background: white;
        border-radius: 16px 16px 0 0;
        max-height: 80vh;
        transform: translateY(100%);
        transition: transform 0.3s ease-out;
        z-index: 10000;
        display: flex;
        flex-direction: column;
      }

      .ft-bottom-sheet.open { transform: translateY(0); }

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

      .ft-bottom-sheet.dark .ft-sheet-header { border-bottom-color: #333; }

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

      .ft-close-button:hover { background: #f3f4f6; }
      .ft-bottom-sheet.dark .ft-close-button { color: #9ca3af; }
      .ft-bottom-sheet.dark .ft-close-button:hover { background: #333; }

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
        box-sizing: border-box;
      }

      .ft-bottom-sheet.dark .ft-search-input {
        background: #252525;
        border-color: #333;
        color: white;
      }

      .ft-search-input:focus { border-color: #667eea; }
      .ft-search-input::placeholder { color: #9ca3af; }

      .ft-sheet-content {
        flex: 1;
        overflow-y: auto;
        padding: 10px;
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
        box-sizing: border-box;
      }

      .ft-bottom-sheet.dark .ft-feature-item { border-color: #333; }

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

      .ft-remote-badge {
        font-size: 9px;
        padding: 2px 6px;
        background: #dbeafe;
        color: #1e40af;
        border-radius: 4px;
        font-weight: 600;
        text-transform: uppercase;
        letter-spacing: 0.5px;
      }

      .ft-bottom-sheet.dark .ft-remote-badge {
        background: #1e3a5f;
        color: #93c5fd;
      }

      .ft-local-badge {
        font-size: 9px;
        padding: 2px 6px;
        background: #e5e7eb;
        color: #374151;
        border-radius: 4px;
        font-weight: 600;
        text-transform: uppercase;
        letter-spacing: 0.5px;
      }

      .ft-bottom-sheet.dark .ft-local-badge {
        background: #333;
        color: #d1d5db;
      }

      .ft-expired-badge {
        font-size: 9px;
        padding: 2px 6px;
        background: #fee2e2;
        color: #991b1b;
        border-radius: 4px;
        font-weight: 600;
        text-transform: uppercase;
        letter-spacing: 0.5px;
      }

      .ft-bottom-sheet.dark .ft-expired-badge {
        background: #450a0a;
        color: #fca5a5;
      }

      .ft-feature-dates {
        font-size: 10px;
        color: #9ca3af;
        margin-top: 4px;
        display: flex;
        flex-direction: column;
        gap: 1px;
      }

      .ft-feature-dates .ft-date-expired {
        color: #ef4444;
        font-weight: 600;
      }

      .ft-bottom-sheet.dark .ft-feature-dates { color: #6b7280; }
      .ft-bottom-sheet.dark .ft-feature-dates .ft-date-expired { color: #f87171; }

      .ft-feature-item.ft-item-expired {
        border-color: #fca5a5;
        background: #fff5f5;
      }

      .ft-bottom-sheet.dark .ft-feature-item.ft-item-expired {
        border-color: #7f1d1d;
        background: #1c0a0a;
      }

      .ft-feature-description {
        font-size: 13px;
        color: #6b7280;
        margin: 0 0 6px 0;
        line-height: 1.4;
        display: -webkit-box;
        -webkit-box-orient: vertical;
        -webkit-line-clamp: 2;
        overflow: hidden;
      }

      .ft-bottom-sheet.dark .ft-feature-description { color: #9ca3af; }

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

      .ft-bottom-sheet.dark .ft-toggle-container { border-top-color: #333; }

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
        top: 0; left: 0; right: 0; bottom: 0;
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

      .ft-toggle-input:checked + .ft-toggle-slider { background-color: #10b981; }
      .ft-toggle-input:checked + .ft-toggle-slider:before { transform: translateX(20px); }

      .ft-sheet-footer {
        padding: 16px 24px;
        border-top: 1px solid #e5e7eb;
        display: flex;
        gap: 12px;
        justify-content: flex-end;
      }

      .ft-bottom-sheet.dark .ft-sheet-footer { border-top-color: #333; }

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

      .ft-button-primary:active { transform: translateY(0); }

      .ft-button-secondary {
        background: #f3f4f6;
        color: #374151;
      }

      .ft-button-secondary:hover { background: #e5e7eb; }

      .ft-bottom-sheet.dark .ft-button-secondary {
        background: #333;
        color: #e5e7eb;
      }

      .ft-bottom-sheet.dark .ft-button-secondary:hover { background: #404040; }

      .ft-empty-state, .ft-no-results {
        text-align: center;
        padding: 48px 24px;
        color: #9ca3af;
        grid-column: 1 / -1;
      }

      .ft-empty-state-icon, .ft-no-results-icon {
        font-size: 48px;
        margin-bottom: 16px;
      }

      @media (max-width: 640px) {
        .ft-bottom-sheet { max-height: 90vh; }
        .ft-sheet-content {
          grid-template-columns: 1fr;
          padding: 12px 16px;
        }
        .ft-search-container { padding: 12px 16px; }
        .ft-sheet-header { padding: 16px; }
        .ft-sheet-footer { padding: 12px 16px; }
      }
    `;
    document.head.appendChild(style);
  }

  static remove() {
    if (typeof document === 'undefined') return;
    const style = document.getElementById(FeatureStyles.STYLE_ID);
    if (style) {
      style.remove();
    }
  }
}