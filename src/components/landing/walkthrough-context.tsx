'use client'

import { createContext, useContext, useState, useCallback } from 'react'

interface WalkthroughContextValue {
  isOpen: boolean
  open: () => void
  close: () => void
}

const WalkthroughContext = createContext<WalkthroughContextValue | null>(null)

export function WalkthroughProvider({ children }: { children: React.ReactNode }) {
  const [isOpen, setIsOpen] = useState(false)
  const open = useCallback(() => setIsOpen(true), [])
  const close = useCallback(() => setIsOpen(false), [])

  return (
    <WalkthroughContext.Provider value={{ isOpen, open, close }}>
      {children}
    </WalkthroughContext.Provider>
  )
}

export function useWalkthrough() {
  const ctx = useContext(WalkthroughContext)
  if (!ctx) throw new Error('useWalkthrough must be used within WalkthroughProvider')
  return ctx
}
