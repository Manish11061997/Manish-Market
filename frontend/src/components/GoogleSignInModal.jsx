import React, { useState } from 'react';
import { X, User, ArrowRight, ShieldCheck, Check } from 'lucide-react';
import { useAuth } from '../utils/useAuth';

export default function GoogleSignInModal({ isOpen, onClose, currentMarket = 'IN', onMarketChange }) {
  const [step, setStep] = useState('ACCOUNTS'); // 'ACCOUNTS', 'INPUT', 'LOADING'
  const [selectedAccount, setSelectedAccount] = useState(null);
  const [emailInput, setEmailInput] = useState('');
  const [nameInput, setNameInput] = useState('');
  const [error, setError] = useState(null);

  const { loginWithGoogle, loading } = useAuth();

  if (!isOpen) return null;

  const quickAccounts = [
    { name: 'Manish Trader', email: 'manish.trader@gmail.com', avatarBg: '#EA4335', initials: 'MT' },
    { name: 'Quant Investor', email: 'quant.investor@gmail.com', avatarBg: '#4285F4', initials: 'QI' },
  ];

  const handleRealGooglePopup = async () => {
    setStep('LOADING');
    setError(null);
    try {
      await loginWithGoogle();
      if (onMarketChange) onMarketChange(currentMarket);
      onClose();
    } catch (err) {
      setError(err.message || 'Google popup sign-in was cancelled or encountered an issue.');
      setStep('ACCOUNTS');
    }
  };

  const handleSelectQuickAccount = async (account) => {
    setSelectedAccount(account);
    setStep('LOADING');
    setError(null);
    try {
      await loginWithGoogle(account.name, account.email, currentMarket);
      if (onMarketChange) onMarketChange(currentMarket);
      onClose();
    } catch (err) {
      setError(err.message || 'Failed to authenticate with Google.');
      setStep('ACCOUNTS');
    }
  };

  const handleCustomSubmit = async (e) => {
    e.preventDefault();
    if (!emailInput.trim() || !emailInput.includes('@')) {
      setError('Please enter a valid Google email address.');
      return;
    }
    const derivedName = nameInput.trim() || emailInput.split('@')[0].replace('.', ' ').toUpperCase();
    setStep('LOADING');
    setError(null);
    try {
      await loginWithGoogle(derivedName, emailInput.trim(), currentMarket);
      if (onMarketChange) onMarketChange(currentMarket);
      onClose();
    } catch (err) {
      setError(err.message || 'Failed to authenticate with Google.');
      setStep('INPUT');
    }
  };

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0,0,0,0.75)',
      backdropFilter: 'blur(10px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 3000,
      padding: '16px',
      animation: 'fadeIn 0.15s ease'
    }}>
      <div style={{
        width: '100%',
        maxWidth: '440px',
        backgroundColor: '#ffffff',
        color: '#1f1f1f',
        borderRadius: '28px',
        boxShadow: '0 24px 60px rgba(0,0,0,0.4)',
        padding: '36px 32px',
        display: 'flex',
        flexDirection: 'column',
        gap: '20px',
        fontFamily: 'Roboto, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif'
      }}>
        
        {/* Google Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <svg width="24" height="24" viewBox="0 0 48 48">
              <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
              <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
              <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
              <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
              <path fill="none" d="M0 0h48v48H0z"/>
            </svg>
            <span style={{ fontSize: '16px', fontWeight: 600, color: '#1f1f1f' }}>
              Sign in with Google
            </span>
          </div>

          <button
            type="button"
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              color: '#5f6368',
              padding: '6px',
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            <X style={{ width: '18px', height: '18px' }} />
          </button>
        </div>

        {/* Title */}
        <div>
          <h3 style={{ fontSize: '20px', fontWeight: 600, color: '#202124', margin: '0 0 6px 0' }}>
            Choose an account
          </h3>
          <p style={{ fontSize: '13px', color: '#5f6368', margin: 0 }}>
            to continue to <strong style={{ color: '#1a73e8' }}>Manish Market</strong>
          </p>
        </div>

        {error && (
          <div style={{
            padding: '10px 14px',
            borderRadius: '8px',
            backgroundColor: '#fce8e6',
            color: '#c5221f',
            fontSize: '12px',
            fontWeight: 600
          }}>
            ⚠️ {error}
          </div>
        )}

        {/* Step: ACCOUNTS LIST */}
        {step === 'ACCOUNTS' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            
            {/* Primary Real Google Account Auth Trigger */}
            <button
              type="button"
              onClick={handleRealGooglePopup}
              style={{
                width: '100%',
                padding: '13px 16px',
                borderRadius: '14px',
                backgroundColor: '#1a73e8',
                color: '#ffffff',
                border: 'none',
                fontSize: '14px',
                fontWeight: 700,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '10px',
                cursor: 'pointer',
                boxShadow: '0 2px 8px rgba(26, 115, 232, 0.4)'
              }}
            >
              <svg width="18" height="18" viewBox="0 0 48 48">
                <path fill="#ffffff" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
                <path fill="#ffffff" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
                <path fill="#ffffff" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
                <path fill="#ffffff" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
              </svg>
              <span>Launch Official Google Popup</span>
            </button>

            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', margin: '4px 0' }}>
              <div style={{ flex: 1, height: '1px', backgroundColor: '#e8eaed' }} />
              <span style={{ fontSize: '11px', color: '#5f6368', fontWeight: 600 }}>OR SELECT / ENTER ACCOUNT</span>
              <div style={{ flex: 1, height: '1px', backgroundColor: '#e8eaed' }} />
            </div>

            {quickAccounts.map((acc) => (
              <button
                key={acc.email}
                type="button"
                onClick={() => handleSelectQuickAccount(acc)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '14px',
                  padding: '12px 14px',
                  borderRadius: '12px',
                  border: '1px solid #dadce0',
                  backgroundColor: '#ffffff',
                  cursor: 'pointer',
                  textAlign: 'left',
                  transition: 'background-color 0.15s ease'
                }}
                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f8f9fa'}
                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#ffffff'}
              >
                <div style={{
                  width: '38px',
                  height: '38px',
                  borderRadius: '50%',
                  backgroundColor: acc.avatarBg,
                  color: '#ffffff',
                  fontSize: '14px',
                  fontWeight: 700,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0
                }}>
                  {acc.initials}
                </div>
                <div style={{ minWidth: 0, flex: 1 }}>
                  <div style={{ fontSize: '14px', fontWeight: 600, color: '#202124' }}>
                    {acc.name}
                  </div>
                  <div style={{ fontSize: '12px', color: '#5f6368', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {acc.email}
                  </div>
                </div>
              </button>
            ))}

            {/* Custom Account Option */}
            <button
              type="button"
              onClick={() => { setStep('INPUT'); setError(null); }}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '14px',
                padding: '12px 14px',
                borderRadius: '12px',
                border: '1px dashed #dadce0',
                backgroundColor: '#f8f9fa',
                cursor: 'pointer',
                textAlign: 'left',
                marginTop: '4px'
              }}
              onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f1f3f4'}
              onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#f8f9fa'}
            >
              <div style={{
                width: '38px',
                height: '38px',
                borderRadius: '50%',
                backgroundColor: '#e8eaed',
                color: '#5f6368',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0
              }}>
                <User style={{ width: '18px', height: '18px' }} />
              </div>
              <div style={{ fontSize: '13px', fontWeight: 600, color: '#1a73e8' }}>
                Use another Google account...
              </div>
            </button>
          </div>
        )}

        {/* Step: CUSTOM GOOGLE ACCOUNT INPUT */}
        {step === 'INPUT' && (
          <form onSubmit={handleCustomSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div>
              <label style={{ fontSize: '12px', fontWeight: 600, color: '#5f6368', display: 'block', marginBottom: '6px' }}>
                Your Name
              </label>
              <input
                type="text"
                placeholder="e.g. Rahul Sharma"
                value={nameInput}
                onChange={(e) => setNameInput(e.target.value)}
                style={{
                  width: '100%',
                  padding: '12px 14px',
                  borderRadius: '10px',
                  border: '1px solid #dadce0',
                  fontSize: '14px',
                  color: '#202124',
                  outline: 'none',
                  boxSizing: 'border-box'
                }}
              />
            </div>

            <div>
              <label style={{ fontSize: '12px', fontWeight: 600, color: '#5f6368', display: 'block', marginBottom: '6px' }}>
                Google Email Address
              </label>
              <input
                type="email"
                placeholder="you@gmail.com"
                value={emailInput}
                onChange={(e) => setEmailInput(e.target.value)}
                autoFocus
                style={{
                  width: '100%',
                  padding: '12px 14px',
                  borderRadius: '10px',
                  border: '1px solid #1a73e8',
                  fontSize: '14px',
                  color: '#202124',
                  outline: 'none',
                  boxSizing: 'border-box'
                }}
              />
            </div>

            <div style={{ display: 'flex', gap: '10px', marginTop: '6px' }}>
              <button
                type="submit"
                style={{
                  flex: 1,
                  padding: '12px',
                  borderRadius: '24px',
                  backgroundColor: '#1a73e8',
                  color: '#ffffff',
                  border: 'none',
                  fontSize: '14px',
                  fontWeight: 600,
                  cursor: 'pointer'
                }}
              >
                Next
              </button>
              <button
                type="button"
                onClick={() => { setStep('ACCOUNTS'); setError(null); }}
                style={{
                  padding: '12px 20px',
                  borderRadius: '24px',
                  backgroundColor: 'transparent',
                  color: '#5f6368',
                  border: '1px solid #dadce0',
                  fontSize: '14px',
                  fontWeight: 600,
                  cursor: 'pointer'
                }}
              >
                Back
              </button>
            </div>
          </form>
        )}

        {/* Step: LOADING ANIMATION */}
        {step === 'LOADING' && (
          <div style={{ padding: '30px 0', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '14px' }}>
            <div style={{
              width: '36px',
              height: '36px',
              border: '3px solid #1a73e8',
              borderTopColor: 'transparent',
              borderRadius: '50%',
              animation: 'spin 1s linear infinite'
            }} />
            <div style={{ fontSize: '14px', fontWeight: 600, color: '#202124' }}>
              Authenticating with Google...
            </div>
            <div style={{ fontSize: '12px', color: '#5f6368' }}>
              Setting up your isolated Manish Market trading sandbox.
            </div>
          </div>
        )}

        {/* Footer Security Notice */}
        <div style={{
          borderTop: '1px solid #f1f3f4',
          paddingTop: '14px',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          fontSize: '11px',
          color: '#5f6368'
        }}>
          <ShieldCheck style={{ width: '14px', height: '14px', color: '#188038', flexShrink: 0 }} />
          <span>To continue, Google will share your name, email address, and language preference with Manish Market.</span>
        </div>

      </div>
    </div>
  );
}
