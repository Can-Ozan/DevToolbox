import type { FileInput, WorkspaceFile, WorkspaceFileInfo } from './workspaceTypes'
import { FILE_LIMITS, safeFilename, uniqueFilename, validateBatch } from './workspaceUtils'

export const WORKSPACE_DB = 'devtoolbox.workspace'
const META = 'files'
const BLOBS = 'blobs'

function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') {
      reject(new Error('IndexedDB storage is unavailable. Device input and downloads still work.'))
      return
    }
    const request = indexedDB.open(WORKSPACE_DB, 1)
    let expired = false
    const timeout = setTimeout(() => {
      expired = true
      reject(new Error('Workspace storage did not respond. Close other DevToolbox tabs and retry.'))
    }, 5000)
    request.onupgradeneeded = () => {
      const metadata = request.result.createObjectStore(META, { keyPath: 'id' })
      metadata.createIndex('name', 'name', { unique: true })
      request.result.createObjectStore(BLOBS)
    }
    request.onsuccess = () => {
      clearTimeout(timeout)
      if (expired) request.result.close()
      else {
        request.result.onversionchange = () => request.result.close()
        resolve(request.result)
      }
    }
    request.onerror = () => {
      clearTimeout(timeout)
      reject(request.error)
    }
    request.onblocked = () => {
      expired = true
      clearTimeout(timeout)
      reject(new Error('Workspace storage is blocked by another tab. Close it and retry.'))
    }
  })
}

// Resolve only after commit; an individual successful request is not a saved file.
async function transaction<T>(
  mode: IDBTransactionMode,
  work: (tx: IDBTransaction, result: (value: T) => void, fail: (error: Error) => void) => void,
): Promise<T> {
  const database = await openDatabase()
  try {
    return await new Promise<T>((resolve, reject) => {
      const tx = database.transaction([META, BLOBS], mode)
      let value: T
      let failure: Error | undefined
      tx.oncomplete = () => resolve(value)
      tx.onabort = () =>
        reject(
          failure ?? tx.error ?? new Error('Workspace operation was interrupted. Please retry.'),
        )
      tx.onerror = () => {
        /* The abort handler reports transaction failures. */
      }
      try {
        work(
          tx,
          (result) => {
            value = result
          },
          (error) => {
            failure = error
            tx.abort()
          },
        )
      } catch (error) {
        failure = error instanceof Error ? error : new Error('Workspace operation failed.')
        tx.abort()
      }
    })
  } finally {
    database.close()
  }
}

function validMetadata(value: unknown): value is WorkspaceFileInfo {
  if (!value || typeof value !== 'object') return false
  const entry = value as Partial<WorkspaceFileInfo>
  return (
    typeof entry.id === 'string' &&
    !!entry.id &&
    typeof entry.name === 'string' &&
    !!entry.name &&
    typeof entry.mimeType === 'string' &&
    typeof entry.size === 'number' &&
    Number.isSafeInteger(entry.size) &&
    entry.size > 0 &&
    typeof entry.createdAt === 'number' &&
    Number.isFinite(entry.createdAt) &&
    entry.createdAt > 0 &&
    entry.createdAt < 8.64e15 &&
    typeof entry.pinned === 'boolean' &&
    (entry.sourceTool === undefined || typeof entry.sourceTool === 'string') &&
    (entry.originalName === undefined || typeof entry.originalName === 'string')
  )
}

export const workspaceDB = {
  list: () =>
    transaction<{ files: WorkspaceFileInfo[]; invalid: number }>('readonly', (tx, done) => {
      const request = tx.objectStore(META).getAll()
      request.onsuccess = () => {
        const all: unknown[] = request.result
        const files = all.filter(validMetadata)
        done({
          files: files.sort(
            (a, b) => Number(b.pinned) - Number(a.pinned) || b.createdAt - a.createdAt,
          ),
          invalid: all.length - files.length,
        })
      }
    }),
  get: (id: string) =>
    transaction<WorkspaceFile>('readonly', (tx, done, fail) => {
      const metadata = tx.objectStore(META).get(id)
      const content = tx.objectStore(BLOBS).get(id)
      content.onsuccess = () => {
        const info: unknown = metadata.result
        const blob: unknown = content.result
        if (
          !validMetadata(info) ||
          !(blob instanceof Blob) ||
          blob.size !== info.size ||
          blob.type !== info.mimeType
        ) {
          fail(
            new Error(
              'This file is missing or damaged in browser storage. Re-import the original file.',
            ),
          )
        } else done({ ...info, blob })
      }
    }),
  async add(inputs: FileInput[], options: { bulk?: boolean; restore?: boolean } = {}) {
    if (options.bulk) {
      if (!inputs.length || inputs.length > FILE_LIMITS.workspaceCount)
        throw new Error('Choose 1–500 files.')
      if (inputs.reduce((total, file) => total + file.blob.size, 0) > FILE_LIMITS.batchBytes)
        throw new Error('Combined files must be at most 150 MB.')
      inputs.forEach((file) => validateBatch([file]))
    } else validateBatch(inputs)
    if (options.restore)
      inputs.forEach((input) => {
        const metadata = input as FileInput & Partial<WorkspaceFileInfo>
        if (
          typeof metadata.pinned !== 'boolean' ||
          typeof metadata.createdAt !== 'number' ||
          !Number.isFinite(metadata.createdAt) ||
          metadata.createdAt <= 0 ||
          metadata.createdAt >= 8.64e15
        )
          throw new Error('Invalid imported file metadata.')
      })
    return transaction<WorkspaceFileInfo[]>('readwrite', (tx, done, fail) => {
      const metadata = tx.objectStore(META)
      // Read names in the same write transaction to avoid collisions between tabs.
      const namesRequest = metadata.getAll()
      namesRequest.onsuccess = () => {
        try {
          if (namesRequest.result.length + inputs.length > FILE_LIMITS.workspaceCount) {
            fail(
              new Error(
                `Workspace holds up to ${FILE_LIMITS.workspaceCount} files. Remove files before adding more.`,
              ),
            )
            return
          }
          const names = new Set<string>(
            namesRequest.result
              .filter((item) => item && typeof item.name === 'string')
              .map((item: WorkspaceFileInfo) => item.name),
          )
          const entries = inputs.map((input) => {
            const restored = input as FileInput & Partial<WorkspaceFileInfo>
            const entry: WorkspaceFileInfo = {
              id: crypto.randomUUID(),
              name: uniqueFilename(input.name, names),
              mimeType: input.blob.type || 'application/octet-stream',
              size: input.blob.size,
              createdAt: options.restore ? restored.createdAt! : Date.now(),
              pinned: options.restore ? restored.pinned! : false,
              sourceTool: input.sourceTool,
              originalName: safeFilename(input.originalName ?? input.name),
            }
            names.add(entry.name)
            metadata.add(entry)
            tx.objectStore(BLOBS).add(
              input.blob.type ? input.blob : input.blob.slice(0, input.blob.size, entry.mimeType),
              entry.id,
            )
            return entry
          })
          done(entries)
        } catch (error) {
          fail(error instanceof Error ? error : new Error('File could not be saved. Please retry.'))
        }
      }
    })
  },
  delete: (id: string) =>
    transaction<void>('readwrite', (tx, done) => {
      tx.objectStore(META).delete(id)
      tx.objectStore(BLOBS).delete(id)
      done(undefined)
    }),
  deleteMany: (ids: string[]) =>
    transaction<void>('readwrite', (tx, done) => {
      for (const id of new Set(ids)) {
        tx.objectStore(META).delete(id)
        tx.objectStore(BLOBS).delete(id)
      }
      done(undefined)
    }),
  clear: () =>
    transaction<void>('readwrite', (tx, done) => {
      tx.objectStore(META).clear()
      tx.objectStore(BLOBS).clear()
      done(undefined)
    }),
  pin: (id: string, pinned: boolean) =>
    transaction<void>('readwrite', (tx, done, fail) => {
      const store = tx.objectStore(META)
      const request = store.get(id)
      request.onsuccess = () => {
        if (!validMetadata(request.result)) {
          fail(new Error('File no longer exists. Refresh the Workspace.'))
          return
        }
        store.put({ ...request.result, pinned })
        done(undefined)
      }
    }),
}
