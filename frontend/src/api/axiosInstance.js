// src/api/axiosInstance.js
import axios from 'axios';
import { tokenHelpers, refreshHelpers, clearSession, isTokenExpired } from '../utils/auth';

const instance = axios.create({
  baseURL: process.env.REACT_APP_API_URL || 'http://localhost:3001/api',
  headers: { 'Content-Type': 'application/json' },
  timeout: 20000,
});

let refreshing = null; // singleton promise — prevent multiple refresh calls

// Attach access token
instance.interceptors.request.use(async (config) => {
  let token = tokenHelpers.get();

  // Auto-refresh if token is expired or near-expiry
  if (isTokenExpired(token)) {
    const refreshToken = refreshHelpers.get();
    if (refreshToken) {
      if (!refreshing) {
        refreshing = axios.post(
          `${process.env.REACT_APP_API_URL || 'http://localhost:3001/api'}/auth/refresh`,
          { refresh_token: refreshToken }
        ).then(res => {
          tokenHelpers.set(res.data.token);
          refreshHelpers.set(res.data.refresh_token);
          refreshing = null;
          return res.data.token;
        }).catch(() => {
          clearSession();
          window.location.href = '/login';
          refreshing = null;
          return null;
        });
      }
      token = await refreshing;
    } else {
      clearSession();
      window.location.href = '/login';
      return config;
    }
  }

  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Handle 401 — session expired
instance.interceptors.response.use(
  res => res,
  err => {
    if (err.response?.status === 401 && err.response?.data?.code !== 'TOKEN_EXPIRED') {
      clearSession();
      window.location.href = '/login';
    }
    return Promise.reject(err);
  }
);

export default instance;
