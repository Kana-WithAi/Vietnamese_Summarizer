import { createContext, useContext, useState } from 'react'

const HistoryContext = createContext(null)

export function HistoryProvider({ children }) {
  const [isHistoryOpen, setIsHistoryOpen] = useState(false)

  const openHistory = () => setIsHistoryOpen(true)
  const closeHistory = () => setIsHistoryOpen(false)

  return (
    <HistoryContext.Provider value={{ isHistoryOpen, openHistory, closeHistory }}>
      {children}
    </HistoryContext.Provider>
  )
}

export function useHistory() {
  const context = useContext(HistoryContext)
  if (!context) {
    throw new Error('useHistory must be used within HistoryProvider')
  }
  return context
}
