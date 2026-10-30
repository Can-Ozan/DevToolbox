import type { FileInput } from './workspaceTypes'
import {
  message,
  messageError,
  MessageError,
  type AppMessage,
  type DisplayMessage,
} from '../i18n/messages'

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
  if (size >= 1024 ** 3) return `${(size / 1024 ** 3).toFixed(1)} GB`
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
  return !accepted?.length || accepted.includes('*/*') || accepted.includes(mimeType)
}

export function validateFile(file: FileInput, accepted?: readonly string[]) {
  if (!(file.blob instanceof Blob) || !file.blob.size)
    throw messageError('workspace.errors.nonEmpty', 'Choose a non-empty file.')
  if (!acceptsFile(file.blob.type, accepted))
    throw messageError('workspace.errors.unsupported', 'Unsupported file type. Choose {{types}}.', {
      types: accepted?.join(', ') ?? '',
    })
  const limit = file.blob.type.startsWith('image/') ? FILE_LIMITS.imageBytes : FILE_LIMITS.fileBytes
  if (file.blob.size > limit)
    throw messageError('workspace.errors.fileLimit', '{{name}}: limit is {{limit}} per file.', {
      name: file.name,
      limit: formatBytes(limit),
    })
}

export function validateBatch(files: FileInput[], accepted?: readonly string[]) {
  if (!files.length) throw messageError('workspace.errors.atLeastOne', 'Choose at least one file.')
  if (files.length > FILE_LIMITS.batchCount)
    throw messageError('workspace.errors.batchCount', 'Choose up to {{count}} files at a time.', {
      count: FILE_LIMITS.batchCount,
    })
  files.forEach((file) => validateFile(file, accepted))
  if (files.reduce((sum, file) => sum + file.blob.size, 0) > FILE_LIMITS.batchBytes)
    throw messageError(
      'workspace.errors.batchBytes',
      'Combined inputs must be at most {{limit}}.',
      { limit: formatBytes(FILE_LIMITS.batchBytes) },
    )
}

export function fromDevice(file: File): FileInput {
  const extension = file.name.split('.').at(-1)?.toLowerCase()
  const inferred: Record<string, string> = {
    png: 'image/png',
    jpg: 'image/jpeg',
    jpeg: 'image/jpeg',
    webp: 'image/webp',
    pdf: 'application/pdf',
    zip: 'application/zip',
    json: 'application/json',
  }
  return {
    name: file.name,
    originalName: file.name,
    lastModified: file.lastModified,
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

export function fileMessage(error: unknown): DisplayMessage {
  if (error instanceof MessageError) return error.descriptor
  if (error && typeof error === 'object' && 'descriptor' in error && isAppMessage(error.descriptor))
    return error.descriptor
  if (isAppMessage(error)) return error
  if (error instanceof Error) {
    if (error.name === 'QuotaExceededError')
      return message('workspace.errors.quota', fileError(error))
    if (['SecurityError', 'InvalidStateError', 'UnknownError'].includes(error.name))
      return message('workspace.errors.unavailable', fileError(error))
    return error.message
  }
  return message('workspace.errors.failed', fileError(error))
}

function isAppMessage(value: unknown): value is AppMessage {
  if (!value || typeof value !== 'object') return false
  const candidate = value as Record<string, unknown>
  return (
    typeof candidate.key === 'string' &&
    typeof candidate.fallback === 'string' &&
    !!candidate.params &&
    typeof candidate.params === 'object'
  )
}

export function downloadFile(file: FileInput) {
  // The download owns this URL independently of the originating component/job.
  const url = URL.createObjectURL(file.blob)
  try {
    const anchor = document.createElement('a')
    anchor.href = url
    anchor.download = safeFilename(file.name)
    anchor.click()
  } finally {
    // Do not revoke synchronously or cancel this cleanup when the view unmounts.
    // Scheduling in finally also covers DOM/click failures after URL creation.
    setTimeout(() => URL.revokeObjectURL(url), 1000)
  }
}
