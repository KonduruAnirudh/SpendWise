import { useState } from 'react'
import { Trash2 } from 'lucide-react'
import { PageHeader } from '../../components/layout/PageHeader'
import { Card, CardHeader } from '../../components/ui/Card'
import { AIPanel } from '../../components/ai/FloatingAI'
import { useAsync } from '../../hooks/useAsync'
import { useToast } from '../../context/ToastContext'
import { aiService } from '../../services/aiService'
import { AI_SUGGESTED_PROMPTS } from '../../utils/constants'
import { cn } from '../../utils/cn'
import { formatDate } from '../../utils/formatters'

export function AIPage() {
  const { push } = useToast()
  const conversations = useAsync(() => aiService.listConversations(), [])
  // Remounting the panel (via key) loads a different conversation into it.
  const [active, setActive] = useState({ key: 'new', id: null, messages: [] })

  async function open(conversation) {
    try {
      const messages = await aiService.getMessages(conversation.id)
      setActive({ key: `c-${conversation.id}`, id: conversation.id, messages })
    } catch (error) {
      push(error.message, 'error')
    }
  }

  async function remove(conversation) {
    try {
      await aiService.deleteConversation(conversation.id)
      if (active.id === conversation.id) setActive({ key: `new-${Date.now()}`, id: null, messages: [] })
      conversations.refetch()
    } catch (error) {
      push(error.message, 'error')
    }
  }

  return (
    <div>
      <PageHeader
        eyebrow="AI"
        title="SpendWise AI"
        description="Ask natural questions about spending, accounts, and groups. Answers come from your own data."
      />
      <div className="mb-6 flex flex-wrap gap-2">
        {AI_SUGGESTED_PROMPTS.map((prompt) => (
          <span key={prompt} className="rounded-full border border-border px-3 py-1 text-xs text-muted">
            {prompt}
          </span>
        ))}
      </div>
      <div className="grid gap-4 lg:grid-cols-[260px_1fr]">
        <Card className="h-fit">
          <CardHeader title="Conversations" />
          {!conversations.data?.length ? (
            <p className="text-sm text-muted">No conversations yet.</p>
          ) : (
            <ul className="space-y-1">
              {conversations.data.map((conversation) => (
                <li key={conversation.id} className="group flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => open(conversation)}
                    className={cn(
                      'flex-1 truncate rounded-lg px-2 py-1.5 text-left text-sm hover:bg-hover',
                      active.id === conversation.id ? 'bg-hover text-fg' : 'text-muted',
                    )}
                    title={conversation.title}
                  >
                    {conversation.title}
                    <span className="block text-[11px] text-subtle">{formatDate(conversation.updatedAt)}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => remove(conversation)}
                    className="rounded-lg p-1.5 text-muted hover:text-danger"
                    aria-label={`Delete conversation ${conversation.title}`}
                  >
                    <Trash2 className="size-3.5" />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </Card>
        <AIPanel
          key={active.key}
          seed={active.messages}
          conversationId={active.id}
          onConversation={(id) => {
            if (id !== active.id) conversations.refetch()
          }}
        />
      </div>
    </div>
  )
}
