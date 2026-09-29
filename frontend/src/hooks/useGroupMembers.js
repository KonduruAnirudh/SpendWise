import { useCallback, useState } from 'react'
import { groupService } from '../services/groupService'

export function useGroupMembers(initial = []) {
  const [members, setMembers] = useState(initial)

  const setFromGroup = useCallback((groupMembers = []) => {
    setMembers(groupMembers)
  }, [])

  const addMember = useCallback((person) => {
    setMembers((current) => (current.some((item) => item.id === person.id) ? current : [...current, person]))
  }, [])

  const removeMember = useCallback((personId) => {
    setMembers((current) => current.filter((item) => item.id !== personId))
  }, [])

  const persistAdd = useCallback(async (groupId, personId) => {
    const group = await groupService.addMember(groupId, personId)
    setMembers(group.members || [])
    return group
  }, [])

  const persistRemove = useCallback(async (groupId, personId) => {
    const group = await groupService.removeMember(groupId, personId)
    setMembers(group.members || [])
    return group
  }, [])

  return { members, setFromGroup, addMember, removeMember, persistAdd, persistRemove, setMembers }
}
