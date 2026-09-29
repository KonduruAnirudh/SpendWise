import { useState } from 'react'
import { Button } from '../../../components/ui/Button'
import { Input } from '../../../components/ui/Input'
import { Modal } from '../../../components/ui/Modal'
import { PersonForm } from './PersonForm'
import { PeoplePicker, SelectedMembers } from './PeoplePicker'
import { peopleService } from '../../../services/peopleService'
import { groupService } from '../../../services/groupService'
import { validatePerson } from '../../../utils/validators'

const emptyPerson = { name: '', email: '', phone: '' }

export function CreateGroupModal({ open, onClose, onCreated }) {
  const [name, setName] = useState('')
  const [members, setMembers] = useState([])
  const [creatingPerson, setCreatingPerson] = useState(false)
  const [person, setPerson] = useState(emptyPerson)
  const [errors, setErrors] = useState({})
  const [saving, setSaving] = useState(false)

  function reset() {
    setName('')
    setMembers([])
    setCreatingPerson(false)
    setPerson(emptyPerson)
    setErrors({})
  }

  async function savePerson() {
    const nextErrors = validatePerson(person)
    setErrors(nextErrors)
    if (Object.keys(nextErrors).length) return
    const created = await peopleService.create(person)
    setMembers((current) => [...current, created])
    setPerson(emptyPerson)
    setCreatingPerson(false)
  }

  async function create() {
    if (!name.trim()) {
      setErrors({ name: 'Group name is required.' })
      return
    }
    setSaving(true)
    try {
      const group = await groupService.create({
        name: name.trim(),
        memberIds: members.map((member) => member.id),
      })
      reset()
      onCreated(group)
      onClose()
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal
      open={open}
      onClose={() => {
        reset()
        onClose()
      }}
      title="Create group"
      className="sm:max-w-lg"
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={create} loading={saving}>
            Create group
          </Button>
        </>
      }
    >
      <div className="space-y-5">
        <Input label="Group name" value={name} onChange={(event) => setName(event.target.value)} error={errors.name} />
        <div>
          <p className="mb-2 text-xs font-medium uppercase tracking-[0.14em] text-muted">Add members</p>
          <SelectedMembers members={members} onRemove={(id) => setMembers((current) => current.filter((item) => item.id !== id))} />
        </div>
        {creatingPerson ? (
          <div className="rounded-xl border border-border p-3">
            <PersonForm values={person} onChange={setPerson} errors={errors} />
            <div className="mt-3 flex justify-end gap-2">
              <Button size="sm" variant="ghost" onClick={() => setCreatingPerson(false)}>
                Cancel
              </Button>
              <Button size="sm" onClick={savePerson}>
                Add person
              </Button>
            </div>
          </div>
        ) : (
          <PeoplePicker
            selectedIds={members.map((member) => member.id)}
            onToggle={(personRow) =>
              setMembers((current) =>
                current.some((item) => item.id === personRow.id)
                  ? current.filter((item) => item.id !== personRow.id)
                  : [...current, personRow],
              )
            }
            onCreate={() => {
              setErrors({})
              setCreatingPerson(true)
            }}
          />
        )}
      </div>
    </Modal>
  )
}
