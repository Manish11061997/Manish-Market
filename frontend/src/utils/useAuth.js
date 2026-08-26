import { useState, useEffect, useCallback } from 'react';
import { apiFetch, getAuthToken, setAuthToken } from './api';
import { signInWithRealGoogle, checkRedirectAuth } from './firebase';

const USER_STORAGE_KEY = 'manish_market_current_user';
const AUTH_EVENT = 'manish_market_auth_change';

function getStoredUser() {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(USER_STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function saveStoredUser(user) {
  if (typeof window === 'undefined') return;
  if (user) {
    localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(user));
  } else {
    localStorage.removeItem(USER_STORAGE_KEY);
  }
  window.dispatchEvent(new CustomEvent(AUTH_EVENT, { detail: user }));
}

export function useAuth() {
  const [currentUser, setCurrentUser] = useState(getStoredUser);
  const [token, setToken] = useState(getAuthToken);
  const [loading, setLoading] = useState(false);
  const [authError, setAuthError] = useState(null);

  // Sync auth state across components and browser windows
  useEffect(() => {
    const handleAuthChange = (e) => {
      setCurrentUser(e.detail);
      setToken(getAuthToken());
    };
    window.addEventListener(AUTH_EVENT, handleAuthChange);
    return () => window.removeEventListener(AUTH_EVENT, handleAuthChange);
  }, []);

  // On initial mount, check for redirect auth or verify existing session
  useEffect(() => {
    checkRedirectAuth().then(async (googleUser) => {
      if (googleUser?.email) {
        try {
          const res = await apiFetch('/api/auth/google', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name: googleUser.name, email: googleUser.email, marketPreference: 'IN' })
          });
          if (res.ok) {
            const data = await res.json();
            setAuthToken(data.token);
            saveStoredUser(data.user);
            setCurrentUser(data.user);
            setToken(data.token);
            return;
          }
        } catch (e) {
          console.warn('Redirect login sync notice:', e);
        }
      }

      // Check existing token
      const activeToken = getAuthToken();
      if (activeToken && !currentUser) {
        apiFetch('/api/auth/me')
          .then(async res => {
            if (res.ok) {
              const data = await res.json();
              if (data?.user) {
                setCurrentUser(data.user);
                saveStoredUser(data.user);
              }
            } else {
              setAuthToken(null);
              saveStoredUser(null);
              setCurrentUser(null);
              setToken(null);
            }
          })
          .catch(() => {});
      }
    });
  }, []);

  const signup = useCallback(async (name, email, password, marketPreference = 'IN') => {
    setLoading(true);
    setAuthError(null);
    try {
      const res = await apiFetch('/api/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, password, marketPreference })
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.detail || 'Signup failed. Please try again.');
      }
      setAuthToken(data.token);
      saveStoredUser(data.user);
      setCurrentUser(data.user);
      setToken(data.token);
      setLoading(false);
      return data.user;
    } catch (err) {
      setLoading(false);
      setAuthError(err.message);
      throw err;
    }
  }, []);

  const login = useCallback(async (email, password) => {
    setLoading(true);
    setAuthError(null);
    try {
      const res = await apiFetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.detail || 'Login failed. Invalid credentials.');
      }
      setAuthToken(data.token);
      saveStoredUser(data.user);
      setCurrentUser(data.user);
      setToken(data.token);
      setLoading(false);
      return data.user;
    } catch (err) {
      setLoading(false);
      setAuthError(err.message);
      throw err;
    }
  }, []);

  const loginWithGoogle = useCallback(async (customName, customEmail, marketPreference = 'IN') => {
    setLoading(true);
    setAuthError(null);
    try {
      let email = customEmail;
      let name = customName;

      // If no email provided directly, trigger real Google OAuth popup
      if (!email) {
        const googleUser = await signInWithRealGoogle();
        email = googleUser.email;
        name = googleUser.name;
      }

      const res = await apiFetch('/api/auth/google', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, marketPreference })
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.detail || 'Google sign-in failed.');
      }
      setAuthToken(data.token);
      saveStoredUser(data.user);
      setCurrentUser(data.user);
      setToken(data.token);
      setLoading(false);
      return data.user;
    } catch (err) {
      setLoading(false);
      setAuthError(err.message);
      throw err;
    }
  }, []);

  const logout = useCallback(() => {
    setAuthToken(null);
    saveStoredUser(null);
    setCurrentUser(null);
    setToken(null);
  }, []);

  const updateProfile = useCallback(async (updates) => {
    try {
      const res = await apiFetch('/api/auth/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates)
      });
      if (res.ok) {
        const data = await res.json();
        if (data?.user) {
          saveStoredUser(data.user);
          setCurrentUser(data.user);
          return data.user;
        }
      }
    } catch (err) {
      console.warn('Profile update notice:', err);
    }
  }, []);

  return {
    currentUser,
    token,
    isAuthenticated: Boolean(currentUser && token),
    isGuest: !currentUser,
    loading,
    authError,
    signup,
    login,
    loginWithGoogle,
    logout,
    updateProfile
  };
}
