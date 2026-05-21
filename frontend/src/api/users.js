import api from './axiosInstance';
export const contactsAPI = {
  list:     (p)        => api.get('/contacts',        { params: p }),
  get:      (id)       => api.get(`/contacts/${id}`),
  create:   (data)     => api.post('/contacts',        data),
  update:   (id, data) => api.patch(`/contacts/${id}`, data),
  delete:   (id, data) => api.delete(`/contacts/${id}`,{ data }),
};
export const teamAPI = {
  list:        ()          => api.get('/team'),
  create:      (data)      => api.post('/team',         data),
  update:      (id, data)  => api.patch(`/team/${id}`,  data),
  departments: ()          => api.get('/team/departments'),
  createDept:  (data)      => api.post('/team/departments', data),
};
