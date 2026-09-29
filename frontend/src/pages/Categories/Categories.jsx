import { useState } from 'react'
import { PageHeader } from '../../components/layout/PageHeader'
import { Button } from '../../components/ui/Button'
import { Card } from '../../components/ui/Card'
import { Modal } from '../../components/ui/Modal'
import { ConfirmDialog } from '../../components/ui/ConfirmDialog'
import { EmptyState, ErrorState } from '../../components/ui/EmptyState'
import { SkeletonCard } from '../../components/ui/Skeleton'
import { CategoryForm } from '../../components/forms/CategoryForm'
import { useAsync } from '../../hooks/useAsync'
import { useToast } from '../../context/ToastContext'
import { categoryService } from '../../services/categoryService'
import { generateId } from '../../utils/formatters'

export function CategoriesPage() {
  const { push } = useToast()
  const list = useAsync(() => categoryService.list(), [])
  const [editing, setEditing] = useState(null)
  const [form, setForm] = useState({ name: '', color: '#d4af37', subcategory: '' })
  const [errors, setErrors] = useState({})
  const [deleting, setDeleting] = useState(null)

  async function save() {
    if (!form.name.trim()) {
      setErrors({ name: 'Category name is required.' })
      return
    }
    const subcategories = form.subcategory
      ? [{ id: generateId('sub'), name: form.subcategory }]
      : editing === 'new'
        ? []
        : editing.subcategories
    try {
      if (editing === 'new') {
        await categoryService.create({ name: form.name, color: form.color, subcategories })
        push('Category added.')
      } else {
        const merged = form.subcategory
          ? [...editing.subcategories, { id: generateId('sub'), name: form.subcategory }]
          : editing.subcategories
        await categoryService.update(editing.id, { name: form.name, color: form.color, subcategories: merged })
        push('Category updated.')
      }
    } catch (error) {
      // Keep the modal open so the name can be corrected, e.g. on a duplicate.
      setErrors({ name: error.message })
      return
    }
    setEditing(null)
    list.refetch()
  }

  if (list.loading) return <SkeletonCard rows={8} />
  if (list.error) return <ErrorState message="Unable to load categories." onRetry={list.refetch} />

  return (
    <div>
      <PageHeader
        eyebrow="Money"
        title="Categories"
        description="Keep spending organized with categories and sub-categories."
        actions={
          <Button
            onClick={() => {
              setForm({ name: '', color: '#d4af37', subcategory: '' })
              setEditing('new')
              setErrors({})
            }}
          >
            Add category
          </Button>
        }
      />
      {list.data.length === 0 ? (
        <EmptyState title="No categories yet." />
      ) : (
        <div className="grid gap-3 md:grid-cols-2">
          {list.data.map((category) => (
            <Card key={category.id} className="flex items-start justify-between gap-3">
              <div>
                <div className="flex items-center gap-2">
                  <span className="size-2.5 rounded-full" style={{ background: category.color }} />
                  <h3 className="font-semibold">{category.name}</h3>
                </div>
                <p className="mt-2 text-sm text-muted">
                  {category.subcategories.length
                    ? category.subcategories.map((sub) => sub.name).join(', ')
                    : 'No sub-categories'}
                </p>
              </div>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => {
                    setForm({ name: category.name, color: category.color, subcategory: '' })
                    setEditing(category)
                  }}
                >
                  Edit
                </Button>
                <Button size="sm" variant="ghost" onClick={() => setDeleting(category)}>
                  Delete
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}

      <Modal
        open={Boolean(editing)}
        onClose={() => setEditing(null)}
        title={editing === 'new' ? 'Add category' : 'Edit category'}
        footer={
          <>
            <Button variant="ghost" onClick={() => setEditing(null)}>
              Cancel
            </Button>
            <Button onClick={save}>Save</Button>
          </>
        }
      >
        <CategoryForm values={form} onChange={setForm} errors={errors} />
      </Modal>

      <ConfirmDialog
        open={Boolean(deleting)}
        onClose={() => setDeleting(null)}
        title="Delete category"
        description={`Remove ${deleting?.name}?`}
        confirmLabel="Delete"
        onConfirm={async () => {
          try {
            await categoryService.remove(deleting.id)
            push('Category deleted.')
          } catch (error) {
            push(error.message, 'error')
          }
          setDeleting(null)
          list.refetch()
        }}
      />
    </div>
  )
}
