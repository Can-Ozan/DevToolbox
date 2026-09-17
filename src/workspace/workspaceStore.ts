import { useEffect, useSyncExternalStore } from 'react'
import { workspaceDB } from './db'
import type { WorkspaceFileInfo } from './workspaceTypes'
import { fileError } from './workspaceUtils'

interface WorkspaceState {
  files: WorkspaceFileInfo[]
  loading: boolean
  error: string
  warning: string
  estimate?: StorageEstimate
}
let state: WorkspaceState = { files: [], loading: true, error: '', warning: '' }
const listeners = new Set<() => void>()
let revision = 0
function publish(patch: Partial<WorkspaceState>) {
  state = { ...state, ...patch }
  listeners.forEach((listener) => listener())
}

export async function refreshWorkspace() {
  const current = ++revision
  publish({ loading: true })
  try {
    const { files, invalid } = await workspaceDB.list()
    const estimate = await navigator.storage?.estimate?.().catch(() => undefined)
    if (current === revision)
      publish({
        files,
        estimate,
        loading: false,
        error: '',
        warning: invalid
          ? `${invalid} damaged metadata record(s) could not be listed. They have not been deleted. Re-import originals, or clear the Workspace after downloading remaining files.`
          : '',
      })
  } catch (error) {
    if (current === revision) publish({ loading: false, error: fileError(error) })
  }
}

export function useWorkspace() {
  const snapshot = useSyncExternalStore(
    (listener) => {
      listeners.add(listener)
      return () => {
        listeners.delete(listener)
      }
    },
    () => state,
  )
  useEffect(() => {
    void refreshWorkspace()
    const refresh = () => {
      void refreshWorkspace()
    }
    window.addEventListener('focus', refresh)
    return () => window.removeEventListener('focus', refresh)
  }, [])
  return snapshot
}

export const workspace = {
  get: workspaceDB.get,
  async add(...args: Parameters<typeof workspaceDB.add>) {
    const result = await workspaceDB.add(...args)
    await refreshWorkspace()
    return result
  },
  async delete(id: string) {
    await workspaceDB.delete(id)
    await refreshWorkspace()
  },
  async clear() {
    await workspaceDB.clear()
    await refreshWorkspace()
  },
  async pin(id: string, pinned: boolean) {
    await workspaceDB.pin(id, pinned)
    await refreshWorkspace()
  },
}
