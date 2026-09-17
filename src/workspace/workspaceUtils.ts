import type { FileInput } from './workspaceTypes'

export const IMAGE_TYPES = ['image/png', 'image/jpeg', 'image/webp']
export const PDF_TYPES = ['application/pdf']
export const FILE_LIMITS = {
  imageBytes: 50 * 1024 ** 2,
  fileBytes: 100 * 1024 ** 2,
  batchBytes: 150 * 1024 ** 2,
  batchCount: 30,
  workspaceCount: 500,
  imagePixels: 16_000_000,
  imageDimension: 8192,
  pdfPages: 500,
  processingMs: 30_000,
} as const

export function formatBytes(size: number) {
  if (size < 1024) return `${size} B`
  if (size < 1024 ** 2) return `${(size / 1024).toFixed(1)} KB`
  return `${(size / 1024 ** 2).toFixed(1)} MB`
}

export function safeFilename(name: string) {
  return (
    name
      // eslint-disable-next-line no-control-regex -- Strip control characters from downloaded filenames.
      .replace(/[\u0000-\u001f\u007f/\\:*?"<>|]/g, '_')
      .trim()
      .slice(0, 180) || 'untitled'
  )
}

export function uniqueFilename(name: string, names: Iterable<string>) {
  const used = new Set(names)
  const safe = safeFilename(name)
  const dot = safe.lastIndexOf('.')
  const stem = dot > 0 ? safe.slice(0, dot) : safe
  const extension = dot > 0 ? safe.slice(dot) : ''
  let candidate = safe
  for (let suffix = 2; used.has(candidate); suffix++) candidate = `${stem}-${suffix}${extension}`
  return candidate
}

export function outputFilename(name: string, suffix: string, extension: string) {
  return safeFilename(`${name.replace(/\.[^.]+$/, '')}-${suffix}.${extension}`)
}

export function acceptsFile(mimeType: string, accepted?: readonly string[]) {
  return !accepted?.length || accepted.includes(mimeType)
}

export function validateFile(file: FileInput, accepted?: readonly string[]) {
  if (!(file.blob instanceof Blob) || !file.blob.size) throw new Error('Choose a non-empty file.')
  if (!acceptsFile(file.blob.type, accepted))
    throw new Error(`Unsupported file type. Choose ${accepted?.join(', ')}.`)
  const limit = file.blob.type.startsWith('image/') ? FILE_LIMITS.imageBytes : FILE_LIMITS.fileBytes
  if (file.blob.size > limit)
    throw new Error(`${file.name}: limit is ${formatBytes(limit)} per file.`)
}

export function validateBatch(files: FileInput[], accepted?: readonly string[]) {
  if (!files.length) throw new Error('Choose at least one file.')
  if (files.length > FILE_LIMITS.batchCount)
    throw new Error(`Choose up to ${FILE_LIMITS.batchCount} files at a time.`)
  files.forEach((file) => validateFile(file, accepted))
  if (files.reduce((sum, file) => sum + file.blob.size, 0) > FILE_LIMITS.batchBytes)
    throw new Error(`Combined inputs must be at most ${formatBytes(FILE_LIMITS.batchBytes)}.`)
}

export function fromDevice(file: File): FileInput {
  const extension = file.name.split('.').at(-1)?.toLowerCase()
  const inferred: Record<string, string> = {
    png: 'image/png',
    jpg: 'image/jpeg',
    jpeg: 'image/jpeg',
    webp: 'image/webp',
    pdf: 'application/pdf',
  }
  return {
    name: file.name,
    originalName: file.name,
    blob: file.type
      ? file
      : file.slice(0, file.size, inferred[extension ?? ''] ?? 'application/octet-stream'),
  }
}

export function fileError(error: unknown) {
  if (error instanceof Error) {
    if (error.name === 'QuotaExceededError')
      return 'Browser storage is full. Download your output, then remove unneeded files and retry. Nothing was saved.'
    if (['SecurityError', 'InvalidStateError', 'UnknownError'].includes(error.name))
      return 'IndexedDB storage is unavailable. Allow browser storage and retry. Device input and downloads still work.'
    return error.message
  }
  return 'The file operation failed. Your input has not been changed. Please retry.'
}

export function downloadFile(file: FileInput) {
  const url = URL.createObjectURL(file.blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = safeFilename(file.name)
  anchor.click()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}
