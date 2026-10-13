import React, { createContext, useContext, useState, useEffect } from 'react';
import { api } from '../services/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    const saved = localStorage.getItem('bg_user');
    return saved ? JSON.parse(saved) : null;
  });
  const [token, setToken] = useState(() => localStorage.getItem('bg_token') || null);
  const [loading, setLoading] = useState(true);
  const [isDark, setIsDark] = useState(() => localStorage.getItem('bg_theme') === 'dark');
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [toasts, setToasts] = useState([]);

  useEffect(() => {
    // Apply theme
    if (isDark) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('bg_theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('bg_theme', 'light');
    }
  }, [isDark]);

  useEffect(() => {
    const initAuth = async () => {
      if (token) {
        try {
          const profile = await api.getMe();
          setUser(profile);
          localStorage.setItem('bg_user', JSON.stringify(profile));
        } catch (err) {
          console.error("Token verification failed:", err);
          logout();
        }
      }
      setLoading(false);
    };
    initAuth();
  }, [token]);

  const login = async (email, password) => {
    const res = await api.login({ email, password });
    setToken(res.access_token);
    setUser(res.user);
    localStorage.setItem('bg_token', res.access_token);
    localStorage.setItem('bg_user', JSON.stringify(res.user));

    // Check if first-time user
    const hasSeen = localStorage.getItem(`bg_onboarding_${res.user.id}`);
    if (!hasSeen) {
      setShowOnboarding(true);
    }
    return res.user;
  };

  const register = async (userData) => {
    const res = await api.register(userData);
    setToken(res.access_token);
    setUser(res.user);
    localStorage.setItem('bg_token', res.access_token);
    localStorage.setItem('bg_user', JSON.stringify(res.user));
    setShowOnboarding(true);
    return res.user;
  };

  const logout = () => {
    setToken(null);
    setUser(null);
    localStorage.removeItem('bg_token');
    localStorage.removeItem('bg_user');
  };

  const toggleTheme = () => setIsDark(prev => !prev);

  const addToast = (message, type = 'info') => {
    const id = Date.now() + Math.random();
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 4500);
  };

  const removeToast = (id) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  };

  const completeOnboarding = () => {
    if (user) {
      localStorage.setItem(`bg_onboarding_${user.id}`, 'true');
    }
    setShowOnboarding(false);
  };

  return (
    <AuthContext.Provider value={{
      user,
      token,
      loading,
      isAuthenticated: !!user,
      isAdmin: user?.role === 'admin',
      login,
      register,
      logout,
      isDark,
      toggleTheme,
      toasts,
      addToast,
      removeToast,
      showOnboarding,
      setShowOnboarding,
      completeOnboarding
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
