'use client'

import { useCallback, useSyncExternalStore } from 'react'
import { managerStrings, type ManagerLang } from './manager'

// Same key the associate field screens use, so one choice follows the person
// across both surfaces on this device.
const LANG_KEY = 'us-field-lang'

let current: ManagerLang | null = null
let loading = false
const listeners = new Set<() => void>()

function readStored(): ManagerLang | null {
  try {
    const v = window.localStorage.getItem(LANG_KEY)
    return v === 'es' || v === 'en' ? v : null
  } catch {
    return null
  }
}

function writeStored(lang: ManagerLang) {
  try {
    window.localStorage.setItem(LANG_KEY, lang)
  } catch {
    // ignore (private mode)
  }
}

function publish(lang: ManagerLang) {
  if (current === lang) return
  current = lang
  listeners.forEach((fn) => fn())
}

/** Seed from a /api/users/me payload fetched elsewhere, saving a request. */
export function primeManagerLang(preferredLanguage: unknown) {
  if (current) return
  publish(readStored() ?? (preferredLanguage === 'es' ? 'es' : 'en'))
}

function ensureLoaded() {
  if (current || loading) return
  const stored = readStored()
  if (stored) {
    publish(stored)
    return
  }
  loading = true
  fetch('/api/users/me', { credentials: 'include' })
    .then((r) => (r.ok ? r.json() : null))
    .then((data) => {
      if (!current) publish(data?.preferredLanguage === 'es' ? 'es' : 'en')
    })
    .catch(() => {
      if (!current) publish('en')
    })
    .finally(() => {
      loading = false
    })
}

function subscribe(cb: () => void) {
  listeners.add(cb)
  ensureLoaded()
  return () => {
    listeners.delete(cb)
  }
}

const getSnapshot = (): ManagerLang => current ?? 'en'
const getServerSnapshot = (): ManagerLang => 'en'

/** Strings for the current language, for callbacks that outlive a render. */
export function currentManagerStrings() {
  return managerStrings(getSnapshot())
}

/**
 * Manager UI language. Defaults from the user's profile (preferredLanguage),
 * with the device's localStorage choice taking precedence. setLang saves both.
 */
export function useManagerLang() {
  const lang = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot)

  const setLang = useCallback((next: ManagerLang) => {
    publish(next)
    writeStored(next)
    fetch('/api/users/me', {
      method: 'PATCH',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ preferredLanguage: next }),
    }).catch(() => {})
  }, [])

  return { lang, t: managerStrings(lang), setLang }
}
