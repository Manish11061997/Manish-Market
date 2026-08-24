import React, { useCallback, useEffect, useRef } from 'react';

const FOCUSABLE_SELECTOR =
  'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';

export function Modal({ open, onClose, title, width = '480px', children }) {
  const cardRef = useRef(null);
  const previouslyFocusedRef = useRef(null);

  useEffect(() => {
    if (!open) return undefined;

    previouslyFocusedRef.current = document.activeElement;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    if (cardRef.current) {
      cardRef.current.focus();
    }

    return () => {
      document.body.style.overflow = previousOverflow || '';
      const el = previouslyFocusedRef.current;
      if (el && typeof el.focus === 'function') {
        el.focus();
      }
      previouslyFocusedRef.current = null;
    };
  }, [open]);

  const handleKeyDown = useCallback(
    (event) => {
      if (!open) return;
      if (event.key === 'Escape') {
        event.stopPropagation();
        onClose?.();
        return;
      }
      if (event.key !== 'Tab' || !cardRef.current) return;

      const focusable = Array.from(
        cardRef.current.querySelectorAll(FOCUSABLE_SELECTOR)
      ).filter((el) => el.offsetParent !== null || el === document.activeElement);

      if (focusable.length === 0) {
        event.preventDefault();
        cardRef.current.focus();
        return;
      }

      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      const active = document.activeElement;

      if (event.shiftKey) {
        if (active === first || active === cardRef.current) {
          event.preventDefault();
          last.focus();
        }
      } else if (active === last) {
        event.preventDefault();
        first.focus();
      }
    },
    [open, onClose]
  );

  if (!open) return null;

  return (
    <div
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose?.();
      }}
      onKeyDown={handleKeyDown}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 'var(--z-modal)',
        backgroundColor: 'rgba(4, 6, 10, 0.75)',
        backdropFilter: 'blur(6px)',
        WebkitBackdropFilter: 'blur(6px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '12px'
      }}
    >
      <div
        ref={cardRef}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        tabIndex={-1}
        className="modal-dialog-card m3-bottom-sheet m3-bottom-sheet-modal"
        onClick={(event) => event.stopPropagation()}
        style={{
          width,
          maxWidth: '100%',
          maxHeight: 'calc(100vh - 24px)',
          overflowY: 'auto',
          background: 'var(--md-sys-color-surface-container)',
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
          border: '1px solid var(--md-sys-color-outline-variant)',
          borderRadius: 'var(--md-shape-corner-xl)',
          boxShadow: '0 24px 60px -12px rgba(0, 0, 0, 0.8)',
          outline: 'none',
          fontFamily: "'Plus Jakarta Sans', sans-serif",
          color: 'var(--text-main)'
        }}
      >
        {/* M3 Drag Handle */}
        <div className="m3-drag-handle" aria-hidden="true" />

        {title && (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '16px',
              padding: '12px 22px 18px 22px',
              borderBottom: '1px solid var(--md-sys-color-outline-variant)'
            }}
          >
            {title && (
              <h2
                style={{
                  fontSize: '16px',
                  fontWeight: 800,
                  letterSpacing: '-0.01em',
                  color: 'var(--text-main)',
                  margin: 0
                }}
              >
                {title}
              </h2>
            )}
            {onClose && (
              <button
                type="button"
                onClick={onClose}
                aria-label="Close dialog"
                className="m3-icon-button"
                style={{
                  width: '32px',
                  height: '32px',
                  borderRadius: '16px',
                  background: 'var(--md-sys-color-surface-container-high)',
                  border: '1px solid var(--md-sys-color-outline-variant)',
                  color: 'var(--text-muted)',
                  fontSize: '14px',
                  lineHeight: 1,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  transition: 'color 0.2s ease'
                }}
              >
                ✕
              </button>
            )}
          </div>
        )}
        <div style={{ padding: '10px 12px' }}>{children}</div>
      </div>
    </div>
  );
}

export function ErrorBanner({ message, onRetry }) {
  return (
    <div
      role="alert"
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '10px',
        padding: '10px 14px',
        marginBottom: '16px',
        borderRadius: 'var(--radius-md)',
        backgroundColor: 'var(--accent-red-bg)',
        border: '1px solid rgba(255, 23, 68, 0.35)'
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0 }}>
        <span aria-hidden="true" style={{ fontSize: '14px' }}>⚠</span>
        <span style={{ fontSize: '12px', fontWeight: 700, color: '#ff5c8a' }}>
          {message}
        </span>
      </div>
      {onRetry && (
        <button
          type="button"
          onClick={onRetry}
          style={{
            background: 'var(--accent-red-bg)',
            border: '1px solid rgba(255, 23, 68, 0.4)',
            color: '#ff5c8a',
            fontSize: '11px',
            fontWeight: 700,
            padding: '5px 12px',
            borderRadius: 'var(--radius-sm)',
            cursor: 'pointer',
            transition: 'all 0.2s ease'
          }}
        >
          Retry
        </button>
      )}
    </div>
  );
}

export function EmptyState({ icon = '📭', title, subtitle }) {
  return (
    <div
      style={{
        textAlign: 'center',
        padding: '56px 24px',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: '8px'
      }}
    >
      {icon && (
        <div aria-hidden="true" style={{ fontSize: '36px', marginBottom: '4px' }}>
          {icon}
        </div>
      )}
      <div style={{ fontSize: '14px', fontWeight: 800, color: 'var(--text-main)' }}>
        {title}
      </div>
      {subtitle && (
        <div style={{ fontSize: '12px', color: 'var(--text-muted)', maxWidth: '420px' }}>
          {subtitle}
        </div>
      )}
    </div>
  );
}

export function Spinner({ size = 40 }) {
  return (
    <div
      role="status"
      aria-label="Loading"
      style={{
        width: `${size}px`,
        height: `${size}px`,
        border: '3px solid var(--accent-blue)',
        borderTopColor: 'transparent',
        borderRadius: '50%',
        animation: 'spin 1s linear infinite',
        margin: '0 auto'
      }}
    />
  );
}

export class TabErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error("Tab Error:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="pro-card-glass" style={{
          padding: '40px 24px',
          textAlign: 'center',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '12px',
          margin: '20px auto',
          maxWidth: '520px'
        }}>
          <div style={{ fontSize: '32px' }}>⚠️</div>
          <h3 style={{ fontSize: '16px', fontWeight: 800, color: 'var(--text-main)', margin: 0 }}>
            Unable to display this view
          </h3>
          <p style={{ fontSize: '12px', color: 'var(--text-muted)', margin: 0, lineHeight: 1.5 }}>
            {this.state.error?.message || 'A temporary rendering error occurred in this view.'}
          </p>
          <button
            onClick={() => this.setState({ hasError: false, error: null })}
            style={{
              padding: '8px 16px',
              borderRadius: '8px',
              backgroundColor: 'var(--accent-blue)',
              color: 'var(--bg-dark)',
              fontWeight: 800,
              fontSize: '12px',
              border: 'none',
              cursor: 'pointer',
              marginTop: '8px'
            }}
          >
            Retry View
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

export default Modal;
