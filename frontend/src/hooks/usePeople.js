import { useCallback, useMemo, useState } from 'react'
import { peopleService } from '../services/peopleService'

export function usePeople(initial = []) {
  const [people, setPeople] = useState(initial)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const refresh = useCallback(async (query = '') => {
    setLoading(true)
    setError(null)
    try {
      const rows = await peopleService.list(query)
      setPeople(rows)
      return rows
    } catch (err) {
      setError(err)
      throw err
    } finally {
      setLoading(false)
    }
  }, [])

  const createPerson = useCallback(async (payload) => {
    const person = await peopleService.create(payload)
    setPeople((current) => [...current, person].sort((a, b) => a.name.localeCompare(b.name)))
    return person
  }, [])

  const updatePerson = useCallback(async (id, payload) => {
    const person = await peopleService.update(id, payload)
    setPeople((current) => current.map((row) => (row.id === id ? person : row)))
    return person
  }, [])

  const removePerson = useCallback(async (id) => {
    await peopleService.remove(id)
    setPeople((current) => current.filter((row) => row.id !== id))
  }, [])

  return {
    people,
    loading,
    error,
    refresh,
    createPerson,
    updatePerson,
    removePerson,
    byId: useMemo(() => Object.fromEntries(people.map((person) => [person.id, person])), [people]),
  }
}
