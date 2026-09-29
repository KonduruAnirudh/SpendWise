import { api } from '../services/api'

export const billsApi = {
  upload: (body) => api.post('/bills/upload', body),
  extract: (id) => api.post(`/bills/${id}/extract`),
  review: (id, body) => api.put(`/bills/${id}`, body),
  confirm: (id, body) => api.post(`/bills/${id}/confirm`, body),
}
