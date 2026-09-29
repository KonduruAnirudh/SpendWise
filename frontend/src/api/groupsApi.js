import { api } from '../services/api'

export const groupsApi = {
  list: () => api.get('/groups'),
  get: (id) => api.get(`/groups/${id}`),
  create: (body) => api.post('/groups', body),
  update: (id, body) => api.put(`/groups/${id}`, body),
  members: (id) => api.get(`/groups/${id}/members`),
  addMember: (id, body) => api.post(`/groups/${id}/members`, body),
  removeMember: (id, personId) => api.delete(`/groups/${id}/members/${personId}`),
  remove: (id) => api.delete(`/groups/${id}`),
}
