import { useState } from 'react'
import { Button } from '../../../components/ui/Button'
import { Input } from '../../../components/ui/Input'
import { Modal } from '../../../components/ui/Modal'
import { useToast } from '../../../context/ToastContext'
import { PROFILE_API, profileService } from '../../../services/profileService'

const CONFIRM_WORD = 'DELETE'

export function DeleteAccountModal({ open, onClose, onDeleted }) {
  const { push } = useToast()
  const [typed, setTyped] = useState('')
  const [deleting, setDeleting] = useState(false)
  const [error, setError] = useState('')

  function close() {
    setTyped('')
    setError('')
    onClose()
  }

  async function confirm() {
    setDeleting(true)
    setError('')
    try {
      const result = await profileService.deleteAccount()
      if (result.deleted) {
        onDeleted()
        return
      }
      push("Account deletion isn't connected yet. Nothing was deleted.")
      close()
    } catch (err) {
      setError(err.message || "Your account couldn't be deleted. Try again.")
    } finally {
      setDeleting(false)
    }
  }

  return (
    <Modal
      open={open}
      onClose={deleting ? () => {} : close}
      title="Delete your account?"
      footer={
        <>
          <Button variant="ghost" onClick={close} disabled={deleting}>
            Cancel
          </Button>
          <Button variant="danger" onClick={confirm} loading={deleting} disabled={typed !== CONFIRM_WORD}>
            Delete account
          </Button>
        </>
      }
    >
      <div className="space-y-4 text-sm">
        <p className="text-muted">
          This permanently deletes your SpendWise account and everything in it. It can't be undone.
        </p>
        <ul className="list-disc space-y-1 pl-5 text-muted">
          <li>Your accounts, transactions and custom categories</li>
          <li>Groups you own, with their expenses and settlements</li>
          <li>Your AI assistant conversations</li>
        </ul>
        <p className="text-muted">In groups owned by someone else, your past expenses stay so their balances still add up.</p>
        {!PROFILE_API.deleteAccount && (
          <p className="rounded-xl border border-border bg-hover/60 px-3 py-2 text-muted">
            Preview: account deletion isn't connected to the server yet, so nothing will be deleted.
          </p>
        )}
        <Input
          name="confirmDelete"
          label={`Type ${CONFIRM_WORD} to confirm`}
          value={typed}
          onChange={(event) => setTyped(event.target.value)}
          autoComplete="off"
          spellCheck={false}
        />
        {error && (
          <p className="rounded-xl border border-danger/30 bg-danger/5 px-3 py-2 text-danger" role="alert">
            {error}
          </p>
        )}
      </div>
    </Modal>
  )
}
