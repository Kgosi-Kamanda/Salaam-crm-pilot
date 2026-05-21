import api from './axiosInstance';
export const rolesAPI    = { auditLog: (p) => api.get('/audit',       { params: p }) };
export const dashboardAPI= { stats: () => api.get('/dashboard/stats'), slaBreaches: () => api.get('/dashboard/sla-breaches') };
export const broadcastAPI= {
  templates:        ()           => api.get('/broadcasts/templates'),
  createTemplate:   (d)          => api.post('/broadcasts/templates',    d),
  updateApproval:   (id, d)      => api.patch(`/broadcasts/templates/${id}/approval`, d),
  list:             ()           => api.get('/broadcasts'),
  stats:            (id)         => api.get(`/broadcasts/${id}/stats`),
  create:           (d)          => api.post('/broadcasts',               d),
  send:             (id)         => api.post(`/broadcasts/${id}/send`),
  cancel:           (id, reason) => api.patch(`/broadcasts/${id}/cancel`, { reason }),
  optIn:            (d)          => api.post('/broadcasts/opt-in',        d),
};
