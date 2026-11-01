import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { api, setUnauthorizedHandler } from '@/lib/api';

const AuthContext = createContext(null);
const TOKEN_KEY = 'slotdrop-token';

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [booting, setBooting] = useState(Boolean(sessionStorage.getItem(TOKEN_KEY)));

  const logout = useCallback(() => { sessionStorage.removeItem(TOKEN_KEY); setUser(null); }, []);

  // Restore the session on page load. A bad/expired token just lands the user on the login screen.
  useEffect(() => {
    setUnauthorizedHandler(logout);
    if (!sessionStorage.getItem(TOKEN_KEY)) return;
    api.me().then((d) => setUser(d.user)).catch(logout).finally(() => setBooting(false));
  }, [logout]);

  const login = useCallback(async (identifier, password) => {
    const { token, user: u } = await api.login(identifier, password);
    sessionStorage.setItem(TOKEN_KEY, token);
    setUser(u);
    return u;
  }, []);

  const value = useMemo(() => ({ user, booting, login, logout }), [user, booting, login, logout]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export const useAuth = () => useContext(AuthContext);
