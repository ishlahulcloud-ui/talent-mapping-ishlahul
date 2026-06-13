import { createContext, useContext, useState, useCallback } from 'react';
import { dataService } from '../services/dataService.js';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => dataService.currentUser());

  const login = useCallback(async (creds) => {
    const u = await dataService.login(creds);
    setUser(u);
    return u;
  }, []);

  const logout = useCallback(() => {
    dataService.logout();
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider value={{ user, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
