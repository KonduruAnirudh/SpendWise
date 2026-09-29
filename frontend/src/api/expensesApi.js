import { api } from '../services/api'

export const expensesApi = {
  summary: () => api.get('/expenses/summary'),
  list: (groupId) => api.get(groupId ? `/expenses?groupId=${groupId}` : '/expenses'),
  create: (body) => api.post('/expenses', body),
  balances: (groupId) => api.get(groupId ? `/settlements/balances?groupId=${groupId}` : '/settlements/balances'),
  settlements: (groupId) => api.get(groupId ? `/settlements?groupId=${groupId}` : '/settlements'),
  settle: (id) => api.post(`/settlements/${id}/settle`),
}
