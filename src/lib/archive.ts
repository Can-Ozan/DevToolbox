import { Inflate, zipSync, type Zippable } from 'fflate'
import {
  FILE_LIMITS,
  safeFilename,
  uniqueFilename,
  validateFile,
} from '../workspace/workspaceUtils'
import type { FileInput, FileOutput } from '../workspace/workspaceTypes'
import { ZIP_LIMITS, ZIP_TYPES, type ArchiveEntry, type BackupInput } from './archiveTypes'

interface Entry extends ArchiveEntry {
  start: number
  method: number
  crc: number
}
const invalid = () => {
  throw new Error(
    'Invalid or unsupported ZIP. Use an unencrypted, single-disk ZIP with stored or deflated entries (no ZIP64).',
  )
}
export function safeArchivePath(path: string) {
  const normalized = path.replaceAll('\\', '/')
  if (
    !normalized ||
    normalized.length > 1024 ||
    normalized.startsWith('/') ||
    normalized.includes(':') ||
    [...normalized].some((char) => char.charCodeAt(0) < 32 || char.charCodeAt(0) === 127) ||
    normalized.split('/').some((part) => part === '..' || part === '.') ||
    normalized.split('/').length > 20
  )
    throw new Error(
      'Unsafe ZIP path. Absolute paths, drive prefixes and traversal are not allowed.',
    )
  return normalized
}
const decodeName = (bytes: Uint8Array, flags: number) => {
  if (!(flags & 2048) && bytes.some((byte) => byte > 127))
    throw new Error('Non-UTF-8 ZIP filenames are unsupported. Re-export using UTF-8.')
  return safeArchivePath(new TextDecoder('utf-8', { fatal: true }).decode(bytes))
}
export function inspectZip(bytes: Uint8Array): Entry[] {
  if (bytes.length > ZIP_LIMITS.archiveBytes) throw new Error('ZIP input is limited to 100 MB.')
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength)
  let end = -1
  for (let i = bytes.length - 22; i >= Math.max(0, bytes.length - 65557); i--) {
    if (
      view.getUint32(i, true) === 0x06054b50 &&
      i + 22 + view.getUint16(i + 20, true) === bytes.length
    ) {
      end = i
      break
    }
  }
  if (end < 0) return invalid()
  const count = view.getUint16(end + 10, true),
    length = view.getUint32(end + 12, true),
    start = view.getUint32(end + 16, true)
  if (
    view.getUint32(end + 4, true) ||
    view.getUint16(end + 8, true) !== count ||
    count === 65535 ||
    start + length !== end
  )
    return invalid()
  if (count > ZIP_LIMITS.entries) throw new Error('ZIP is limited to 1,000 entries.')
  const entries: Entry[] = [],
    names = new Set<string>(),
    ranges: [number, number][] = []
  let offset = start,
    total = 0,
    files = 0
  for (let id = 0; id < count; id++) {
    if (offset + 46 > end || view.getUint32(offset, true) !== 0x02014b50) return invalid()
    const flags = view.getUint16(offset + 8, true),
      method = view.getUint16(offset + 10, true),
      crc = view.getUint32(offset + 16, true)
    const compressedSize = view.getUint32(offset + 20, true),
      size = view.getUint32(offset + 24, true),
      nameLength = view.getUint16(offset + 28, true)
    const next =
      offset +
      46 +
      nameLength +
      view.getUint16(offset + 30, true) +
      view.getUint16(offset + 32, true)
    const local = view.getUint32(offset + 42, true),
      mode = view.getUint32(offset + 38, true) >>> 16
    if (
      next > end ||
      flags & 65 ||
      ![0, 8].includes(method) ||
      view.getUint16(offset + 34, true) ||
      size === 0xffffffff ||
      compressedSize === 0xffffffff ||
      (mode & 0xf000) === 0xa000
    )
      return invalid()
    const path = decodeName(bytes.subarray(offset + 46, offset + 46 + nameLength), flags),
      directory = path.endsWith('/')
    if (names.has(path)) throw new Error('ZIP contains duplicate entry paths.')
    names.add(path)
    if (
      local + 30 > start ||
      view.getUint32(local, true) !== 0x04034b50 ||
      view.getUint16(local + 6, true) !== flags ||
      view.getUint16(local + 8, true) !== method
    )
      return invalid()
    const localLength = view.getUint16(local + 26, true),
      dataStart = local + 30 + localLength + view.getUint16(local + 28, true)
    if (
      dataStart + compressedSize > start ||
      dataStart > start ||
      decodeName(bytes.subarray(local + 30, local + 30 + localLength), flags) !== path
    )
      return invalid()
    if (
      !(flags & 8) &&
      (view.getUint32(local + 14, true) !== crc ||
        view.getUint32(local + 18, true) !== compressedSize ||
        view.getUint32(local + 22, true) !== size)
    )
      return invalid()
    if ((directory && size) || (method === 0 && compressedSize !== size)) return invalid()
    total += size
    if (!directory) files++
    if (
      files > ZIP_LIMITS.files + 1 ||
      total > ZIP_LIMITS.bytes ||
      size > FILE_LIMITS.fileBytes ||
      size > Math.max(1, compressedSize) * ZIP_LIMITS.ratio
    )
      throw new Error(
        'ZIP safety limit exceeded: 500 files (+ backup manifest), 150 MB total, 100 MB per file, 200:1 expansion.',
      )
    ranges.push([local, dataStart + compressedSize])
    entries.push({ id, path, size, compressedSize, directory, method, crc, start: dataStart })
    offset = next
  }
  if (offset !== end) return invalid()
  ranges.sort((a, b) => a[0] - b[0])
  if (ranges.some((range, i) => i > 0 && range[0] < ranges[i - 1][1])) return invalid()
  return entries
}
const crcTable = new Uint32Array(256).map((_, n) => {
  let value = n
  for (let i = 0; i < 8; i++) value = value & 1 ? 0xedb88320 ^ (value >>> 1) : value >>> 1
  return value >>> 0
})
function readEntry(bytes: Uint8Array, entry: Entry) {
  const parts: BlobPart[] = []
  let size = 0,
    crc = 0xffffffff
  const append = (chunk: Uint8Array) => {
    size += chunk.length
    if (size > entry.size || size > FILE_LIMITS.fileBytes)
      throw new Error('ZIP entry expands beyond its declared size.')
    for (const value of chunk) crc = crcTable[(crc ^ value) & 255] ^ (crc >>> 8)
    parts.push(new Uint8Array(chunk))
  }
  const data = bytes.subarray(entry.start, entry.start + entry.compressedSize)
  if (entry.method === 0) append(data)
  else {
    // Small compressed chunks bound transient inflation before checking actual output sizes.
    const stream = new Inflate(append)
    for (let i = 0; i < data.length; i += 1024)
      stream.push(data.subarray(i, i + 1024), i + 1024 >= data.length)
    if (!data.length) stream.push(data, true)
  }
  if (size !== entry.size || (crc ^ 0xffffffff) >>> 0 !== entry.crc)
    throw new Error('ZIP integrity check failed (size or CRC).')
  return new Blob(parts)
}
export function mimeForName(name: string) {
  const types: Record<string, string> = {
    png: 'image/png',
    jpg: 'image/jpeg',
    jpeg: 'image/jpeg',
    webp: 'image/webp',
    pdf: 'application/pdf',
    zip: 'application/zip',
    txt: 'text/plain',
    json: 'application/json',
    csv: 'text/csv',
    xml: 'application/xml',
    html: 'text/html',
    css: 'text/css',
    js: 'text/javascript',
    md: 'text/markdown',
    yaml: 'application/yaml',
    yml: 'application/yaml',
  }
  return types[name.split('.').at(-1)?.toLowerCase() ?? ''] ?? 'application/octet-stream'
}
async function archiveBytes(file: FileInput) {
  validateFile(file, ZIP_TYPES)
  return new Uint8Array(await file.blob.arrayBuffer())
}
export async function listArchive(file: FileInput) {
  return inspectZip(await archiveBytes(file))
}
export async function extractArchive(file: FileInput, selected: number[]): Promise<FileInput[]> {
  const bytes = await archiveBytes(file),
    entries = inspectZip(bytes)
  if (
    !selected.length ||
    new Set(selected).size !== selected.length ||
    selected.some((id) => !entries[id] || entries[id].directory)
  )
    throw new Error('Choose valid file entries to extract.')
  const names = new Set<string>()
  return selected.map((id) => {
    const entry = entries[id],
      name = uniqueFilename(entry.path.replaceAll('/', '_'), names)
    names.add(name)
    const blob = readEntry(bytes, entry)
    return {
      name,
      originalName: name,
      blob: blob.slice(0, blob.size, mimeForName(name)),
      sourceTool: 'zip',
    }
  })
}
export async function createArchive(files: FileInput[], name = 'archive.zip'): Promise<FileOutput> {
  if (!files.length || files.length > ZIP_LIMITS.files) throw new Error('Choose 1–500 files.')
  if (files.reduce((sum, file) => sum + file.blob.size, 0) > ZIP_LIMITS.bytes)
    throw new Error('ZIP inputs are limited to 150 MB total.')
  const content: Zippable = Object.create(null),
    names = new Set<string>()
  for (const file of files) {
    validateFile(file)
    const filename = uniqueFilename(file.name, names)
    names.add(filename)
    content[filename] = new Uint8Array(await file.blob.arrayBuffer())
  }
  return pack(content, name)
}
function pack(content: Zippable, name: string): FileOutput {
  const bytes = zipSync(content, { level: 6 })
  if (bytes.length > ZIP_LIMITS.archiveBytes)
    throw new Error('Output ZIP exceeds 100 MB. Choose fewer files.')
  // Avoid creating archives that our own safety policy cannot reopen (e.g. extreme compression).
  try {
    inspectZip(bytes)
  } catch (error) {
    if (!(error instanceof Error) || !error.message.includes('safety limit')) throw error
    const stored = zipSync(content, { level: 0 })
    if (stored.length > ZIP_LIMITS.archiveBytes)
      throw new Error('Output ZIP exceeds 100 MB. Choose fewer files.', { cause: error })
    inspectZip(stored)
    return {
      name: safeFilename(name.endsWith('.zip') ? name : name + '.zip'),
      blob: new Blob([stored], { type: 'application/zip' }),
      sourceTool: 'zip',
    }
  }
  return {
    name: safeFilename(name.endsWith('.zip') ? name : name + '.zip'),
    blob: new Blob([bytes], { type: 'application/zip' }),
    sourceTool: 'zip',
  }
}
export async function exportBackup(files: BackupInput[]) {
  if (!files.length || files.length > ZIP_LIMITS.files)
    throw new Error('Workspace export needs 1–500 files.')
  if (files.reduce((sum, file) => sum + file.blob.size, 0) > ZIP_LIMITS.bytes - 1024 * 1024)
    throw new Error(
      'Backup content is limited to 149 MB. Download files separately for larger Workspaces.',
    )
  const content: Zippable = Object.create(null)
  const manifest = {
    schemaVersion: 1,
    exportedAt: new Date().toISOString(),
    files: [] as Record<string, unknown>[],
  }
  for (const [index, file] of files.entries()) {
    validateFile(file)
    const path = `files/${index}`,
      name = safeFilename(file.name)
    content[path] = new Uint8Array(await file.blob.arrayBuffer())
    manifest.files.push({
      path,
      name,
      mimeType: file.blob.type || 'application/octet-stream',
      size: file.blob.size,
      originalName: safeFilename(file.originalName ?? name),
      sourceTool: file.sourceTool,
      pinned: file.pinned,
      createdAt: file.createdAt,
    })
  }
  content['manifest.json'] = new TextEncoder().encode(JSON.stringify(manifest, null, 2))
  return pack(content, 'devtoolbox-workspace.zip')
}
export async function importBackup(file: FileInput): Promise<BackupInput[]> {
  const bytes = await archiveBytes(file),
    entries = inspectZip(bytes)
  const manifestEntry = entries.find((entry) => entry.path === 'manifest.json' && !entry.directory)
  if (!manifestEntry || manifestEntry.size > 1024 * 1024)
    throw new Error('Missing or oversized Workspace manifest.json.')
  let manifest: { schemaVersion?: unknown; exportedAt?: unknown; files?: unknown }
  try {
    manifest = JSON.parse(await readEntry(bytes, manifestEntry).text())
  } catch {
    throw new Error('Invalid Workspace manifest.json.')
  }
  if (!manifest || manifest.schemaVersion !== 1)
    throw new Error('Unsupported Workspace backup schema version.')
  if (
    typeof manifest.exportedAt !== 'string' ||
    !Number.isFinite(Date.parse(manifest.exportedAt)) ||
    !Array.isArray(manifest.files) ||
    !manifest.files.length ||
    manifest.files.length > ZIP_LIMITS.files
  )
    throw new Error('Invalid Workspace backup manifest.')
  const paths = new Set<string>()
  const result = manifest.files.map((value: unknown): BackupInput => {
    if (!value || typeof value !== 'object') throw new Error('Invalid backup file metadata.')
    const item = value as Record<string, unknown>
    if (
      typeof item.path !== 'string' ||
      !/^files\/\d+$/.test(item.path) ||
      paths.has(item.path) ||
      typeof item.name !== 'string' ||
      !item.name.trim() ||
      item.name.length > 180 ||
      typeof item.mimeType !== 'string' ||
      item.mimeType.length > 255 ||
      !/^[\w!#$&^.+-]+\/[\w!#$&^.+-]+(?:;[ -~]+)?$/.test(item.mimeType) ||
      typeof item.pinned !== 'boolean' ||
      typeof item.createdAt !== 'number' ||
      item.createdAt <= 0 ||
      item.createdAt >= 8.64e15 ||
      !Number.isFinite(item.createdAt) ||
      (item.sourceTool !== undefined &&
        (typeof item.sourceTool !== 'string' || item.sourceTool.length > 100)) ||
      (item.originalName !== undefined && typeof item.originalName !== 'string')
    )
      throw new Error('Invalid backup file metadata.')
    paths.add(item.path)
    const entry = entries.find((entry) => entry.path === item.path && !entry.directory)
    if (!entry || item.size !== entry.size)
      throw new Error('A backup file is missing or has an incorrect size.')
    const raw = readEntry(bytes, entry)
    const restored = {
      name: safeFilename(item.name),
      blob: raw.slice(0, raw.size, item.mimeType),
      pinned: item.pinned,
      createdAt: item.createdAt,
      sourceTool: item.sourceTool as string | undefined,
      originalName: safeFilename((item.originalName as string) ?? item.name),
    }
    validateFile(restored)
    return restored
  })
  if (entries.filter((entry) => !entry.directory).length !== paths.size + 1)
    throw new Error('Backup contains unlisted files.')
  return result
}
