import { useEffect, useRef, useState } from 'react'
import { RotateCcw, Sparkles, X } from 'lucide-react'
import { Button } from '../ui/Button'
import { aiService, toolLabel } from '../../services/aiService'
import { AI_SUGGESTED_PROMPTS } from '../../utils/constants'
import { cn } from '../../utils/cn'

const MAX_MESSAGE = 2000
const GREETING = { role: 'assistant', text: 'Ask me anything about your spending, accounts, or groups.' }

export function FloatingAI() {
  const [open, setOpen] = useState(false)

  useEffect(() => {
    const onOpen = () => setOpen(true)
    document.addEventListener('spendwise:open-ai', onOpen)
    return () => document.removeEventListener('spendwise:open-ai', onOpen)
  }, [])

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="fixed right-4 bottom-20 z-40 flex size-12 items-center justify-center rounded-full bg-accent text-accent-fg shadow-lg transition hover:brightness-110 md:right-6 md:bottom-6"
        aria-label="Open SpendWise AI"
      >
        <Sparkles className="size-5" />
      </button>
      {open && <AIPanel onClose={() => setOpen(false)} floating />}
    </>
  )
}

// Counts seconds while a reply is pending; the first reply can take up to a minute while the model loads.
function useElapsedSeconds(active) {
  const [seconds, setSeconds] = useState(0)
  useEffect(() => {
    if (!active) return undefined
    const started = Date.now()
    const timer = window.setInterval(() => setSeconds(Math.floor((Date.now() - started) / 1000)), 1000)
    return () => {
      window.clearInterval(timer)
      setSeconds(0)
    }
  }, [active])
  return seconds
}

export function AIPanel({ onClose, floating = false, seed = [], conversationId: initialConversationId = null, onConversation }) {
  const [messages, setMessages] = useState(seed.length ? seed : [GREETING])
  const [conversationId, setConversationId] = useState(initialConversationId)
  const [prompt, setPrompt] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const elapsed = useElapsedSeconds(loading)
  const endRef = useRef(null)

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, loading])

  function newChat() {
    setMessages([GREETING])
    setConversationId(null)
    setError('')
  }

  async function send(nextPrompt = prompt) {
    const text = nextPrompt.trim()
    if (!text || loading) return
    if (text.length > MAX_MESSAGE) {
      setError(`Messages can be up to ${MAX_MESSAGE} characters (this one is ${text.length}).`)
      return
    }
    setError('')
    setMessages((current) => [...current, { role: 'user', text }])
    setPrompt('')
    setLoading(true)
    try {
      const result = await aiService.query(text, conversationId)
      setConversationId(result.conversationId)
      onConversation?.(result.conversationId)
      setMessages((current) => [...current, { role: 'assistant', text: result.answer, toolsUsed: result.toolsUsed }])
    } catch (err) {
      // 503: the model server is down or timed out; the backend sends a friendly message.
      const unavailable = err.status === 503
      setMessages((current) => [
        ...current,
        {
          role: 'assistant',
          tone: 'warning',
          text: unavailable ? err.message : `Something went wrong: ${err.message}`,
        },
      ])
    } finally {
      setLoading(false)
    }
  }

  return (
    <div
      className={cn(
        'flex flex-col border border-border bg-card shadow-2xl',
        floating
          ? 'fixed right-4 bottom-36 z-40 h-[min(72vh,520px)] w-[min(92vw,380px)] rounded-2xl animate-scale-in md:right-6 md:bottom-24'
          : 'h-[min(70vh,640px)] w-full rounded-2xl',
      )}
    >
      <div className="flex items-center justify-between border-b border-border px-4 py-3">
        <div className="flex items-center gap-2">
          <Sparkles className="size-4 text-accent" />
          <p className="text-sm font-semibold">SpendWise AI</p>
        </div>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={newChat}
            className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs text-muted hover:bg-hover"
            aria-label="Start a new chat"
          >
            <RotateCcw className="size-3.5" /> New chat
          </button>
          {onClose && (
            <button type="button" onClick={onClose} className="rounded-lg p-1 text-muted hover:bg-hover" aria-label="Close assistant">
              <X className="size-4" />
            </button>
          )}
        </div>
      </div>
      <div className="scrollbar-thin flex-1 space-y-3 overflow-y-auto p-4">
        {messages.map((message, index) => (
          <div key={message.id ?? `${message.role}-${index}`} className={cn('max-w-[90%]', message.role === 'user' && 'ml-auto')}>
            <div
              className={cn(
                'rounded-2xl px-3 py-2 text-sm whitespace-pre-wrap',
                message.role === 'user' && 'bg-accent-muted text-fg',
                message.role !== 'user' && message.tone !== 'warning' && 'bg-hover text-muted',
                message.tone === 'warning' && 'border border-danger/30 bg-card text-danger',
              )}
            >
              {message.text}
            </div>
            {message.role === 'assistant' && Array.isArray(message.toolsUsed) && <ToolChips tools={message.toolsUsed} />}
          </div>
        ))}
        {loading && (
          <div className="text-xs text-subtle" role="status">
            <p>Thinking… {elapsed > 0 ? `${elapsed}s` : ''}</p>
            {elapsed >= 5 && <p className="mt-1">The first answer can take up to a minute while the model loads.</p>}
          </div>
        )}
        <div ref={endRef} />
      </div>
      <div className="border-t border-border p-3">
        <div className="mb-2 flex flex-wrap gap-1.5">
          {AI_SUGGESTED_PROMPTS.slice(0, 3).map((item) => (
            <button
              key={item}
              type="button"
              disabled={loading}
              className="rounded-full border border-border px-2 py-1 text-[11px] text-muted hover:border-accent/40 hover:text-fg disabled:opacity-50"
              onClick={() => send(item)}
            >
              {item}
            </button>
          ))}
        </div>
        <form
          className="flex gap-2"
          onSubmit={(event) => {
            event.preventDefault()
            send()
          }}
        >
          <input
            value={prompt}
            onChange={(event) => setPrompt(event.target.value)}
            placeholder="Ask SpendWise..."
            aria-label="Message SpendWise AI"
            className="h-10 flex-1 rounded-xl border border-border bg-surface px-3 text-sm outline-none focus:border-accent/50"
          />
          <Button type="submit" size="sm" loading={loading}>
            Ask
          </Button>
        </form>
        {error && <p className="mt-2 text-xs text-danger">{error}</p>}
      </div>
    </div>
  )
}

// Grounding indicator: which read-only tools the model called to answer.
function ToolChips({ tools }) {
  if (!tools.length) {
    return <p className="mt-1 px-1 text-[11px] text-subtle">Answered without looking up your data</p>
  }
  return (
    <div className="mt-1 flex flex-wrap items-center gap-1 px-1">
      <span className="text-[11px] text-subtle">Checked:</span>
      {tools.map((tool) => (
        <span key={tool} className="rounded-full border border-accent/30 bg-accent-muted px-2 py-0.5 text-[11px] text-accent">
          {toolLabel(tool)}
        </span>
      ))}
    </div>
  )
}
