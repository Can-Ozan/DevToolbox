import { useSyncExternalStore } from 'react'

export type Theme = 'light' | 'dark' | 'system'
export interface Preferences {
  version: 1
  theme: Theme
  favorites: string[]
  recent: string[]
  collapsed: boolean
}
export const STORAGE_KEY = 'devtoolbox.preferences.v1'
const defaults: Preferences = {
  version: 1,
  theme: 'system',
  favorites: [],
  recent: [],
  collapsed: false,
}
const uniqueStrings = (value: unknown): string[] =>
  Array.isArray(value) ? [...new Set(value.filter((v): v is string => typeof v === 'string'))] : []

export function parsePreferences(raw: string | null): Preferences {
  try {
    const value: unknown = JSON.parse(raw ?? 'null')
    if (!value || typeof value !== 'object' || !('version' in value) || value.version !== 1)
      return { ...defaults }
    const p = value as Record<string, unknown>
    return {
      version: 1,
      theme: p.theme === 'dark' || p.theme === 'light' ? p.theme : 'system',
      favorites: uniqueStrings(p.favorites),
      recent: uniqueStrings(p.recent).slice(0, 10),
      collapsed: p.collapsed === true,
    }
  } catch {
    return { ...defaults }
  }
}
function read(): Preferences {
  if (typeof window === 'undefined') return { ...defaults }
  try {
    return parsePreferences(localStorage.getItem(STORAGE_KEY))
  } catch {
    return { ...defaults }
  }
}
let state = read()
let storageAvailable = true
const listeners = new Set<() => void>()
function emit() {
  listeners.forEach((listener) => listener())
}
function update(patch: Partial<Preferences>) {
  state = { ...state, ...patch }
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
    storageAvailable = true
  } catch {
    storageAvailable = false
  }
  emit()
}
if (typeof window !== 'undefined')
  window.addEventListener('storage', (event) => {
    if (event.key === STORAGE_KEY || event.key === null) {
      state = read()
      emit()
    }
  })
export function usePreferences() {
  return useSyncExternalStore(
    (callback) => {
      listeners.add(callback)
      return () => {
        listeners.delete(callback)
      }
    },
    () => state,
  )
}
export function useStorageAvailable() {
  return useSyncExternalStore(
    (callback) => {
      listeners.add(callback)
      return () => {
        listeners.delete(callback)
      }
    },
    () => storageAvailable,
  )
}
export const preferences = {
  setTheme: (theme: Theme) => update({ theme }),
  toggleSidebar: () => update({ collapsed: !state.collapsed }),
  toggleFavorite: (id: string) =>
    update({
      favorites: state.favorites.includes(id)
        ? state.favorites.filter((item) => item !== id)
        : [...state.favorites, id],
    }),
  visit: (id: string) => {
    if (state.recent[0] !== id)
      update({ recent: [id, ...state.recent.filter((item) => item !== id)].slice(0, 10) })
  },
  clearRecent: () => update({ recent: [] }),
  clearFavorites: () => update({ favorites: [] }),
  reset: () => update({ ...defaults }),
}
