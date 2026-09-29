import { useState } from 'react'
import { PageHeader } from '../../components/layout/PageHeader'
import { Button } from '../../components/ui/Button'
import { Input } from '../../components/ui/Input'
import { Card } from '../../components/ui/Card'
import { Modal } from '../../components/ui/Modal'
import { ConfirmDialog } from '../../components/ui/ConfirmDialog'
import { Avatar } from '../../components/ui/Avatar'
import { EmptyState, ErrorState } from '../../components/ui/EmptyState'
import { SkeletonCard } from '../../components/ui/Skeleton'
import { PersonForm } from '../../features/expense-sharing/components/PersonForm'
import { useAsync } from '../../hooks/useAsync'
import { useToast } from '../../context/ToastContext'
import { peopleService } from '../../services/peopleService'
import { validatePerson } from '../../utils/validators'

const emptyPerson = { name: '', email: '', phone: '' }

export function PeoplePage() {
  const { push } = useToast()
  const [query, setQuery] = useState('')
  const list = useAsync(() => peopleService.list(), [])
  const [editing, setEditing] = useState(null)
  const [form, setForm] = useState(emptyPerson)
  const [errors, setErrors] = useState({})
  const [deleting, setDeleting] = useState(null)

  async function save() {
    const nextErrors = validatePerson(form)
    setErrors(nextErrors)
    if (Object.keys(nextErrors).length) return
    if (editing === 'new') {
      await peopleService.create(form)
      push('Person added.')
    } else {
      await peopleService.update(editing.id, form)
      push('Person updated.')
    }
    setEditing(null)
    list.refetch()
  }

  if (list.loading && !list.data) return <SkeletonCard rows={5} />
  if (list.error) return <ErrorState message="Unable to load people." onRetry={list.refetch} />

  const q = query.trim().toLowerCase()
  const people = (list.data || []).filter(
    (person) => !q || person.name.toLowerCase().includes(q) || person.email?.toLowerCase().includes(q),
  )

  return (
    <div>
      <PageHeader
        eyebrow="Expense sharing"
        title="People"
        description="A shared contact list. Groups stay empty until you explicitly add people."
        actions={
          <Button
            onClick={() => {
              setForm(emptyPerson)
              setErrors({})
              setEditing('new')
            }}
          >
            + Add person
          </Button>
        }
      />
      <div className="mb-5">
        <Input placeholder="Search people..." value={query} onChange={(event) => setQuery(event.target.value)} />
      </div>
      {people.length === 0 ? (
        <EmptyState title="No people yet." actionLabel="Add person" onAction={() => setEditing('new')} />
      ) : (
        <div className="space-y-3">
          {people.map((person) => (
            <Card key={person.id} className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-3">
                <Avatar name={person.name} />
                <div>
                  <p className="font-medium">{person.name}</p>
                  <p className="text-sm text-muted">{person.email || 'No email'} {person.phone ? `· ${person.phone}` : ''}</p>
                </div>
              </div>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => {
                    setForm(person)
                    setEditing(person)
                    setErrors({})
                  }}
                >
                  Edit
                </Button>
                <Button size="sm" variant="ghost" onClick={() => setDeleting(person)}>
                  Remove
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}

      <Modal
        open={Boolean(editing)}
        onClose={() => setEditing(null)}
        title={editing === 'new' ? 'Add person' : 'Edit person'}
        footer={
          <>
            <Button variant="ghost" onClick={() => setEditing(null)}>
              Cancel
            </Button>
            <Button onClick={save}>Save</Button>
          </>
        }
      >
        <PersonForm values={form} onChange={setForm} errors={errors} />
      </Modal>

      <ConfirmDialog
        open={Boolean(deleting)}
        onClose={() => setDeleting(null)}
        title="Remove person"
        description={`${deleting?.name} will be removed from your people list and any groups they belong to.`}
        confirmLabel="Remove"
        onConfirm={async () => {
          await peopleService.remove(deleting.id)
          push('Person removed.')
          setDeleting(null)
          list.refetch()
        }}
      />
    </div>
  )
}
