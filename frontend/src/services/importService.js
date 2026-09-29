import { api } from './api'
import { withMock } from './mockStore'
import { importPreview } from '../mock/imports'

export const importService = {
  async parse(file) {
    return withMock(
      () => ({
        fileName: file.name,
        count: importPreview.length,
        transactions: importPreview.map((row) => ({ ...row })),
      }),
      () => {
        const form = new FormData()
        form.append('file', file)
        return fetch('/api/imports/parse', {
          method: 'POST',
          body: form,
          headers: {},
        }).then((res) => res.json())
      },
    )
  },

  async confirm(payload) {
    return withMock(
      () => ({ imported: payload.transactions.length }),
      () => api.post('/imports/confirm', payload),
    )
  },
}
