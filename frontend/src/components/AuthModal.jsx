import React, { useState } from 'react';
import { ShieldCheck, Sparkles, X, ArrowRight, CheckCircle2 } from 'lucide-react';
import { useAuth } from '../utils/useAuth';
import LogoHexagon from './LogoHexagon';
import GoogleSignInModal from './GoogleSignInModal';

export default function AuthModal({ isOpen, onClose, currentMarket = 'IN', onMarketChange }) {
  const [localError, setLocalError] = useState(null);
  const [showGoogleModal, setShowGoogleModal] = useState(false);
  const { loginWithGoogle, loading } = useAuth();

  if (!isOpen) return null;

  const handleGoogleSignIn = async () => {
    setLocalError(null);
    try {
      await loginWithGoogle(null, null, currentMarket);
      if (onMarketChange) onMarketChange(currentMarket);
      onClose();
    } catch (err) {
      console.warn('Google popup notice in modal, opening account selector:', err);
      setShowGoogleModal(true);
    }
  };

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0,0,0,0.8)',
      backdropFilter: 'blur(10px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 2000,
      padding: '16px'
    }}>
      <div className="pro-card-glass" style={{
        width: '100%',
        maxWidth: '400px',
        backgroundColor: 'var(--bg-surface)',
        borderRadius: '28px',
        border: '1px solid var(--border-bright)',
        boxShadow: '0 24px 60px rgba(0,0,0,0.8)',
        padding: '30px 24px',
        display: 'flex',
        flexDirection: 'column',
        gap: '20px',
        textAlign: 'center',
        animation: 'fadeIn 0.2s ease'
      }}>
        
        {/* Top Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <LogoHexagon size={30} />
            <div style={{ textAlign: 'left' }}>
              <div style={{ fontSize: '14px', fontWeight: 800, color: 'var(--text-main)', lineHeight: 1.1 }}>
                MANISH MARKET
              </div>
              <span className="mono-num" style={{ fontSize: '10px', color: 'var(--accent-green)', fontWeight: 700 }}>
                SECURE AUTHENTICATION
              </span>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            style={{
              background: 'var(--bg-elevated)',
              border: '1px solid var(--border-subtle)',
              color: 'var(--text-muted)',
              width: '30px',
              height: '30px',
              borderRadius: '10px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer'
            }}
          >
            <X style={{ width: '16px', height: '16px' }} />
          </button>
        </div>

        {/* Hero Google Visual */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px' }}>
          <div style={{
            width: '56px',
            height: '56px',
            borderRadius: '18px',
            backgroundColor: '#ffffff',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 6px 20px rgba(0,0,0,0.25)'
          }}>
            <svg width="28" height="28" viewBox="0 0 48 48">
              <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
              <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
              <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
              <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
              <path fill="none" d="M0 0h48v48H0z"/>
            </svg>
          </div>

          <div>
            <h3 style={{ fontSize: '18px', fontWeight: 900, color: 'var(--text-main)', margin: '0 0 4px 0' }}>
              Sign in with Google
            </h3>
            <p style={{ fontSize: '12px', color: 'var(--text-muted)', margin: 0, lineHeight: 1.4 }}>
              Unlock your private trading workspace, cloud watchlists & virtual paper portfolio.
            </p>
          </div>
        </div>

        {/* Error Alert */}
        {localError && (
          <div style={{
            padding: '10px 14px',
            borderRadius: '12px',
            backgroundColor: 'var(--accent-red-bg)',
            border: '1px solid var(--accent-red-border)',
            color: 'var(--accent-red)',
            fontSize: '12px',
            fontWeight: 600,
            textAlign: 'left'
          }}>
            ⚠️ {localError}
          </div>
        )}

        {/* Primary Action Button */}
        <button
          type="button"
          onClick={handleGoogleSignIn}
          disabled={loading}
          style={{
            width: '100%',
            padding: '14px 18px',
            borderRadius: '16px',
            backgroundColor: '#ffffff',
            color: '#1f1f1f',
            border: 'none',
            fontSize: '14px',
            fontWeight: 800,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '10px',
            cursor: loading ? 'wait' : 'pointer',
            boxShadow: '0 4px 14px rgba(0,0,0,0.3), 0 0 0 1px #dadce0',
            transition: 'transform 0.15s ease, box-shadow 0.15s ease'
          }}
          onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(-1px)'; e.currentTarget.style.boxShadow = '0 6px 18px rgba(0,0,0,0.4)'; }}
          onMouseLeave={(e) => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 4px 14px rgba(0,0,0,0.3)'; }}
        >
          {loading ? (
            <div style={{ width: '20px', height: '20px', border: '2px solid #1a73e8', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
          ) : (
            <>
              <svg width="20" height="20" viewBox="0 0 48 48">
                <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
                <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
                <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
                <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
                <path fill="none" d="M0 0h48v48H0z"/>
              </svg>
              <span>Continue with Google</span>
              <ArrowRight style={{ width: '16px', height: '16px', color: '#5f6368', marginLeft: 'auto' }} />
            </>
          )}
        </button>

        {/* Benefits Checklist */}
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '8px',
          paddingTop: '8px',
          borderTop: '1px solid var(--border-subtle)',
          textAlign: 'left'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '11px', color: 'var(--text-muted)' }}>
            <CheckCircle2 style={{ width: '14px', height: '14px', color: 'var(--accent-green)', flexShrink: 0 }} />
            <span>Instant login with verified Google account</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '11px', color: 'var(--text-muted)' }}>
            <CheckCircle2 style={{ width: '14px', height: '14px', color: 'var(--accent-green)', flexShrink: 0 }} />
            <span>Free ₹10,00,000 / $100,000 virtual balance</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '11px', color: 'var(--text-muted)' }}>
            <CheckCircle2 style={{ width: '14px', height: '14px', color: 'var(--accent-green)', flexShrink: 0 }} />
            <span>Private watchlists & quantitative alerts</span>
          </div>
        </div>

        {/* Footer Security Notice & Fast Account Picker */}
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '4px',
          fontSize: '11px',
          color: 'var(--text-muted)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <ShieldCheck style={{ width: '13px', height: '13px', color: 'var(--accent-green)' }} />
            <span>Secured by Google Identity Services</span>
          </div>
          <button
            type="button"
            onClick={() => setShowGoogleModal(true)}
            style={{
              background: 'none',
              border: 'none',
              color: 'var(--accent-blue)',
              fontSize: '11px',
              fontWeight: 600,
              cursor: 'pointer',
              textDecoration: 'underline'
            }}
          >
            Or select / enter Google account directly
          </button>
        </div>

      </div>

      {/* Google Sign In Modal */}
      <GoogleSignInModal
        isOpen={showGoogleModal}
        onClose={() => {
          setShowGoogleModal(false);
          onClose();
        }}
        currentMarket={currentMarket}
        onMarketChange={onMarketChange}
      />

    </div>
  );
}
