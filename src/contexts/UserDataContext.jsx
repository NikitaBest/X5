import { createContext, useContext, useState, useCallback } from 'react'

const UserDataContext = createContext(null)

export function UserDataProvider({ children }) {
  const [userData, setUserData] = useState({
    gender: null,
    age: null,
    weight: null,
    height: null,
    smokingStatus: null,
    goals: [],
    recentActivity: null,
  })

  const updateUserData = useCallback((data) => {
    setUserData((prev) => ({
      ...prev,
      ...data,
    }))
  }, [])

  const clearUserData = useCallback(() => {
    setUserData({
      gender: null,
      age: null,
      weight: null,
      height: null,
      smokingStatus: null,
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

