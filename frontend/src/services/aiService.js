import { api } from './api'
import { withMock } from './mockStore'
import { aiResponses, defaultAiAnswer } from '../mock/aiResponses'
import { generateId } from '../utils/formatters'

export const aiService = {
  async query(prompt) {
    return withMock(
      () => {
        const match = aiResponses.find((item) => item.match.test(prompt))
        return {
          id: generateId('ai'),
          prompt,
          answer: match?.answer || defaultAiAnswer,
        }
      },
      () => api.post('/ai/query', { prompt }),
    )
  },
}
