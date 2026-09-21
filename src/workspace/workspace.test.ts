import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest'
import { IDBFactory, IDBObjectStore } from 'fake-indexeddb'
import { WORKSPACE_DB, workspaceDB } from './db'
import {
  acceptsFile,
  fileError,
  fromDevice,
  uniqueFilename,
  validateBatch,
  validateFile,
  FILE_LIMITS,
} from './workspaceUtils'

const input = (name = 'sample.txt') => ({ name, blob: new Blob(['hello'], { type: 'text/plain' }) })
beforeEach(() => {
  vi.stubGlobal('indexedDB', new IDBFactory())
})
afterEach(() => {
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
})

async function damage(storeName: string, id: string, value?: unknown) {
  await new Promise<void>((resolve, reject) => {
    const request = indexedDB.open(WORKSPACE_DB, 1)
    request.onsuccess = () => {
      const db = request.result
      const tx = db.transaction(storeName, 'readwrite')
      if (value === undefined) tx.objectStore(storeName).delete(id)
      else tx.objectStore(storeName).put(value)
      tx.oncomplete = () => {
        db.close()
        resolve()
      }
      tx.onerror = () => reject(tx.error)
    }
  })
}

describe('Workspace IndexedDB', () => {
  it('restores backups into the existing v1 schema with fresh IDs and safe duplicate names',async()=>{
    const [existing]=await workspaceDB.add([input()])
    const restored=await workspaceDB.add([{...input(),pinned:true,createdAt:1700000000000} as Parameters<typeof workspaceDB.add>[0][number]],{bulk:true,restore:true})
    expect(restored[0]).toMatchObject({name:'sample-2.txt',pinned:true,createdAt:1700000000000})
    expect(restored[0].id).not.toBe(existing.id)
    expect(await(await workspaceDB.get(existing.id)).blob.text()).toBe('hello')
    const version=await new Promise<number>(resolve=>{const request=indexedDB.open(WORKSPACE_DB);request.onsuccess=()=>{resolve(request.result.version);request.result.close()}})
    expect(version).toBe(1)
  })
  it('rolls back every imported entry when a later Blob write fails',async()=>{
    const [existing]=await workspaceDB.add([input('keep.txt')])
    const original=IDBObjectStore.prototype.add;let blobs=0
    vi.spyOn(IDBObjectStore.prototype,'add').mockImplementation(function(this:IDBObjectStore,...args:Parameters<typeof original>){if(this.name==='blobs' && ++blobs===2)throw new DOMException('Full','QuotaExceededError');return original.apply(this,args)})
    await expect(workspaceDB.add([input('one.txt'),input('two.txt')],{bulk:true})).rejects.toThrow('Full')
    expect((await workspaceDB.list()).files.map(file=>file.id)).toEqual([existing.id])
  })
  it('deletes selected metadata and Blobs atomically, preserving unselected files',async()=>{
    const [a,b,c]=await workspaceDB.add([input('a'),input('b'),input('c')])
    const original=IDBObjectStore.prototype.delete
    const mock=vi.spyOn(IDBObjectStore.prototype,'delete').mockImplementation(function(this:IDBObjectStore,...args:Parameters<typeof original>){if(this.name==='blobs' && args[0]===b.id)throw new Error('Delete failed');return original.apply(this,args)})
    await expect(workspaceDB.deleteMany([a.id,b.id])).rejects.toThrow('Delete failed')
    expect((await workspaceDB.list()).files).toHaveLength(3)
    expect(await(await workspaceDB.get(a.id)).blob.text()).toBe('hello')
    mock.mockRestore();await workspaceDB.deleteMany([a.id,b.id]);expect((await workspaceDB.list()).files.map(file=>file.id)).toEqual([c.id])
  })
  it('bounds bulk imports without changing existing data',async()=>{
    await workspaceDB.add([input('keep')])
    await expect(workspaceDB.add(Array.from({length:501},()=>input()),{bulk:true})).rejects.toThrow('500')
    await expect(workspaceDB.add([input()],{bulk:true,restore:true})).rejects.toThrow('metadata')
    expect((await workspaceDB.list()).files).toHaveLength(1)
  })
  it('atomically saves and retrieves blob content and metadata', async () => {
    const [saved] = await workspaceDB.add([
      { ...input(), sourceTool: 'sample', originalName: 'original.txt' },
    ])
    expect(saved).toMatchObject({
      name: 'sample.txt',
      mimeType: 'text/plain',
      size: 5,
      pinned: false,
      sourceTool: 'sample',
      originalName: 'original.txt',
    })
    expect(saved.id).toMatch(/^[0-9a-f-]{36}$/)
    expect(await (await workspaceDB.get(saved.id)).blob.text()).toBe('hello')
    expect((await workspaceDB.list()).files).toHaveLength(1)
    expect((await workspaceDB.list()).files[0]).not.toHaveProperty('blob')
  })
  it('allocates duplicate names safely across concurrent transactions', async () => {
    const results = await Promise.all([
      workspaceDB.add([input()]),
      workspaceDB.add([input()]),
      workspaceDB.add([input()]),
    ])
    expect(new Set(results.flat().map((file) => file.name))).toEqual(
      new Set(['sample.txt', 'sample-2.txt', 'sample-3.txt']),
    )
  })
  it('deletes metadata and blobs and clears all files', async () => {
    const [a, b] = await workspaceDB.add([input('a.txt'), input('b.txt')])
    await workspaceDB.delete(a.id)
    await expect(workspaceDB.get(a.id)).rejects.toThrow('missing or damaged')
    expect(await (await workspaceDB.get(b.id)).blob.text()).toBe('hello')
    await workspaceDB.clear()
    expect((await workspaceDB.list()).files).toEqual([])
    await expect(workspaceDB.get(b.id)).rejects.toThrow('missing or damaged')
  })
  it('pins files without altering content', async () => {
    const [file] = await workspaceDB.add([input()])
    await workspaceDB.pin(file.id, true)
    expect((await workspaceDB.get(file.id)).pinned).toBe(true)
    expect(await (await workspaceDB.get(file.id)).blob.text()).toBe('hello')
  })
  it('reports damaged metadata without deleting it, and detects missing blobs', async () => {
    const [file] = await workspaceDB.add([input()])
    await damage('blobs', file.id)
    await expect(workspaceDB.get(file.id)).rejects.toThrow('missing or damaged')
    await damage('files', file.id, { id: file.id, name: file.name })
    expect(await workspaceDB.list()).toEqual({ files: [], invalid: 1 })
    await expect(workspaceDB.get(file.id)).rejects.toThrow('missing or damaged')
  })
  it('rolls back both stores when storage is full', async () => {
    const original = IDBObjectStore.prototype.add
    vi.spyOn(IDBObjectStore.prototype, 'add').mockImplementation(function (
      this: IDBObjectStore,
      ...args: Parameters<typeof original>
    ) {
      if (this.name === 'blobs') throw new DOMException('Full', 'QuotaExceededError')
      return original.apply(this, args)
    })
    await expect(workspaceDB.add([input()])).rejects.toThrow('Full')
    expect((await workspaceDB.list()).files).toEqual([])
    expect(fileError(new DOMException('Full', 'QuotaExceededError'))).toContain('Nothing was saved')
  })
  it('handles unavailable IndexedDB', async () => {
    vi.stubGlobal('indexedDB', undefined)
    await expect(workspaceDB.list()).rejects.toThrow('storage is unavailable')
    await expect(workspaceDB.add([input()])).rejects.toThrow('storage is unavailable')
  })
})

describe('file rules', () => {
  it('keeps extensions in duplicate names and sanitizes path characters', () => {
    expect(uniqueFilename('image.png', ['image.png', 'image-2.png'])).toBe('image-3.png')
    expect(uniqueFilename('../unsafe.txt', [])).includes('_')
    expect(uniqueFilename('README', ['README'])).toBe('README-2')
  })
  it('filters exact types and infers missing device MIME from supported extensions', () => {
    expect(acceptsFile('image/png', ['application/pdf'])).toBe(false)
    expect(acceptsFile('image/svg+xml', ['image/png'])).toBe(false)
    expect(fromDevice(new File(['x'], 'picture.PNG')).blob.type).toBe('image/png')
    expect(() => validateFile(input(), ['application/pdf'])).toThrow('Unsupported')
  })
  it('rejects empty, oversized and excessive batch inputs before processing', () => {
    expect(() => validateFile({ name: 'empty', blob: new Blob() })).toThrow('non-empty')
    const blob = new Blob(['x'], { type: 'image/png' })
    vi.spyOn(blob, 'size', 'get').mockReturnValue(FILE_LIMITS.imageBytes + 1)
    expect(() => validateFile({ name: 'large.png', blob })).toThrow('limit')
    expect(() => validateBatch(Array.from({ length: 31 }, () => input()))).toThrow('up to 30')
  })
})
