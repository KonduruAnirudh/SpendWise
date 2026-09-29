import { useState } from 'react'
import { Button } from '../../../components/ui/Button'
import { Input } from '../../../components/ui/Input'
import { Modal } from '../../../components/ui/Modal'
import { useToast } from '../../../context/ToastContext'
import { MemberForm } from './MemberForm'
import { emptyMember, validateMember } from '../../../utils/validators'
import { SelectedMembers } from './PeoplePicker'
import { groupService } from '../../../services/groupService'

export function CreateGroupModal({ open, onClose, onCreated }) {
  const { push } = useToast()
  const [name, setName] = useState('')
  // Staged locally as {id, name, email}; saved as group members after the group exists.
  const [members, setMembers] = useState([])
  const [member, setMember] = useState(emptyMember)
  const [errors, setErrors] = useState({})
  const [saving, setSaving] = useState(false)

  function reset() {
    setName('')
    setMembers([])
    setMember(emptyMember)
    setErrors({})
  }

  function stageMember() {
    const nextErrors = validateMember(member)
    setErrors(nextErrors)
    if (Object.keys(nextErrors).length) return
    const label = member.name.trim() || member.email.trim()
    setMembers((current) => [
      ...current,
      { id: `staged-${current.length}-${label}`, name: label, displayName: member.name.trim(), email: member.email.trim() },
    ])
    setMember(emptyMember)
  }

  async function create() {
    if (!name.trim()) {
      setErrors({ groupName: 'Group name is required.' })
      return
    }
    setSaving(true)
    try {
      const group = await groupService.create({
        name: name.trim(),
        members: members.map((item) => ({ name: item.displayName, email: item.email })),
      })
      ;(group.failedMembers || []).forEach((failed) => push(`${failed.name} wasn't added: ${failed.message}`, 'error'))
      reset()
      onCreated(group)
      onClose()
    } catch (error) {
      push(error.message, 'error')
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
        <Input label="Group name" value={name} onChange={(event) => setName(event.target.value)} error={errors.groupName} />
        <div>
          <p className="mb-2 text-xs font-medium uppercase tracking-[0.14em] text-muted">Members</p>
          <p className="mb-2 text-xs text-subtle">You're added automatically as the group owner.</p>
          <SelectedMembers members={members} onRemove={(id) => setMembers((current) => current.filter((item) => item.id !== id))} />
        </div>
        <div className="rounded-xl border border-border p-3">
          <MemberForm values={member} onChange={setMember} errors={errors} />
          <div className="mt-3 flex justify-end">
            <Button size="sm" variant="outline" onClick={stageMember}>
              Add to list
            </Button>
          </div>
        </div>
      </div>
    </Modal>
  )
}
