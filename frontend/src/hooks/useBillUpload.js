import { useState } from 'react'
import { billService, normalizeBill } from '../services/billService'

const STEPS = [
  { key: 'uploading', label: 'Uploading...' },
  { key: 'reading', label: 'Reading bill...' },
  { key: 'extracting', label: 'Extracting items...' },
  { key: 'review', label: 'Review extracted items' },
]

export function useBillUpload() {
  const [status, setStatus] = useState('idle')
  const [stepIndex, setStepIndex] = useState(-1)
  const [bill, setBill] = useState(null)
  const [error, setError] = useState('')

  async function upload(file) {
    const allowed = /\.(jpe?g|png|pdf)$/i.test(file?.name || '')
    if (!allowed) {
      setError('Upload a JPG, PNG, or PDF bill.')
      return null
    }
    setError('')
    setStatus('uploading')
    setStepIndex(0)
    try {
      const uploaded = await billService.uploadBill(file)
      setStatus('reading')
      setStepIndex(1)
      await wait(500)
      setStatus('extracting')
      setStepIndex(2)
      const extracted = await billService.extractBillItems(uploaded.id)
      const reviewed = normalizeBill(extracted)
      setBill(reviewed)
      setStatus('review')
      setStepIndex(3)
      return reviewed
    } catch (err) {
      setError(err.message || 'Unable to read this bill.')
      setStatus('idle')
      setStepIndex(-1)
      return null
    }
  }

  function updateBill(partial) {
    setBill((current) => normalizeBill({ ...current, ...partial }))
  }

  function confirmReview() {
    setStatus('split')
    return bill
  }

  function reset() {
    setStatus('idle')
    setStepIndex(-1)
    setBill(null)
    setError('')
  }

  return { status, stepIndex, steps: STEPS, bill, error, upload, updateBill, confirmReview, reset, setBill }
}

function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}
