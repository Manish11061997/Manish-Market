import React, { useState, useRef, useEffect } from 'react';
import { User, LogOut, ShieldCheck, ChevronDown, Sparkles, Globe } from 'lucide-react';
import { useAuth } from '../utils/useAuth';

export default function UserProfileDropdown({ onOpenAuthModal, currentMarket = 'IN', onMarketChange }) {
  const { currentUser, isAuthenticated, isGuest, logout } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  if (isGuest || !isAuthenticated) {
    return (
      <button
        type="button"
        onClick={onOpenAuthModal}
        className="m3-button-filled"
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
          padding: '6px 12px',
          borderRadius: '20px',
          fontSize: '11px',
          fontWeight: 800,
          backgroundColor: 'var(--accent-blue)',
          color: '#04060a',
          border: 'none',
          cursor: 'pointer',
          boxShadow: '0 2px 10px rgba(41, 121, 255, 0.3)'
        }}
      >
        <User style={{ width: '13px', height: '13px' }} />
        <span>Sign In</span>
      </button>
    );
  }

  const initials = currentUser?.name
    ? currentUser.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()
    : 'MM';

  return (
    <div ref={dropdownRef} style={{ position: 'relative' }}>
      <button
        type="button"
        onClick={() => setIsOpen(p => !p)}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          padding: '4px 10px 4px 6px',
          borderRadius: '20px',
          backgroundColor: 'var(--bg-elevated)',
          border: '1px solid var(--border-subtle)',
          cursor: 'pointer',
          transition: 'all 0.15s ease'
        }}
      >
        <div style={{
          width: '26px',
          height: '26px',
          borderRadius: '50%',
          backgroundColor: 'var(--accent-blue)',
          color: '#04060a',
          fontSize: '11px',
          fontWeight: 900,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }}>
          {initials}
        </div>
        <div style={{ textAlign: 'left', display: 'flex', flexDirection: 'column' }}>
          <span style={{ fontSize: '11px', fontWeight: 800, color: 'var(--text-main)', maxWidth: '90px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {currentUser?.name || 'Trader'}
          </span>
        </div>
        <ChevronDown style={{ width: '12px', height: '12px', color: 'var(--text-muted)' }} />
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div style={{
          position: 'absolute',
          top: '100%',
          right: 0,
          marginTop: '8px',
          width: '240px',
          backgroundColor: 'var(--bg-surface)',
          border: '1px solid var(--border-bright)',
          borderRadius: '16px',
          padding: '12px',
          boxShadow: '0 10px 30px rgba(0,0,0,0.8)',
          zIndex: 1000,
          display: 'flex',
          flexDirection: 'column',
          gap: '10px'
        }}>
          {/* User Info Header */}
          <div style={{
            paddingBottom: '10px',
            borderBottom: '1px solid var(--border-subtle)',
            display: 'flex',
            alignItems: 'center',
            gap: '10px'
          }}>
            <div style={{
              width: '36px',
              height: '36px',
              borderRadius: '50%',
              backgroundColor: 'var(--accent-blue)',
              color: '#04060a',
              fontSize: '13px',
              fontWeight: 900,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0
            }}>
              {initials}
            </div>
            <div style={{ minWidth: 0 }}>
              <div style={{ fontSize: '13px', fontWeight: 800, color: 'var(--text-main)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {currentUser?.name}
              </div>
              <div style={{ fontSize: '11px', color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {currentUser?.email}
              </div>
            </div>
          </div>

          {/* Account Status Badge */}
          <div style={{
            padding: '8px 10px',
            borderRadius: '10px',
            backgroundColor: 'var(--accent-green-bg)',
            border: '1px solid var(--accent-green-border)',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            fontSize: '11px',
            color: 'var(--accent-green)',
            fontWeight: 700
          }}>
            <ShieldCheck style={{ width: '14px', height: '14px' }} />
            <span>Private Isolated Account</span>
          </div>

          {/* Quick Actions */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <button
              type="button"
              onClick={() => {
                logout();
                setIsOpen(false);
              }}
              style={{
                width: '100%',
                padding: '8px 10px',
                borderRadius: '8px',
                border: 'none',
                backgroundColor: 'transparent',
                color: 'var(--accent-red)',
                fontSize: '12px',
                fontWeight: 700,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                textAlign: 'left'
              }}
              onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--accent-red-bg)'}
              onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
            >
              <LogOut style={{ width: '14px', height: '14px' }} />
              <span>Log Out</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
