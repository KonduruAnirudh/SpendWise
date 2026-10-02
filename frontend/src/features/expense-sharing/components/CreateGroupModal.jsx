import { useState } from 'react'
import { Button } from '../../../components/ui/Button'
import { Input } from '../../../components/ui/Input'
import { CurrencySelect } from '../../../components/forms/CurrencySelect'
import { Modal } from '../../../components/ui/Modal'
import { useAuth } from '../../../context/AuthContext'
import { useToast } from '../../../context/ToastContext'
import { MemberForm } from './MemberForm'
import { emptyMember, normalizeUsername, validateMember } from '../../../utils/validators'
import { SelectedMembers } from './SelectedMembers'
import { groupService } from '../../../services/groupService'
import { userService } from '../../../services/userService'

export function CreateGroupModal({ open, onClose, onCreated }) {
  const { user } = useAuth()
  const { push } = useToast()
  const [name, setName] = useState('')
  const [currency, setCurrency] = useState('')
  // Staged locally; saved as group members after the group exists. Usernames are checked
  // when staged, so the group isn't created with people who can't be added.
  const [members, setMembers] = useState([])
  const [member, setMember] = useState(emptyMember)
  const [errors, setErrors] = useState({})
  const [checking, setChecking] = useState(false)
  const [saving, setSaving] = useState(false)

  function reset() {
    setName('')
    setCurrency('')
    setMembers([])
    setMember(emptyMember)
    setErrors({})
  }

  async function stageMember() {
    const nextErrors = validateMember(member)
    setErrors(nextErrors)
    if (Object.keys(nextErrors).length) return

    if (member.kind === 'guest') {
      const guestName = member.name.trim()
      if (members.some((item) => item.kind === 'guest' && item.name.toLowerCase() === guestName.toLowerCase())) {
        setErrors({ name: `${guestName} is already on the list.` })
        return
      }
      setMembers((current) => [...current, { id: `guest-${guestName}`, kind: 'guest', name: guestName }])
      setMember({ ...emptyMember, kind: 'guest' })
      return
    }

    const username = normalizeUsername(member.username)
    if (username === user?.username) {
      setErrors({ username: "That's you. You're added automatically as the owner." })
      return
    }
    if (members.some((item) => item.username === username)) {
      setErrors({ username: `@${username} is already on the list.` })
      return
    }
    setChecking(true)
    try {
      const found = await userService.lookup(username)
      setMembers((current) => [
        ...current,
        { id: `user-${found.username}`, kind: 'user', username: found.username, name: found.name },
      ])
      setMember(emptyMember)
    } catch (error) {
      setErrors({ username: error.status === 404 ? `No SpendWise user is called @${username}.` : error.message })
    } finally {
      setChecking(false)
    }
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
        currency: currency || user?.currency,
        members,
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
        <div className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_12rem]">
          <Input label="Group name" value={name} onChange={(event) => setName(event.target.value)} error={errors.groupName} />
          <CurrencySelect
            name="groupCurrency"
            label="Currency"
            value={currency || user?.currency || 'INR'}
            onChange={(event) => setCurrency(event.target.value)}
          />
        </div>
        <div>
          <p className="mb-2 text-xs font-medium uppercase tracking-[0.14em] text-muted">Members</p>
          <p className="mb-2 text-xs text-subtle">You're added automatically as the group owner.</p>
          <SelectedMembers members={members} onRemove={(id) => setMembers((current) => current.filter((item) => item.id !== id))} />
        </div>
        <div className="rounded-xl border border-border p-3">
          <MemberForm values={member} onChange={setMember} errors={errors} />
          <div className="mt-3 flex justify-end">
            <Button size="sm" variant="outline" onClick={stageMember} loading={checking}>
              Add to list
            </Button>
          </div>
        </div>
      </div>
    </Modal>
  )
}
