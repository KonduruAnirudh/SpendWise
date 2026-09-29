import { useEffect, useRef, useState } from 'react'
import { Sparkles, X } from 'lucide-react'
import { Button } from '../ui/Button'
import { aiService } from '../../services/aiService'
import { suggestedPrompts } from '../../mock/aiResponses'
import { cn } from '../../utils/cn'

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

export function AIPanel({ onClose, floating = false, seed = [] }) {
  const [messages, setMessages] = useState(seed.length ? seed : [
    { role: 'assistant', text: 'Ask me anything about your finances.' },
  ])
  const [prompt, setPrompt] = useState('')
  const [loading, setLoading] = useState(false)
  const endRef = useRef(null)

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, loading])

  async function send(nextPrompt = prompt) {
    if (!nextPrompt.trim()) return
    const userMessage = { role: 'user', text: nextPrompt.trim() }
    setMessages((current) => [...current, userMessage])
    setPrompt('')
    setLoading(true)
    try {
      const result = await aiService.query(nextPrompt.trim())
      setMessages((current) => [...current, { role: 'assistant', text: result.answer }])
    } catch {
      setMessages((current) => [...current, { role: 'assistant', text: 'Something went wrong. Try again.' }])
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
        {onClose && (
          <button type="button" onClick={onClose} className="rounded-lg p-1 text-muted hover:bg-hover" aria-label="Close assistant">
            <X className="size-4" />
          </button>
        )}
      </div>
      <div className="scrollbar-thin flex-1 space-y-3 overflow-y-auto p-4">
        {messages.map((message, index) => (
          <div
            key={`${message.role}-${index}`}
            className={cn(
              'max-w-[90%] rounded-2xl px-3 py-2 text-sm',
              message.role === 'user' ? 'ml-auto bg-accent-muted text-fg' : 'bg-hover text-muted',
            )}
          >
            {message.text}
          </div>
        ))}
        {loading && <p className="text-xs text-subtle">Thinking…</p>}
        <div ref={endRef} />
      </div>
      <div className="border-t border-border p-3">
        <div className="mb-2 flex flex-wrap gap-1.5">
          {suggestedPrompts.slice(0, 3).map((item) => (
            <button
              key={item}
              type="button"
              className="rounded-full border border-border px-2 py-1 text-[11px] text-muted hover:border-accent/40 hover:text-fg"
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
            className="h-10 flex-1 rounded-xl border border-border bg-surface px-3 text-sm outline-none focus:border-accent/50"
          />
          <Button type="submit" size="sm" loading={loading}>
            Ask
          </Button>
        </form>
      </div>
    </div>
  )
}
