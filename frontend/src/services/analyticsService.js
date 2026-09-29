import { api } from './api'
import { withMock } from './mockStore'
import {
  summary,
  monthlySeries,
  categorySpending,
  accountSpending,
  insights,
  reports,
} from '../mock/analytics'

export const analyticsService = {
  async getSummary() {
    return withMock(
      () => summary,
      () => api.get('/analytics/summary'),
    )
  },

  async getDashboard() {
    return withMock(
      () => ({ summary, monthlySeries, categorySpending }),
      () => api.get('/analytics/dashboard'),
    )
  },

  async getAnalytics() {
    return withMock(
      () => ({ monthlySeries, categorySpending, accountSpending, insights, summary }),
      () => api.get('/analytics'),
    )
  },

  async getReports() {
    return withMock(
      () => reports,
      () => api.get('/analytics/reports'),
    )
  },
}
