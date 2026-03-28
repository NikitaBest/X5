import { createContext, useContext, useState, useCallback } from 'react'
import { normalizeGoalsToCodes } from '../utils/goals.js'

const UserDataContext = createContext(null)

const GOALS_STORAGE_KEY = 'x5_user_goals'

function readStoredGoals() {
  try {
    const s = window.localStorage.getItem(GOALS_STORAGE_KEY)
    if (!s) return []
    const parsed = JSON.parse(s)
    return normalizeGoalsToCodes(Array.isArray(parsed) ? parsed : [])
  } catch {
    return []
  }
}

function writeStoredGoals(goals) {
  try {
    const codes = normalizeGoalsToCodes(Array.isArray(goals) ? goals : [])
    if (codes.length === 0) window.localStorage.removeItem(GOALS_STORAGE_KEY)
    else window.localStorage.setItem(GOALS_STORAGE_KEY, JSON.stringify(codes))
  } catch {
    // ignore
  }
}

export function UserDataProvider({ children }) {
  const [userData, setUserData] = useState(() => ({
    gender: null,
    age: null,
    weight: null,
    height: null,
    smokingStatus: null,
    birthDate: null,
    goals: readStoredGoals(),
    recentActivity: null,
  }))

  const updateUserData = useCallback((data) => {
    setUserData((prev) => {
      const next = { ...prev, ...data }
      if (Object.prototype.hasOwnProperty.call(data, 'goals')) {
        next.goals = normalizeGoalsToCodes(data.goals)
        writeStoredGoals(next.goals)
      }
      return next
    })
  }, [])

  const clearUserData = useCallback(() => {
    try {
      window.localStorage.removeItem(GOALS_STORAGE_KEY)
    } catch {
      // ignore
    }
    setUserData({
      gender: null,
      age: null,
      weight: null,
      height: null,
      smokingStatus: null,
      birthDate: null,
      goals: [],
      recentActivity: null,
    })
  }, [])

  return (
    <UserDataContext.Provider value={{ userData, updateUserData, clearUserData }}>
      {children}
    </UserDataContext.Provider>
  )
}

export function useUserData() {
  const context = useContext(UserDataContext)
  if (!context) {
    throw new Error('useUserData must be used within UserDataProvider')
  }
  return context
}

