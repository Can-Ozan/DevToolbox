import { useSyncExternalStore } from 'react'

export type Theme = 'light' | 'dark' | 'system'
export interface Preferences {
  version: 1
  theme: Theme
  favorites: string[]
  recent: string[]
  collapsed: boolean
  toolUsage: Record<string, number>
  workspaceView: 'grid' | 'list'
  jsonIndent: '2' | '4'
  hexCase: 'upper' | 'lower'
  jpegQuality: number
  jpegBackground: string
}
export const STORAGE_KEY = 'devtoolbox.preferences.v1'
const defaults: Preferences = {
  version: 1,
  theme: 'system',
  favorites: [],
  recent: [],
  collapsed: false,
  toolUsage: {},
  workspaceView: 'grid',
  jsonIndent: '2',
  hexCase: 'upper',
  jpegQuality: 80,
  jpegBackground: '#ffffff',
}
export function parseToolUsage(value: unknown): Record<string, number> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {}
  return Object.fromEntries(
    Object.entries(value)
      .filter(
        ([id, count]) =>
          /^[a-z][a-z0-9-]{0,63}$/.test(id) &&
          id !== 'constructor' &&
          typeof count === 'number' &&
          Number.isSafeInteger(count) &&
          count > 0,
      )
      .slice(0, 100),
  )
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
      toolUsage: parseToolUsage(p.toolUsage),
      workspaceView: p.workspaceView === 'list' ? 'list' : 'grid',
      jsonIndent: p.jsonIndent === '4' ? '4' : '2',
      hexCase: p.hexCase === 'lower' ? 'lower' : 'upper',
      jpegQuality:
        typeof p.jpegQuality === 'number' &&
        Number.isInteger(p.jpegQuality) &&
        p.jpegQuality >= 10 &&
        p.jpegQuality <= 100
          ? p.jpegQuality
          : 80,
      jpegBackground:
        typeof p.jpegBackground === 'string' && /^#[\da-f]{6}$/i.test(p.jpegBackground)
          ? p.jpegBackground
          : '#ffffff',
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
    if (!/^[a-z][a-z0-9-]{0,63}$/.test(id) || id === 'constructor') return
    update({
      recent: [id, ...state.recent.filter((item) => item !== id)].slice(0, 10),
      toolUsage: {
        ...state.toolUsage,
        [id]: Math.min((state.toolUsage[id] ?? 0) + 1, Number.MAX_SAFE_INTEGER),
      },
    })
  },
  setOptions: (
    patch: Partial<
      Pick<
        Preferences,
        'workspaceView' | 'jsonIndent' | 'hexCase' | 'jpegQuality' | 'jpegBackground'
      >
    >,
  ) => update(patch),
  clearUsage: () => update({ toolUsage: {} }),
  clearRecent: () => update({ recent: [] }),
  clearFavorites: () => update({ favorites: [] }),
  reset: () => update({ ...defaults }),
}
