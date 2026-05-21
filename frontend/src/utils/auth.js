// src/utils/auth.js
const TOKEN_KEY   = 'salaam_access_token';
const REFRESH_KEY = 'salaam_refresh_token';
const USER_KEY    = 'salaam_user';

export const tokenHelpers = {
  get:    ()      => sessionStorage.getItem(TOKEN_KEY),      // sessionStorage — cleared on tab close
  set:    (t)     => sessionStorage.setItem(TOKEN_KEY, t),
  remove: ()      => sessionStorage.removeItem(TOKEN_KEY),
};

export const refreshHelpers = {
  get:    ()      => localStorage.getItem(REFRESH_KEY),      // localStorage — persists across tabs
  set:    (t)     => localStorage.setItem(REFRESH_KEY, t),
  remove: ()      => localStorage.removeItem(REFRESH_KEY),
};

export const userHelpers = {
  get:    ()      => { try { return JSON.parse(sessionStorage.getItem(USER_KEY)); } catch { return null; } },
  set:    (u)     => sessionStorage.setItem(USER_KEY, JSON.stringify(u)),
  remove: ()      => sessionStorage.removeItem(USER_KEY),
};

export const clearSession = () => {
  tokenHelpers.remove();
  refreshHelpers.remove();
  userHelpers.remove();
};

export const isTokenExpired = (token) => {
  if (!token) return true;
  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    // Consider expired 60 seconds before actual expiry to allow refresh
    return payload.exp * 1000 < Date.now() + 60000;
  } catch { return true; }
};

export const hasRole      = (user, ...roles) => roles.includes(user?.role);
export const isAdmin      = (user) => user?.role === 'admin';
export const canAccess    = (user, channel) => user?.role === 'admin' || (user?.channels || []).includes(channel);
export const canAccessDept= (user, deptId)  => user?.role === 'admin' || (user?.departments || []).some(d => d.id === deptId);
