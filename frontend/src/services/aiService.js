import { api } from './api'

// Readable names for the backend's read-only tools, shown as "grounding" chips under each answer.
const TOOL_LABELS = {
  get_spending_summary: 'Spending summary',
  get_category_breakdown: 'Category breakdown',
  get_monthly_trend: 'Monthly trend',
  get_largest_expenses: 'Largest expenses',
  search_transactions: 'Transaction search',
  get_account_balances: 'Account balances',
  get_group_balances: 'Group balances',
}

export function toolLabel(name) {
  return TOOL_LABELS[name] || name.replaceAll('_', ' ')
}

function toUiMessage(apiMessage) {
  return {
    id: apiMessage.id,
    role: apiMessage.role,
    text: apiMessage.content,
    toolsUsed: apiMessage.tools_used || [],
    createdAt: apiMessage.created_at,
  }
}

export const aiService = {
  // One chat turn. Passing the conversation id keeps the server-side history (last 10 messages).
  async query(prompt, conversationId = null) {
    const result = await api.post('/ai/chat', { message: prompt, conversation_id: conversationId })
    return {
      conversationId: result.conversation_id,
      prompt,
      answer: result.reply,
      // Which tools the model called; an empty list means the answer used no account data.
      toolsUsed: result.tools_used,
    }
  },

  async listConversations() {
    return (await api.get('/ai/conversations')).map((row) => ({
      id: row.id,
      title: row.title,
      updatedAt: row.updated_at,
    }))
  },

  async getMessages(conversationId) {
    return (await api.get(`/ai/conversations/${conversationId}/messages`)).map(toUiMessage)
  },

  async deleteConversation(conversationId) {
    await api.delete(`/ai/conversations/${conversationId}`)
    return { id: conversationId }
  },
}
