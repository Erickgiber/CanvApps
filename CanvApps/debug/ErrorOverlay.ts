/**
 * CanvApps Visual Error Overlay Debugger (Vercel-style Error Modal)
 *
 * Catches runtime, compiler, and syntax errors, displaying a high-contrast,
 * frosted-glass modal overlay with source codeframe, line numbers, error diagnostics,
 * and quick-action tools (Copy, Reload, Dismiss).
 */

export interface ErrorDetails {
  title?: string;
  message: string;
  file?: string;
  line?: number;
  column?: number;
  frame?: string;
  stack?: string;
  sourceCode?: string;
}

export class CanvAppsErrorOverlay {
  private static container: HTMLElement | null = null;
  private static isInitialized = false;

  /**
   * Initializes global window error listeners to capture unhandled errors and rejections.
   */
  public static initGlobalErrorHandling(): void {
    if (this.isInitialized || typeof window === 'undefined') return;
    this.isInitialized = true;

    window.addEventListener('error', (event) => {
      CanvAppsErrorOverlay.showError({
        title: 'CanvApps Runtime Error',
        message: event.message || 'An unhandled exception occurred in the application.',
        file: event.filename,
        line: event.lineno,
        column: event.colno,
        stack: event.error?.stack,
      });
    });

    window.addEventListener('unhandledrejection', (event) => {
      const reason = event.reason;
      const message = typeof reason === 'object' && reason !== null ? reason.message || String(reason) : String(reason);
      const stack = typeof reason === 'object' && reason !== null ? reason.stack : undefined;
      CanvAppsErrorOverlay.showError({
        title: 'Unhandled Promise Rejection',
        message,
        stack,
      });
    });

    window.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        CanvAppsErrorOverlay.hideError();
      }
    });
  }

  /**
   * Generates a syntax-highlighted code frame around the error location.
   */
  public static generateCodeFrame(source: string, errorLine: number, errorCol = 1, contextLines = 4): string {
    if (!source) return '';
    const lines = source.split('\n');
    const start = Math.max(0, errorLine - 1 - contextLines);
    const end = Math.min(lines.length, errorLine + contextLines);
    const maxLineNumWidth = String(end).length;

    const frameLines: string[] = [];

    for (let i = start; i < end; i++) {
      const lineNum = i + 1;
      const isTargetLine = lineNum === errorLine;
      const prefix = isTargetLine ? '> ' : '  ';
      const numStr = String(lineNum).padStart(maxLineNumWidth, ' ');
      frameLines.push(`${prefix}${numStr} | ${lines[i]}`);

      if (isTargetLine && errorCol > 0) {
        const indent = ' '.repeat(prefix.length + maxLineNumWidth + 3 + Math.max(0, errorCol - 1));
        frameLines.push(`${indent}^`);
      }
    }

    return frameLines.join('\n');
  }

  /**
   * Displays the custom visual error overlay modal on screen.
   */
  public static showError(details: ErrorDetails | Error | string): void {
    if (typeof document === 'undefined') return;

    let payload: ErrorDetails;
    if (typeof details === 'string') {
      payload = { message: details };
    } else if (details instanceof Error) {
      payload = {
        title: details.name || 'CanvApps Application Error',
        message: details.message,
        stack: details.stack,
      };
    } else {
      payload = details;
    }

    if (!payload.frame && payload.sourceCode && payload.line) {
      payload.frame = this.generateCodeFrame(payload.sourceCode, payload.line, payload.column);
    }

    this.ensureOverlay(payload);
  }

  /**
   * Closes and removes the visual error overlay modal.
   */
  public static hideError(): void {
    if (this.container && this.container.parentElement) {
      this.container.parentElement.removeChild(this.container);
      this.container = null;
    }
  }

  private static ensureOverlay(details: ErrorDetails): void {
    if (!this.container) {
      this.container = document.createElement('div');
      this.container.id = 'canvapps-error-overlay-root';
      document.body.appendChild(this.container);
    }

    const title = details.title || 'CanvApps Diagnostic Error';
    const message = details.message || 'Unknown error occurred.';
    const file = details.file ? details.file.replace(/^file:\/\//, '') : '';
    const loc = details.line ? `:${details.line}${details.column ? `:${details.column}` : ''}` : '';
    const fileLabel = file ? `${file}${loc}` : '';

    const cleanStack = details.stack
      ? details.stack.split('\n').slice(1).join('\n')
      : '';

    this.container.innerHTML = `
      <style>
        #canvapps-error-overlay-root {
          position: fixed;
          top: 0;
          left: 0;
          width: 100vw;
          height: 100vh;
          z-index: 9999999;
          display: flex;
          align-items: center;
          justify-content: center;
          background: rgba(0, 0, 0, 0.78);
          backdrop-filter: blur(18px);
          -webkit-backdrop-filter: blur(18px);
          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
          color: #f1f5f9;
          padding: 24px;
          box-sizing: border-box;
          animation: canvappsFadeIn 0.2s cubic-bezier(0.16, 1, 0.3, 1);
        }

        @keyframes canvappsFadeIn {
          from { opacity: 0; transform: scale(0.98); }
          to { opacity: 1; transform: scale(1); }
        }

        .canvapps-modal-card {
          width: 100%;
          max-width: 820px;
          max-height: 88vh;
          background: #0f172a;
          border: 1px solid rgba(239, 68, 68, 0.35);
          border-radius: 16px;
          box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.7), 0 0 35px rgba(239, 68, 68, 0.15);
          display: flex;
          flex-direction: column;
          overflow: hidden;
        }

        .canvapps-modal-header {
          padding: 16px 20px;
          background: #1e293b;
          border-bottom: 1px solid #334155;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
        }

        .canvapps-header-left {
          display: flex;
          align-items: center;
          gap: 10px;
          overflow: hidden;
        }

        .canvapps-error-badge {
          background: #ef4444;
          color: #ffffff;
          font-size: 11px;
          font-weight: 700;
          letter-spacing: 0.5px;
          text-transform: uppercase;
          padding: 4px 8px;
          border-radius: 6px;
          flex-shrink: 0;
        }

        .canvapps-file-path {
          font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
          font-size: 13px;
          color: #94a3b8;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .canvapps-close-btn {
          background: transparent;
          border: none;
          color: #94a3b8;
          font-size: 20px;
          cursor: pointer;
          padding: 4px 8px;
          border-radius: 6px;
          line-height: 1;
          transition: background 0.15s, color 0.15s;
        }

        .canvapps-close-btn:hover {
          background: #334155;
          color: #f1f5f9;
        }

        .canvapps-modal-body {
          padding: 20px;
          overflow-y: auto;
          display: flex;
          flex-direction: column;
          gap: 16px;
        }

        .canvapps-error-title {
          font-size: 18px;
          font-weight: 700;
          color: #f87171;
          margin: 0;
          line-height: 1.4;
          word-break: break-word;
        }

        .canvapps-code-frame {
          background: #020617;
          border: 1px solid #1e293b;
          border-radius: 10px;
          padding: 14px 16px;
          font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
          font-size: 12.5px;
          line-height: 1.5;
          color: #f1f5f9;
          overflow-x: auto;
          white-space: pre;
        }

        .canvapps-code-frame .highlight-line {
          color: #f87171;
          font-weight: bold;
          background: rgba(239, 68, 68, 0.12);
          display: block;
          margin: 0 -16px;
          padding: 0 16px;
        }

        .canvapps-stack-section {
          display: flex;
          flex-direction: column;
          gap: 6px;
        }

        .canvapps-stack-toggle {
          background: none;
          border: none;
          color: #94a3b8;
          font-size: 12px;
          font-weight: 600;
          cursor: pointer;
          padding: 0;
          text-align: left;
          display: flex;
          align-items: center;
          gap: 6px;
        }

        .canvapps-stack-toggle:hover {
          color: #cbd5e1;
        }

        .canvapps-stack-content {
          background: #020617;
          border: 1px solid #1e293b;
          border-radius: 8px;
          padding: 12px 14px;
          font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
          font-size: 11.5px;
          line-height: 1.5;
          color: #64748b;
          overflow-x: auto;
          white-space: pre-wrap;
          max-height: 160px;
        }

        .canvapps-modal-footer {
          padding: 14px 20px;
          background: #1e293b;
          border-top: 1px solid #334155;
          display: flex;
          align-items: center;
          justify-content: flex-end;
          gap: 10px;
        }

        .canvapps-btn {
          padding: 8px 16px;
          border-radius: 8px;
          font-size: 13px;
          font-weight: 600;
          cursor: pointer;
          border: 1px solid transparent;
          transition: all 0.15s;
        }

        .canvapps-btn-secondary {
          background: #334155;
          color: #f1f5f9;
        }

        .canvapps-btn-secondary:hover {
          background: #475569;
        }

        .canvapps-btn-primary {
          background: #0284c7;
          color: #ffffff;
        }

        .canvapps-btn-primary:hover {
          background: #0369a1;
        }
      </style>

      <div class="canvapps-modal-card" role="dialog" aria-modal="true">
        <div class="canvapps-modal-header">
          <div class="canvapps-header-left">
            <span class="canvapps-error-badge">CanvApps Debugger</span>
            ${fileLabel ? `<span class="canvapps-file-path">${this.escapeHtml(fileLabel)}</span>` : ''}
          </div>
          <button class="canvapps-close-btn" id="canvapps-btn-close" aria-label="Close Error Modal">×</button>
        </div>

        <div class="canvapps-modal-body">
          <h2 class="canvapps-error-title">${this.escapeHtml(title)}: ${this.escapeHtml(message)}</h2>

          ${details.frame ? `<pre class="canvapps-code-frame">${this.formatCodeFrame(details.frame)}</pre>` : ''}

          ${cleanStack ? `
            <div class="canvapps-stack-section">
              <button class="canvapps-stack-toggle" id="canvapps-stack-toggle">
                <span>▶ Call Stack</span>
              </button>
              <pre class="canvapps-stack-content" id="canvapps-stack-content" style="display: none;">${this.escapeHtml(cleanStack)}</pre>
            </div>
          ` : ''}
        </div>

        <div class="canvapps-modal-footer">
          <button class="canvapps-btn canvapps-btn-secondary" id="canvapps-btn-copy">📋 Copy Error</button>
          <button class="canvapps-btn canvapps-btn-secondary" id="canvapps-btn-dismiss">Dismiss (Esc)</button>
          <button class="canvapps-btn canvapps-btn-primary" id="canvapps-btn-reload">🔄 Reload Page</button>
        </div>
      </div>
    `;

    // Bind event listeners
    const closeBtn = document.getElementById('canvapps-btn-close');
    const dismissBtn = document.getElementById('canvapps-btn-dismiss');
    const reloadBtn = document.getElementById('canvapps-btn-reload');
    const copyBtn = document.getElementById('canvapps-btn-copy');
    const stackToggle = document.getElementById('canvapps-stack-toggle');
    const stackContent = document.getElementById('canvapps-stack-content');

    closeBtn?.addEventListener('click', () => this.hideError());
    dismissBtn?.addEventListener('click', () => this.hideError());
    reloadBtn?.addEventListener('click', () => {
      if (typeof window !== 'undefined') window.location.reload();
    });

    stackToggle?.addEventListener('click', () => {
      if (stackContent) {
        const isHidden = stackContent.style.display === 'none';
        stackContent.style.display = isHidden ? 'block' : 'none';
        const span = stackToggle.querySelector('span');
        if (span) span.textContent = isHidden ? '▼ Call Stack' : '▶ Call Stack';
      }
    });

    copyBtn?.addEventListener('click', () => {
      const copyText = `[${title}]: ${message}\n${fileLabel ? `Location: ${fileLabel}\n` : ''}\n${details.frame ? `Code:\n${details.frame}\n` : ''}${details.stack ? `\nStack:\n${details.stack}` : ''}`;
      if (navigator.clipboard) {
        navigator.clipboard.writeText(copyText).then(() => {
          if (copyBtn) copyBtn.textContent = '✓ Copied!';
          setTimeout(() => {
            if (copyBtn) copyBtn.textContent = '📋 Copy Error';
          }, 2000);
        }).catch(() => {});
      }
    });
  }

  private static formatCodeFrame(frame: string): string {
    const lines = frame.split('\n');
    return lines.map((line) => {
      const escaped = this.escapeHtml(line);
      if (line.startsWith('>')) {
        return `<span class="highlight-line">${escaped}</span>`;
      }
      return escaped;
    }).join('\n');
  }

  private static escapeHtml(str: string): string {
    return (str || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }
}

export function showErrorOverlay(details: ErrorDetails | Error | string): void {
  CanvAppsErrorOverlay.showError(details);
}

export function hideErrorOverlay(): void {
  CanvAppsErrorOverlay.hideError();
}
