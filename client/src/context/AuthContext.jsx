import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import * as authService from '../services/authService';
import { getToken, setToken, setUnauthorizedHandler } from '../services/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(() => Boolean(getToken()));
  const [sessionExpired, setSessionExpired] = useState(false);

  useEffect(() => {
    setUnauthorizedHandler(() => {
      setToken(null);
      setUser(null);
      setSessionExpired(true);
    });
    return () => setUnauthorizedHandler(null);
  }, []);

  // Restore the session on first load.
  useEffect(() => {
    if (!getToken()) return;
    authService
      .me()
      .then(({ user: current }) => setUser(current))
      .catch(() => setToken(null))
      .finally(() => setLoading(false));
  }, []);

  const startSession = useCallback(({ token, user: nextUser }) => {
    setToken(token);
    setUser(nextUser);
    setSessionExpired(false);
    return nextUser;
  }, []);

  const login = useCallback(
    async (email, password) => startSession(await authService.login({ email, password })),
    [startSession],
  );

  const register = useCallback(async (data) => startSession(await authService.register(data)), [startSession]);

  const logout = useCallback(() => {
    setToken(null);
    setUser(null);
  }, []);

  // After PATCH /auth/me, swap in the fresh user (e.g. onboarding answers).
  const updateUser = useCallback((nextUser) => setUser(nextUser), []);

  const value = useMemo(
    () => ({ user, token: getToken(), loading, sessionExpired, login, register, logout, updateUser }),
    [user, loading, sessionExpired, login, register, logout, updateUser],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used inside <AuthProvider>');
  return context;
}
