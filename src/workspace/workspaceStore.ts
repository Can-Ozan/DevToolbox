import { useEffect, useSyncExternalStore } from 'react'
import { workspaceDB } from './db'
import type { WorkspaceFileInfo, WorkspaceCollection } from './workspaceTypes'
import { fileError } from './workspaceUtils'

interface WorkspaceState {
  files: WorkspaceFileInfo[]
  collections: WorkspaceCollection[]
  loading: boolean
  error: string
  warning: string
  estimate?: StorageEstimate
}
let state: WorkspaceState = { files: [], collections: [], loading: true, error: '', warning: '' }
const listeners = new Set<() => void>()
let revision = 0
let watchers = 0
const refreshOnFocus = () => {
  void refreshWorkspace()
}
function publish(patch: Partial<WorkspaceState>) {
  state = { ...state, ...patch }
  listeners.forEach((listener) => listener())
}

export async function refreshWorkspace() {
  const current = ++revision
  publish({ loading: true })
  try {
    const { files, collections, invalid } = await workspaceDB.list()
    const estimate = await navigator.storage?.estimate?.().catch(() => undefined)
    if (current === revision)
      publish({
        files,
        collections,
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
    if (watchers++ === 0) {
      void refreshWorkspace()
      window.addEventListener('focus', refreshOnFocus)
    }
    return () => {
      if (--watchers === 0) window.removeEventListener('focus', refreshOnFocus)
    }
  }, [])
  return snapshot
}

export const workspace = {
  get: workspaceDB.get,
  async saveCollection(name: string, id?: string) {
    const result = await workspaceDB.saveCollection(name, id)
    await refreshWorkspace()
    return result
  },
  async deleteCollection(id: string) {
    await workspaceDB.deleteCollection(id)
    await refreshWorkspace()
  },
  async moveFiles(ids: string[], collectionId?: string) {
    await workspaceDB.moveFiles(ids, collectionId)
    await refreshWorkspace()
  },
  async add(...args: Parameters<typeof workspaceDB.add>) {
    const result = await workspaceDB.add(...args)
    await refreshWorkspace()
    return result
  },
  async delete(id: string) {
    await workspaceDB.delete(id)
    await refreshWorkspace()
  },
  async deleteMany(ids: string[]) {
    await workspaceDB.deleteMany(ids)
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
