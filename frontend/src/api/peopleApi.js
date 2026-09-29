import { api } from '../services/api'

export const peopleApi = {
  list: () => api.get('/people'),
  create: (body) => api.post('/people', body),
  update: (id, body) => api.put(`/people/${id}`, body),
  remove: (id) => api.delete(`/people/${id}`),
}
