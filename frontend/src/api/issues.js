import api from './axiosInstance';
export const issuesAPI = {
  list:        (p)        => api.get('/conversations',                        { params: p }),
  get:         (id)       => api.get(`/conversations/${id}`),
  update:      (id, data) => api.patch(`/conversations/${id}`,               data),
  messages:    (id, p)    => api.get(`/messages/conversations/${id}/messages`,{ params: p }),
  sendMessage: (id, data) => api.post(`/messages/conversations/${id}/messages`, data),
  addTag:      (id, tid)  => api.post(`/conversations/${id}/tags`,           { tag_id: tid }),
  removeTag:   (id, tid)  => api.delete(`/conversations/${id}/tags/${tid}`),
  resolve:     (id)       => api.patch(`/conversations/${id}`,               { status: 'resolved' }),
  reopen:      (id)       => api.patch(`/conversations/${id}`,               { status: 'open' }),
  snooze:      (id)       => api.patch(`/conversations/${id}`,               { status: 'snoozed' }),
  assign:      (id, uid)  => api.patch(`/conversations/${id}`,               { assigned_to: uid }),
  markSpam:    (id)       => api.patch(`/conversations/${id}`,               { status: 'spam', is_spam: true }),
};
export const tagsAPI    = { list: (p) => api.get('/tags',   { params: p }), create: (d) => api.post('/tags', d) };
export const cannedAPI  = {
  list:   (p)  => api.get('/canned',       { params: p }),
  create: (d)  => api.post('/canned',       d),
  use:    (id) => api.post(`/canned/${id}/use`),
  delete: (id) => api.delete(`/canned/${id}`),
};
export const slaAPI     = { breaches: () => api.get('/dashboard/sla-breaches') };
