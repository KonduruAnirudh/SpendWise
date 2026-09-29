import { useCallback, useEffect, useRef, useState } from 'react'

export function useAsync(asyncFn, deps = []) {
  const [state, setState] = useState({ data: null, loading: true, error: null })
  const fnRef = useRef(asyncFn)
  fnRef.current = asyncFn

  const run = useCallback(async (silent = false) => {
    setState((current) => ({
      ...current,
      loading: silent ? false : current.data == null,
      error: null,
    }))
    try {
      const data = await fnRef.current()
      setState({ data, loading: false, error: null })
      return data
    } catch (error) {
      setState({ data: null, loading: false, error })
      throw error
    }
  }, [])

  useEffect(() => {
    let active = true
    setState((current) => ({ ...current, loading: current.data == null, error: null }))
    fnRef.current()
      .then((data) => {
        if (active) setState({ data, loading: false, error: null })
      })
      .catch((error) => {
        if (active) setState({ data: null, loading: false, error })
      })
    return () => {
      active = false
    }
    // oxlint-disable-next-line react-hooks/exhaustive-deps
  }, deps)

  const refetch = useCallback(() => run(true).catch(() => undefined), [run])

  return { ...state, refetch }
}
