// src/context/UserContext.jsx
import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useAuth } from './AuthContext';
import { issuesAPI } from '../api/issues';
import { dashboardAPI } from '../api/roles';

const UserContext = createContext(null);

export function UserProvider({ children }) {
  const { user } = useAuth();
  const [unreadCount,  setUnreadCount]  = useState(0);
  const [breachCount,  setBreachCount]  = useState(0);
  const [lastRefresh,  setLastRefresh]  = useState(null);

  const refresh = useCallback(async () => {
    if (!user) return;
    try {
      const [convRes, dashRes] = await Promise.all([
        issuesAPI.list({ status: 'open', limit: 200 }),
        dashboardAPI.slaBreaches(),
      ]);
      const total = (convRes.data.conversations || []).reduce((s, c) => s + parseInt(c.unread_count || 0), 0);
      setUnreadCount(total);
      setBreachCount((dashRes.data.breaches || []).length);
      setLastRefresh(new Date());
    } catch {}
  }, [user]);

  useEffect(() => {
    if (!user) return;
    refresh();
    const interval = setInterval(refresh, 60000);
    return () => clearInterval(interval);
  }, [user, refresh]);

  const canAccessChannel  = (ch) => user?.role === 'admin' || (user?.channels || []).includes(ch);
  const canAccessDept     = (id) => user?.role === 'admin' || (user?.departments || []).some(d => d.id === id);

  return (
    <UserContext.Provider value={{
      unreadCount, breachCount, lastRefresh, refresh,
      canAccessChannel, canAccessDept,
      isAdmin:  user?.role === 'admin',
      isAgent:  user?.role === 'agent',
      isViewer: user?.role === 'viewer',
      myChannels:    user?.channels    || [],
      myDepartments: user?.departments || [],
      mustChangePassword: user?.must_change_password,
    }}>
      {children}
    </UserContext.Provider>
  );
}

export const useUser = () => useContext(UserContext);
