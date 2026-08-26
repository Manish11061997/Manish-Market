import React, { useState } from 'react';
import { User, Lock, Mail, Globe, ArrowRight, ShieldCheck, Sparkles, X, Eye, EyeOff } from 'lucide-react';
import { useAuth } from '../utils/useAuth';
import LogoHexagon from './LogoHexagon';

export default function AuthModal({ isOpen, onClose, initialMode = 'LOGIN', currentMarket = 'IN', onMarketChange }) {
  const [mode, setMode] = useState(initialMode); // 'LOGIN' or 'SIGNUP'
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [selectedMarket, setSelectedMarket] = useState(currentMarket);
  const [localError, setLocalError] = useState(null);

  const { login, signup, loading } = useAuth();

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLocalError(null);

    try {
      if (mode === 'LOGIN') {
        if (!email.trim() || !password) {
          setLocalError('Please enter both email and password.');
          return;
        }
        await login(email.trim(), password);
      } else {
        if (!name.trim()) {
          setLocalError('Please enter your name.');
          return;
        }
        if (!email.trim() || !email.includes('@')) {
          setLocalError('Please enter a valid email address.');
          return;
        }
        if (password.length < 6) {
          setLocalError('Password must be at least 6 characters.');
          return;
        }
        await signup(name.trim(), email.trim(), password, selectedMarket);
        if (onMarketChange && selectedMarket !== currentMarket) {
          onMarketChange(selectedMarket);
        }
      }
      onClose();
    } catch (err) {
      setLocalError(err.message || 'Authentication failed.');
    }
  };

  const handleGuestContinue = () => {
    onClose();
  };

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0,0,0,0.75)',
      backdropFilter: 'blur(8px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 2000,
      padding: '16px'
    }}>
      <div className="pro-card-glass" style={{
        width: '100%',
        maxWidth: '420px',
        backgroundColor: 'var(--bg-surface)',
        borderRadius: '24px',
        border: '1px solid var(--border-bright)',
        boxShadow: '0 20px 50px rgba(0,0,0,0.8)',
        padding: '24px',
        display: 'flex',
        flexDirection: 'column',
        gap: '20px',
        animation: 'fadeIn 0.2s ease'
      }}>
        
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <LogoHexagon size={32} />
            <div>
              <div style={{ fontSize: '15px', fontWeight: 800, color: 'var(--text-main)', lineHeight: 1.2 }}>
                MANISH MARKET
              </div>
              <span className="mono-num" style={{ fontSize: '10px', color: 'var(--accent-green)', fontWeight: 700 }}>
                SECURE USER PORTAL
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
              width: '32px',
              height: '32px',
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

        {/* Tab Switcher: Sign In vs Create Account */}
        <div style={{
          display: 'flex',
          backgroundColor: 'var(--bg-elevated)',
          borderRadius: '14px',
          padding: '4px',
          border: '1px solid var(--border-subtle)'
        }}>
          <button
            type="button"
            onClick={() => { setMode('LOGIN'); setLocalError(null); }}
            style={{
              flex: 1,
              padding: '8px 12px',
              borderRadius: '10px',
              fontSize: '12px',
              fontWeight: 800,
              border: 'none',
              cursor: 'pointer',
              backgroundColor: mode === 'LOGIN' ? 'var(--accent-blue)' : 'transparent',
              color: mode === 'LOGIN' ? '#04060a' : 'var(--text-muted)',
              transition: 'all 0.15s ease'
            }}
          >
            Sign In
          </button>
          <button
            type="button"
            onClick={() => { setMode('SIGNUP'); setLocalError(null); }}
            style={{
              flex: 1,
              padding: '8px 12px',
              borderRadius: '10px',
              fontSize: '12px',
              fontWeight: 800,
              border: 'none',
              cursor: 'pointer',
              backgroundColor: mode === 'SIGNUP' ? 'var(--accent-blue)' : 'transparent',
              color: mode === 'SIGNUP' ? '#04060a' : 'var(--text-muted)',
              transition: 'all 0.15s ease'
            }}
          >
            Create Account
          </button>
        </div>

        {/* Value Proposition Badge */}
        <div style={{
          padding: '10px 14px',
          borderRadius: '12px',
          backgroundColor: 'var(--accent-blue-bg)',
          border: '1px solid var(--accent-blue-border)',
          display: 'flex',
          alignItems: 'center',
          gap: '10px'
        }}>
          <Sparkles style={{ width: '18px', height: '18px', color: 'var(--accent-blue)', flexShrink: 0 }} />
          <span style={{ fontSize: '11px', color: 'var(--text-main)', lineHeight: 1.4 }}>
            {mode === 'LOGIN' 
              ? 'Sign in to access your personal watchlists, paper trading portfolio, and custom alerts.'
              : 'Create your private account with an isolated ₹10,00,000 / $100,000 trading sandbox.'}
          </span>
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
            fontWeight: 600
          }}>
            ⚠️ {localError}
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          {mode === 'SIGNUP' && (
            <div>
              <label style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', display: 'block', marginBottom: '6px' }}>
                Full Name
              </label>
              <div style={{ position: 'relative' }}>
                <User style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', width: '16px', height: '16px', color: 'var(--text-muted)' }} />
                <input
                  type="text"
                  placeholder="e.g. Rahul Sharma"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="pro-input-field"
                  style={{
                    width: '100%',
                    paddingLeft: '38px',
                    paddingRight: '12px',
                    fontSize: '13px',
                    borderRadius: '12px',
                    backgroundColor: 'var(--bg-elevated)',
                    border: '1px solid var(--border-subtle)'
                  }}
                />
              </div>
            </div>
          )}

          <div>
            <label style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', display: 'block', marginBottom: '6px' }}>
              Email Address
            </label>
            <div style={{ position: 'relative' }}>
              <Mail style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', width: '16px', height: '16px', color: 'var(--text-muted)' }} />
              <input
                type="email"
                placeholder="name@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="email"
                className="pro-input-field"
                style={{
                  width: '100%',
                  paddingLeft: '38px',
                  paddingRight: '12px',
                  fontSize: '13px',
                  borderRadius: '12px',
                  backgroundColor: 'var(--bg-elevated)',
                  border: '1px solid var(--border-subtle)'
                }}
              />
            </div>
          </div>

          <div>
            <label style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', display: 'block', marginBottom: '6px' }}>
              Password
            </label>
            <div style={{ position: 'relative' }}>
              <Lock style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', width: '16px', height: '16px', color: 'var(--text-muted)' }} />
              <input
                type={showPassword ? 'text' : 'password'}
                placeholder={mode === 'SIGNUP' ? 'Min 6 characters' : 'Enter your password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete={mode === 'SIGNUP' ? 'new-password' : 'current-password'}
                className="pro-input-field"
                style={{
                  width: '100%',
                  paddingLeft: '38px',
                  paddingRight: '38px',
                  fontSize: '13px',
                  borderRadius: '12px',
                  backgroundColor: 'var(--bg-elevated)',
                  border: '1px solid var(--border-subtle)'
                }}
              />
              <button
                type="button"
                onClick={() => setShowPassword(p => !p)}
                style={{
                  position: 'absolute',
                  right: '12px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  background: 'none',
                  border: 'none',
                  color: 'var(--text-muted)',
                  cursor: 'pointer',
                  padding: 0,
                  display: 'flex',
                  alignItems: 'center'
                }}
              >
                {showPassword ? <EyeOff style={{ width: '16px', height: '16px' }} /> : <Eye style={{ width: '16px', height: '16px' }} />}
              </button>
            </div>
          </div>

          {mode === 'SIGNUP' && (
            <div>
              <label style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', display: 'block', marginBottom: '6px' }}>
                Preferred Default Market
              </label>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                <button
                  type="button"
                  onClick={() => setSelectedMarket('IN')}
                  style={{
                    padding: '8px 10px',
                    borderRadius: '10px',
                    fontSize: '12px',
                    fontWeight: 700,
                    cursor: 'pointer',
                    border: `1px solid ${selectedMarket === 'IN' ? 'var(--accent-blue)' : 'var(--border-subtle)'}`,
                    backgroundColor: selectedMarket === 'IN' ? 'var(--accent-blue-bg)' : 'var(--bg-elevated)',
                    color: selectedMarket === 'IN' ? 'var(--accent-blue)' : 'var(--text-muted)'
                  }}
                >
                  🇮🇳 Indian (NSE / BSE)
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedMarket('US')}
                  style={{
                    padding: '8px 10px',
                    borderRadius: '10px',
                    fontSize: '12px',
                    fontWeight: 700,
                    cursor: 'pointer',
                    border: `1px solid ${selectedMarket === 'US' ? 'var(--accent-blue)' : 'var(--border-subtle)'}`,
                    backgroundColor: selectedMarket === 'US' ? 'var(--accent-blue-bg)' : 'var(--bg-elevated)',
                    color: selectedMarket === 'US' ? 'var(--accent-blue)' : 'var(--text-muted)'
                  }}
                >
                  🇺🇸 US (NYSE / NASDAQ)
                </button>
              </div>
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="m3-button-filled"
            style={{
              width: '100%',
              padding: '12px',
              borderRadius: '14px',
              fontSize: '14px',
              fontWeight: 800,
              backgroundColor: 'var(--accent-blue)',
              color: '#04060a',
              border: 'none',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              marginTop: '6px',
              boxShadow: '0 4px 14px rgba(41, 121, 255, 0.4)'
            }}
          >
            {loading ? (
              <div style={{ width: '18px', height: '18px', border: '2px solid #04060a', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
            ) : (
              <>
                <span>{mode === 'LOGIN' ? 'Sign In to Account' : 'Create Free Account'}</span>
                <ArrowRight style={{ width: '16px', height: '16px' }} />
              </>
            )}
          </button>
        </form>

        {/* Guest Demo Bypass */}
        <div style={{
          borderTop: '1px solid var(--border-subtle)',
          paddingTop: '14px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between'
        }}>
          <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
            Want to explore first?
          </span>
          <button
            type="button"
            onClick={handleGuestContinue}
            className="m3-button-text"
            style={{
              fontSize: '11px',
              fontWeight: 700,
              color: 'var(--accent-blue)',
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              padding: '4px 8px'
            }}
          >
            Continue as Guest →
          </button>
        </div>

      </div>
    </div>
  );
}
