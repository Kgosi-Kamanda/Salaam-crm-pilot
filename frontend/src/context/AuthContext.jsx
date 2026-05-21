// src/context/AuthContext.jsx
import { createContext, useContext, useState, useEffect } from 'react';
import { authAPI } from '../api/auth';
import { tokenHelpers, refreshHelpers, userHelpers, clearSession, isTokenExpired } from '../utils/auth';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user,    setUser]    = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const init = async () => {
      const token        = tokenHelpers.get();
      const refreshToken = refreshHelpers.get();
      const savedUser    = userHelpers.get();

      if (token && savedUser && !isTokenExpired(token)) {
        setUser(savedUser);
        // Verify with server in background
        authAPI.me().then(res => { setUser(res.data.user); userHelpers.set(res.data.user); }).catch(() => {});
      } else if (refreshToken) {
        // Try to refresh
        try {
          const res = await authAPI.refresh(refreshToken);
          tokenHelpers.set(res.data.token);
          refreshHelpers.set(res.data.refresh_token);
          const meRes = await authAPI.me();
          setUser(meRes.data.user);
          userHelpers.set(meRes.data.user);
        } catch {
          clearSession();
        }
      } else {
        clearSession();
      }
      setLoading(false);
    };
    init();
  }, []);

  const login = async (email, password) => {
    const res = await authAPI.login(email, password);
    const { token, refresh_token, user } = res.data;
    tokenHelpers.set(token);
    refreshHelpers.set(refresh_token);
    userHelpers.set(user);
    setUser(user);
    return user;
  };

  const logout = async () => {
    const rt = refreshHelpers.get();
    try { await authAPI.logout(rt); } catch {}
    clearSession();
    setUser(null);
  };

  const refreshUser = async () => {
    const res = await authAPI.me();
    setUser(res.data.user);
    userHelpers.set(res.data.user);
    return res.data.user;
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, loading, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
