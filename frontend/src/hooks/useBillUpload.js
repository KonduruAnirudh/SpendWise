import { useEffect, useState } from 'react'
import { billService, checkBillFile } from '../services/billService'

// idle → reading → done (a draft) | back to idle with an error.
export function useBillUpload(groupId) {
  const [status, setStatus] = useState('idle')
  const [draft, setDraft] = useState(null)
  const [error, setError] = useState('')
  const [fileName, setFileName] = useState('')
  const [elapsed, setElapsed] = useState(0)

  // Reading a photo with a local vision model takes a while; show the seconds so it doesn't look stuck.
  useEffect(() => {
    if (status !== 'reading') return undefined
    const started = Date.now()
    const timer = window.setInterval(() => setElapsed(Math.floor((Date.now() - started) / 1000)), 1000)
    return () => {
      window.clearInterval(timer)
      setElapsed(0)
    }
  }, [status])

  async function upload(file) {
    const problem = checkBillFile(file)
    if (problem) {
      setError(problem)
      return null
    }
    setError('')
    setFileName(file.name)
    setStatus('reading')
    try {
      const result = await billService.parse(groupId, file)
      setDraft(result)
      setStatus('done')
      return result
    } catch (err) {
      // The server's messages (413, 415, 400 scanned PDF, 502 unreadable, 503 down) are user-facing.
      setError(err.message || "We couldn't read this bill.")
      setStatus('idle')
      return null
    }
  }

  function reset() {
    setStatus('idle')
    setDraft(null)
    setError('')
    setFileName('')
  }

  return { status, draft, error, fileName, elapsed, upload, reset }
}
