import api from './axiosInstance';
export const authAPI = {
  login:          (email, password) => api.post('/auth/login',           { email, password }),
  logout:         (refresh_token)   => api.post('/auth/logout',          { refresh_token }),
  refresh:        (refresh_token)   => api.post('/auth/refresh',         { refresh_token }),
  me:             ()                => api.get('/auth/me'),
  changePassword: (data)            => api.post('/auth/change-password', data),
};
