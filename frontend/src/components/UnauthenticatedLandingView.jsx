import React, { useState } from 'react';
import { 
  TrendingUp, 
  ShieldCheck, 
  Zap, 
  Sparkles, 
  Lock, 
  Mail, 
  User, 
  Eye, 
  EyeOff, 
  ArrowRight, 
  Activity, 
  Star, 
  Globe, 
  CheckCircle2,
  BarChart3,
  Flame,
  ChevronRight
} from 'lucide-react';
import LogoHexagon from './LogoHexagon';
import { useAuth } from '../utils/useAuth';
import GoogleSignInModal from './GoogleSignInModal';

export default function UnauthenticatedLandingView({ marketData, currentMarket = 'IN', onMarketChange }) {
  const [mode, setMode] = useState('LOGIN'); // 'LOGIN' or 'SIGNUP'
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [selectedMarket, setSelectedMarket] = useState(currentMarket);
  const [localError, setLocalError] = useState(null);
  const [showGoogleModal, setShowGoogleModal] = useState(false);

  const { login, signup, loading } = useAuth();

  const handleGoogleSignIn = () => {
    setLocalError(null);
    setShowGoogleModal(true);
  };

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
          setLocalError('Please enter your full name.');
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
    } catch (err) {
      setLocalError(err.message || 'Authentication failed.');
    }
  };

  // Preview sample securities for guest preview
  const sampleStocks = currentMarket === 'US' ? [
    { symbol: 'NVDA', name: 'NVIDIA Corp.', price: 128.50, change: 4.25, pChange: 3.42, horizon: 'SWING', horizonTarget: 145.00 },
    { symbol: 'AAPL', name: 'Apple Inc.', price: 224.23, change: 1.85, pChange: 0.83, horizon: 'POSITIONAL', horizonTarget: 240.00 },
    { symbol: 'MSFT', name: 'Microsoft Corp.', price: 448.90, change: -2.10, pChange: -0.46, horizon: 'INTRADAY', horizonTarget: 455.00 },
    { symbol: 'TSLA', name: 'Tesla Inc.', price: 215.60, change: 6.80, pChange: 3.26, horizon: 'SHORT_TERM', horizonTarget: 235.00 },
  ] : [
    { symbol: 'RELIANCE.NS', name: 'Reliance Industries', price: 2985.40, change: 32.10, pChange: 1.09, horizon: 'SWING', horizonTarget: 3150.00 },
    { symbol: 'TCS.NS', name: 'Tata Consultancy Services', price: 4210.80, change: 45.20, pChange: 1.08, horizon: 'POSITIONAL', horizonTarget: 4450.00 },
    { symbol: 'HDFCBANK.NS', name: 'HDFC Bank Ltd.', price: 1642.15, change: -8.30, pChange: -0.50, horizon: 'INTRADAY', horizonTarget: 1675.00 },
    { symbol: 'ZOMATO.NS', name: 'Zomato Ltd.', price: 262.40, change: 8.90, pChange: 3.51, horizon: 'SHORT_TERM', horizonTarget: 290.00 },
  ];

  return (
    <div style={{
      minHeight: '100vh',
      backgroundColor: 'var(--bg-dark)',
      color: 'var(--text-main)',
      display: 'flex',
      flexDirection: 'column',
      overflowX: 'hidden'
    }}>
      
      {/* Top Brand & Live Status Navigation Bar */}
      <header style={{
        height: '64px',
        padding: '0 24px',
        backgroundColor: 'rgba(9, 14, 23, 0.85)',
        backdropFilter: 'blur(12px)',
        borderBottom: '1px solid var(--border-subtle)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        position: 'sticky',
        top: 0,
        zIndex: 100
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <LogoHexagon size={36} />
          <div>
            <div style={{ fontSize: '16px', fontWeight: 900, letterSpacing: '-0.3px', color: 'var(--text-main)', lineHeight: 1.1 }}>
              MANISH MARKET
            </div>
            <div style={{ fontSize: '10px', fontWeight: 800, color: 'var(--accent-blue)', letterSpacing: '0.5px' }}>
              QUANTITATIVE ADVISORY & TRADING TERMINAL
            </div>
          </div>
        </div>

        {/* Live Market Switcher */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{
            display: 'flex',
            backgroundColor: 'var(--bg-elevated)',
            borderRadius: '12px',
            padding: '3px',
            border: '1px solid var(--border-subtle)'
          }}>
            <button
              type="button"
              onClick={() => onMarketChange && onMarketChange('IN')}
              style={{
                padding: '5px 10px',
                borderRadius: '8px',
                fontSize: '11px',
                fontWeight: 800,
                border: 'none',
                cursor: 'pointer',
                backgroundColor: currentMarket === 'IN' ? 'var(--accent-blue)' : 'transparent',
                color: currentMarket === 'IN' ? '#04060a' : 'var(--text-muted)'
              }}
            >
              🇮🇳 NSE / BSE
            </button>
            <button
              type="button"
              onClick={() => onMarketChange && onMarketChange('US')}
              style={{
                padding: '5px 10px',
                borderRadius: '8px',
                fontSize: '11px',
                fontWeight: 800,
                border: 'none',
                cursor: 'pointer',
                backgroundColor: currentMarket === 'US' ? 'var(--accent-blue)' : 'transparent',
                color: currentMarket === 'US' ? '#04060a' : 'var(--text-muted)'
              }}
            >
              🇺🇸 US MARKETS
            </button>
          </div>
        </div>
      </header>

      {/* Main Hero & Auth Split Grid */}
      <main style={{
        flex: 1,
        maxWidth: '1280px',
        width: '100%',
        margin: '0 auto',
        padding: '32px 20px',
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))',
        gap: '32px',
        alignItems: 'start'
      }}>
        
        {/* Left Side: Market Overview, Highlights & Sample Data */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          
          {/* Hero Pitch */}
          <div>
            <div style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '6px 12px',
              borderRadius: '20px',
              backgroundColor: 'var(--accent-blue-bg)',
              border: '1px solid var(--accent-blue-border)',
              color: 'var(--accent-blue)',
              fontSize: '11px',
              fontWeight: 800,
              marginBottom: '16px'
            }}>
              <Sparkles style={{ width: '14px', height: '14px' }} />
              <span>LIVE QUANTITATIVE TERMINAL</span>
            </div>
            <h1 style={{
              fontSize: 'clamp(26px, 4vw, 36px)',
              fontWeight: 900,
              letterSpacing: '-0.8px',
              lineHeight: 1.15,
              color: 'var(--text-main)',
              marginBottom: '12px'
            }}>
              Institutional-Grade Intelligence & Simulated Trading.
            </h1>
            <p style={{ fontSize: '14px', color: 'var(--text-muted)', lineHeight: 1.6 }}>
              Sign in to unlock personalized multi-horizon signals, your private <strong>₹10,00,000 / $100,000</strong> paper portfolio, real-time custom watchlists, and algorithmic pattern recognition.
            </p>
          </div>

          {/* Feature Highlights Grid */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: '12px'
          }}>
            <div className="pro-card-glass" style={{ padding: '14px', borderRadius: '16px', border: '1px solid var(--border-subtle)' }}>
              <Zap style={{ width: '20px', height: '20px', color: 'var(--accent-gold)', marginBottom: '8px' }} />
              <div style={{ fontSize: '13px', fontWeight: 800, color: 'var(--text-main)', marginBottom: '4px' }}>
                Multi-Horizon AI
              </div>
              <div style={{ fontSize: '11px', color: 'var(--text-muted)', lineHeight: 1.3 }}>
                Intraday, Swing & Positional quant targets with risk checks.
              </div>
            </div>

            <div className="pro-card-glass" style={{ padding: '14px', borderRadius: '16px', border: '1px solid var(--border-subtle)' }}>
              <ShieldCheck style={{ width: '20px', height: '20px', color: 'var(--accent-green)', marginBottom: '8px' }} />
              <div style={{ fontSize: '13px', fontWeight: 800, color: 'var(--text-main)', marginBottom: '4px' }}>
                Private Paper Trading
              </div>
              <div style={{ fontSize: '11px', color: 'var(--text-muted)', lineHeight: 1.3 }}>
                Isolated sandbox with virtual funds to test strategies risk-free.
              </div>
            </div>

            <div className="pro-card-glass" style={{ padding: '14px', borderRadius: '16px', border: '1px solid var(--border-subtle)' }}>
              <Star style={{ width: '20px', height: '20px', color: 'var(--accent-blue)', marginBottom: '8px' }} />
              <div style={{ fontSize: '13px', fontWeight: 800, color: 'var(--text-main)', marginBottom: '4px' }}>
                Custom Watchlists
              </div>
              <div style={{ fontSize: '11px', color: 'var(--text-muted)', lineHeight: 1.3 }}>
                Multi-tab tracking with real-time flash price streaming.
              </div>
            </div>

            <div className="pro-card-glass" style={{ padding: '14px', borderRadius: '16px', border: '1px solid var(--border-subtle)' }}>
              <Activity style={{ width: '20px', height: '20px', color: 'var(--accent-purple, #b388ff)', marginBottom: '8px' }} />
              <div style={{ fontSize: '13px', fontWeight: 800, color: 'var(--text-main)', marginBottom: '4px' }}>
                Sub-Second Stream
              </div>
              <div style={{ fontSize: '11px', color: 'var(--text-muted)', lineHeight: 1.3 }}>
                Native live tick streaming across NSE, BSE, NYSE & NASDAQ.
              </div>
            </div>
          </div>

          {/* Live Sample Market Data Preview (Locked Metrics Card) */}
          <div className="pro-card-glass" style={{
            borderRadius: '20px',
            border: '1px solid var(--border-bright)',
            padding: '16px',
            backgroundColor: 'var(--bg-surface)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Flame style={{ width: '18px', height: '18px', color: 'var(--accent-gold)' }} />
                <span style={{ fontSize: '13px', fontWeight: 800, color: 'var(--text-main)' }}>
                  Live Market Feed Preview ({currentMarket === 'US' ? 'US Equities' : 'Indian Equities'})
                </span>
              </div>
              <span className="mono-num" style={{ fontSize: '10px', color: 'var(--accent-green)', fontWeight: 700 }}>
                ● STREAMING
              </span>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {sampleStocks.map((stock) => (
                <div key={stock.symbol} style={{
                  padding: '10px 14px',
                  borderRadius: '12px',
                  backgroundColor: 'var(--bg-elevated)',
                  border: '1px solid var(--border-subtle)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between'
                }}>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <span className="mono-num" style={{ fontSize: '13px', fontWeight: 800, color: 'var(--text-main)' }}>
                        {stock.symbol}
                      </span>
                      <span style={{ fontSize: '9px', fontWeight: 800, padding: '2px 6px', borderRadius: '4px', backgroundColor: 'var(--accent-blue-bg)', color: 'var(--accent-blue)' }}>
                        {stock.horizon}
                      </span>
                    </div>
                    <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                      {stock.name}
                    </div>
                  </div>

                  <div style={{ textAlign: 'right' }}>
                    <div className="mono-num" style={{ fontSize: '13px', fontWeight: 800, color: 'var(--text-main)' }}>
                      {currentMarket === 'US' ? '$' : '₹'}{stock.price.toFixed(2)}
                    </div>
                    <div className="mono-num" style={{ fontSize: '11px', fontWeight: 700, color: stock.change >= 0 ? 'var(--accent-green)' : 'var(--accent-red)' }}>
                      {stock.change >= 0 ? '+' : ''}{stock.change.toFixed(2)} ({stock.pChange.toFixed(2)}%)
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div style={{
              marginTop: '12px',
              padding: '8px 12px',
              borderRadius: '10px',
              backgroundColor: 'rgba(255, 171, 0, 0.1)',
              border: '1px solid rgba(255, 171, 0, 0.2)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              fontSize: '11px'
            }}>
              <span style={{ color: 'var(--accent-gold)', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Lock style={{ width: '12px', height: '12px' }} />
                <span>Full quant analysis & AI copilot locked</span>
              </span>
              <span style={{ color: 'var(--text-muted)' }}>Sign in to unlock</span>
            </div>
          </div>

        </div>

        {/* Right Side: High-Converting Material 3 Auth Card */}
        <div style={{ position: 'sticky', top: '88px' }}>
          <div className="pro-card-glass" style={{
            backgroundColor: 'var(--bg-surface)',
            borderRadius: '24px',
            border: '1px solid var(--border-bright)',
            boxShadow: '0 20px 50px rgba(0,0,0,0.6)',
            padding: '28px',
            display: 'flex',
            flexDirection: 'column',
            gap: '20px'
          }}>
            
            {/* Form Header */}
            <div>
              <h2 style={{ fontSize: '20px', fontWeight: 900, color: 'var(--text-main)', marginBottom: '4px' }}>
                {mode === 'LOGIN' ? 'Welcome Back, Trader' : 'Create Free Account'}
              </h2>
              <p style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                {mode === 'LOGIN' 
                  ? 'Access your private workspace and portfolios.'
                  : 'Get ₹10,00,000 / $100,000 paper trading capital.'}
              </p>
            </div>

            {/* Mode Switcher Tabs */}
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
                  padding: '9px 12px',
                  borderRadius: '10px',
                  fontSize: '13px',
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
                  padding: '9px 12px',
                  borderRadius: '10px',
                  fontSize: '13px',
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

            {/* Error Message */}
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

            {/* Sign in with Google Button */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <button
                type="button"
                onClick={handleGoogleSignIn}
                disabled={loading}
                style={{
                  width: '100%',
                  padding: '12px 16px',
                  borderRadius: '14px',
                  backgroundColor: '#ffffff',
                  color: '#1f1f1f',
                  border: '1px solid #dadce0',
                  fontSize: '13px',
                  fontWeight: 800,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '10px',
                  cursor: 'pointer',
                  boxShadow: '0 2px 6px rgba(0,0,0,0.15)',
                  transition: 'all 0.15s ease'
                }}
              >
                <svg width="18" height="18" viewBox="0 0 48 48">
                  <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
                  <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
                  <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
                  <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
                  <path fill="none" d="M0 0h48v48H0z"/>
                </svg>
                <span>{mode === 'LOGIN' ? 'Continue with Google' : 'Sign up with Google'}</span>
              </button>
            </div>

            {/* Divider */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div style={{ flex: 1, height: '1px', backgroundColor: 'var(--border-subtle)' }} />
              <span style={{ fontSize: '10px', fontWeight: 800, color: 'var(--text-muted)', letterSpacing: '0.5px' }}>
                OR WITH EMAIL
              </span>
              <div style={{ flex: 1, height: '1px', backgroundColor: 'var(--border-subtle)' }} />
            </div>

            {/* Email / Password Form */}
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

              <button
                type="submit"
                disabled={loading}
                className="m3-button-filled"
                style={{
                  width: '100%',
                  padding: '13px',
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
                  marginTop: '4px',
                  boxShadow: '0 4px 14px rgba(41, 121, 255, 0.4)'
                }}
              >
                {loading ? (
                  <div style={{ width: '18px', height: '18px', border: '2px solid #04060a', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
                ) : (
                  <>
                    <span>{mode === 'LOGIN' ? 'Sign In to Terminal' : 'Create Free Account'}</span>
                    <ArrowRight style={{ width: '16px', height: '16px' }} />
                  </>
                )}
              </button>
            </form>

          </div>
        </div>

      </main>

      {/* Dedicated Google Sign In Dialog */}
      <GoogleSignInModal
        isOpen={showGoogleModal}
        onClose={() => setShowGoogleModal(false)}
        currentMarket={currentMarket}
        onMarketChange={onMarketChange}
      />

    </div>
  );
}
