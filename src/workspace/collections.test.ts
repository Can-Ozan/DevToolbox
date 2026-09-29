import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { IDBFactory, IDBObjectStore } from 'fake-indexeddb'
import { WORKSPACE_DB, workspaceDB } from './db'
import { exportBackup, importBackup } from '../lib/archive'

const input = (name = 'note.txt') => ({
  name,
  blob: new Blob(['keep these bytes'], { type: 'text/plain' }),
})
beforeEach(() => vi.stubGlobal('indexedDB', new IDBFactory()))
afterEach(() => {
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
})

it('migrates v1 additively without changing IDs, names, pins, dates or Blob bytes', async () => {
  const file = input()
  const metadata = {
    id: 'existing',
    name: file.name,
    mimeType: file.blob.type,
    size: file.blob.size,
    createdAt: 1700000000000,
    pinned: true,
  }
  await new Promise<void>((resolve, reject) => {
    const request = indexedDB.open(WORKSPACE_DB, 1)
    request.onupgradeneeded = () => {
      const store = request.result.createObjectStore('files', { keyPath: 'id' })
      store.createIndex('name', 'name', { unique: true })
      store.add(metadata)
      request.result.createObjectStore('blobs').add(file.blob, metadata.id)
    }
    request.onerror = () => reject(request.error)
    request.onsuccess = () => {
      request.result.close()
      resolve()
    }
  })
  expect(await workspaceDB.list()).toEqual({ files: [metadata], collections: [], invalid: 0 })
  expect(await (await workspaceDB.get(metadata.id)).blob.text()).toBe('keep these bytes')
  const collection = await workspaceDB.saveCollection('Migrated')
  await workspaceDB.moveFiles([metadata.id], collection.id)
  expect(await workspaceDB.get(metadata.id)).toMatchObject({
    ...metadata,
    collectionId: collection.id,
  })
})

it('creates and renames collections with validated unique names', async () => {
  const created = await workspaceDB.saveCollection('  Portfolio  ')
  expect(created.name).toBe('Portfolio')
  await expect(workspaceDB.saveCollection('portfolio')).rejects.toThrow('already exists')
  expect(() => workspaceDB.saveCollection('  ')).toThrow('1–80')
  expect(() => workspaceDB.saveCollection('x'.repeat(81))).toThrow('1–80')
  const renamed = await workspaceDB.saveCollection('API Project', created.id)
  expect(renamed).toEqual({ ...created, name: 'API Project' })
  expect((await workspaceDB.list()).collections).toEqual([renamed])
})

it('moves one or multiple files, removes assignments and retains files on collection deletion', async () => {
  const [a, b, c] = await workspaceDB.add([input('a'), input('b'), input('c')])
  const first = await workspaceDB.saveCollection('First'),
    second = await workspaceDB.saveCollection('Second')
  await workspaceDB.moveFiles([a.id, b.id], first.id)
  await workspaceDB.moveFiles([a.id], second.id)
  expect((await workspaceDB.get(a.id)).collectionId).toBe(second.id)
  await workspaceDB.moveFiles([a.id])
  expect((await workspaceDB.get(a.id)).collectionId).toBeUndefined()
  await workspaceDB.deleteCollection(first.id)
  expect((await workspaceDB.list()).files).toHaveLength(3)
  expect((await workspaceDB.get(b.id)).collectionId).toBeUndefined()
  for (const file of [a, b, c])
    expect(await (await workspaceDB.get(file.id)).blob.text()).toBe('keep these bytes')
})

it('rolls back a bulk move when a file or destination has disappeared', async () => {
  const [file] = await workspaceDB.add([input()])
  const collection = await workspaceDB.saveCollection('Work')
  await expect(workspaceDB.moveFiles([file.id, 'missing'], collection.id)).rejects.toThrow(
    'no longer exists',
  )
  expect((await workspaceDB.get(file.id)).collectionId).toBeUndefined()
  await expect(workspaceDB.moveFiles([file.id], 'missing')).rejects.toThrow('no longer exists')
})

it('restores collections and membership atomically with fresh IDs and safe name collisions', async () => {
  const collection = await workspaceDB.saveCollection('Portfolio')
  const [saved] = await workspaceDB.add([input()])
  await workspaceDB.moveFiles([saved.id], collection.id)
  const backup = await importBackup(
    await exportBackup([await workspaceDB.get(saved.id)], [collection]),
  )
  const [restored] = await workspaceDB.add(backup.files, {
    bulk: true,
    restore: true,
    collections: backup.collections,
  })
  const { collections } = await workspaceDB.list()
  expect(collections.map((item) => item.name)).toEqual(['Portfolio', 'Portfolio (2)'])
  expect(restored.collectionId).not.toBe(collection.id)
  expect(restored.collectionId).toBe(collections[1].id)
  expect(restored.name).toBe('note-2.txt')
})

it('rolls back imported collections as well as files on a Blob write failure', async () => {
  const original = IDBObjectStore.prototype.add
  vi.spyOn(IDBObjectStore.prototype, 'add').mockImplementation(function (
    this: IDBObjectStore,
    ...args: Parameters<typeof original>
  ) {
    if (this.name === 'blobs') throw new DOMException('Full', 'QuotaExceededError')
    return original.apply(this, args)
  })
  await expect(
    workspaceDB.add(
      [
        { ...input(), pinned: false, createdAt: 1700000000000 } as Parameters<
          typeof workspaceDB.add
        >[0][number],
      ],
      {
        bulk: true,
        restore: true,
        collections: [{ id: 'old', name: 'Import', createdAt: 1700000000000 }],
      },
    ),
  ).rejects.toThrow('Full')
  expect(await workspaceDB.list()).toEqual({ files: [], collections: [], invalid: 0 })
})

it('preserves empty collections in backups and clears them only on explicit Workspace clear', async () => {
  const original = [{ id: 'empty', name: 'Empty', createdAt: 1700000000000 }]
  const backup = await importBackup(await exportBackup([], original))
  await workspaceDB.add(backup.files, {
    bulk: true,
    restore: true,
    collections: backup.collections,
  })
  expect((await workspaceDB.list()).collections[0].name).toBe('Empty')
  await workspaceDB.clear()
  expect((await workspaceDB.list()).collections).toEqual([])
})
