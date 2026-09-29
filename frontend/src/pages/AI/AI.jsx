import { PageHeader } from '../../components/layout/PageHeader'
import { AIPanel } from '../../components/ai/FloatingAI'
import { suggestedPrompts } from '../../mock/aiResponses'

export function AIPage() {
  return (
    <div>
      <PageHeader
        eyebrow="AI"
        title="SpendWise AI"
        description="Ask natural questions about spending, savings, and categories."
      />
      <div className="mb-6 flex flex-wrap gap-2">
        {suggestedPrompts.map((prompt) => (
          <span key={prompt} className="rounded-full border border-border px-3 py-1 text-xs text-muted">
            {prompt}
          </span>
        ))}
      </div>
      <AIPanel />
    </div>
  )
}
