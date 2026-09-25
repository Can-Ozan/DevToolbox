import { describe, expect, it, vi } from 'vitest'
import { zipSync, unzipSync, strToU8 } from 'fflate'
import {
  createArchive,
  extractArchive,
  inspectZip,
  listArchive,
  exportBackup,
  importBackup,
  safeArchivePath,
} from './archive'
const input = (name = 'note.txt', text = 'private bytes') => ({
  name,
  blob: new Blob([text], { type: 'text/plain' }),
})
const archive = (bytes: Uint8Array) => ({
  name: 'test.zip',
  blob: new Blob([new Uint8Array(bytes)], { type: 'application/zip' }),
})
const backupFile = () => ({
  ...input(),
  pinned: true,
  createdAt: 1700000000000,
  sourceTool: 'xml',
  originalName: 'original.txt',
})
describe('safe local ZIP', () => {
  it('creates archives with deterministic duplicate filenames and Unicode', async () => {
    const output = await createArchive([input(), input(), input('世界.txt')], 'bundle')
    const entries = await listArchive(output)
    expect(entries.map((entry) => entry.path)).toEqual(['note.txt', 'note-2.txt', '世界.txt'])
    const extracted = await extractArchive(output, [0, 2])
    expect(await extracted[0].blob.text()).toBe('private bytes')
    expect(extracted[1].name).toBe('世界.txt')
    expect(output.name).toBe('bundle.zip')
  })
  it.each([
    '../x',
    'a/../../x',
    '/root',
    'C:/x',
    'C:\\x',
    'a\\..\\x',
    '\\server\\file',
    'a\u0000b',
  ])('rejects path traversal %s', (path) => {
    expect(() => safeArchivePath(path)).toThrow('Unsafe')
    expect(() => inspectZip(zipSync({ [path]: strToU8('x') }))).toThrow()
  })
  it('lists directories and flattens paths without collisions', async () => {
    const file = archive(
      zipSync({
        'dir/': new Uint8Array(),
        'dir/a.txt': strToU8('first'),
        'dir_a.txt': strToU8('second'),
      }),
    )
    expect((await listArchive(file))[0].directory).toBe(true)
    expect((await extractArchive(file, [1, 2])).map((file) => file.name)).toEqual([
      'dir_a.txt',
      'dir_a-2.txt',
    ])
    await expect(extractArchive(file, [0])).rejects.toThrow('valid file entries')
  })
  it('rejects malformed, encrypted, excessive-entry and bomb archives', () => {
    expect(() => inspectZip(strToU8('bad'))).toThrow('Invalid')
    const encrypted = zipSync({ a: strToU8('x') })
    encrypted[6] |= 1
    expect(() => inspectZip(encrypted)).toThrow('Invalid')
    expect(() =>
      inspectZip(
        zipSync(
          Object.fromEntries(
            Array.from({ length: 1001 }, (_, i) => ['d' + i + '/', new Uint8Array()]),
          ),
        ),
      ),
    ).toThrow('1,000')
    expect(() => inspectZip(zipSync({ bomb: new Uint8Array(100000) }))).toThrow('safety limit')
  })
  it('checks CRC and actual inflated bytes rather than trusting declared size', async () => {
    const bytes = zipSync({ 'a.txt': strToU8('repeated text '.repeat(30)) })
    const entry = inspectZip(bytes)[0]
    bytes[entry.start] ^= 1
    await expect(extractArchive(archive(bytes), [0])).rejects.toThrow()
    const forged = zipSync({ 'a.txt': strToU8('repeated text '.repeat(30)) }),
      view = new DataView(forged.buffer)
    view.setUint32(22, 1, true)
    const central = view.getUint32(forged.length - 6, true)
    view.setUint32(central + 24, 1, true)
    await expect(extractArchive(archive(forged), [0])).rejects.toThrow('declared size')
  })
  it('bounds archive size before reading and stores highly compressible own outputs safely', async () => {
    const file = archive(new Uint8Array([1]))
    vi.spyOn(file.blob, 'size', 'get').mockReturnValue(101 * 1024 ** 2)
    await expect(listArchive(file)).rejects.toThrow('limit')
    const output = await createArchive([input('zeros.txt', 'a'.repeat(100000))])
    expect((await listArchive(output))[0].compressedSize).toBe(100000)
  })
})
describe('Workspace backup schema', () => {
  it('roundtrips safe metadata and bytes without preferences, IDs or URLs', async () => {
    const result = await importBackup(await exportBackup([backupFile()]))
    expect(result[0]).toMatchObject({
      name: 'note.txt',
      pinned: true,
      createdAt: 1700000000000,
      sourceTool: 'xml',
      originalName: 'original.txt',
    })
    expect(await result[0].blob.text()).toBe('private bytes')
    expect(result[0]).not.toHaveProperty('id')
    expect(result[0]).not.toHaveProperty('url')
  })
  it.each(['malformed', 'version', 'missing', 'size', 'unlisted', 'path'] as const)(
    'rejects %s backup before storage',
    async (mode) => {
      const original = await exportBackup([backupFile()]),
        content = unzipSync(new Uint8Array(await original.blob.arrayBuffer()))
      const manifest = JSON.parse(new TextDecoder().decode(content['manifest.json']))
      if (mode === 'version') manifest.schemaVersion = 2
      if (mode === 'missing') delete content['files/0']
      if (mode === 'size') manifest.files[0].size++
      if (mode === 'path') manifest.files[0].path = '../secret'
      if (mode === 'unlisted') content.extra = strToU8('x')
      content['manifest.json'] = strToU8(mode === 'malformed' ? 'bad' : JSON.stringify(manifest))
      await expect(importBackup(archive(zipSync(content)))).rejects.toThrow()
    },
  )
})
