import type { FileInput } from '../../workspace/workspaceTypes'
import type { ArchiveEntry } from '../../lib/archiveTypes'
import { IMAGE_TYPES, fileError, validateFile } from '../../workspace/workspaceUtils'
import { readJsonFile } from '../../lib/jsonFile'

export interface Inspection {
  mimeType: string
  detection: string
  details: [string, string][]
  warning?: string
  valid: boolean
  excludedTools: string[]
}

// Binary signatures take precedence over extension/MIME hints. Unknown formats
// are never rendered or executed; JSON hints are confirmed by a bounded parse.
export function detectFileType(bytes: Uint8Array, file: FileInput) {
  const ascii = (offset: number, length: number) =>
    String.fromCharCode(...bytes.slice(offset, offset + length))
  if (bytes[0] === 137 && ascii(1, 7) === 'PNG\r\n\x1a\n') return 'image/png'
  if (bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255) return 'image/jpeg'
  if (ascii(0, 4) === 'RIFF' && ascii(8, 4) === 'WEBP') return 'image/webp'
  if (ascii(0, 1024).includes('%PDF-')) return 'application/pdf'
  if (
    ascii(0, 2) === 'PK' &&
    ((bytes[2] === 3 && bytes[3] === 4) || (bytes[2] === 5 && bytes[3] === 6))
  )
    return 'application/zip'
  if (file.blob.type === 'application/json' || /\.json$/i.test(file.name)) return 'application/json'
  return undefined
}

export async function inspectFile(file: FileInput, signal: AbortSignal): Promise<Inspection> {
  validateFile(file)
  signal.throwIfAborted()
  const bytes = new Uint8Array(await file.blob.slice(0, 1024).arrayBuffer())
  signal.throwIfAborted()
  const detected = detectFileType(bytes, file)
  const result: Inspection = {
    mimeType: detected ?? (file.blob.type || 'application/octet-stream'),
    detection:
      detected === 'application/json'
        ? 'JSON filename/MIME hint; validated below'
        : detected
          ? 'Binary file signature; validated below'
          : 'Reported type only; unsupported format',
    details: [],
    valid: false,
    excludedTools: [],
  }
  if (!detected) {
    result.warning =
      'Metadata only. This format is not inspected; no tools are recommended without validation.'
    return result
  }
  const normalized = { ...file, blob: file.blob.slice(0, file.blob.size, detected) }
  try {
    if (IMAGE_TYPES.includes(detected)) {
      const { imageDimensions } = await import('../../lib/imageFiles')
      signal.throwIfAborted()
      const { width, height } = await imageDimensions(normalized.blob)
      result.details.push(
        ['Dimensions', `${width} × ${height} px`],
        ['Aspect ratio', `${(width / height).toFixed(3)}:1`],
      )
    } else if (detected === 'application/pdf') {
      const { inspectPdf } = await import('../pdf-to-images/pdfRenderer')
      result.details.push(['Pages', String(await inspectPdf(normalized, signal))])
    } else if (detected === 'application/zip') {
      const { runArchive } = await import('../zip/archiveClient')
      const entries = await runArchive<ArchiveEntry[]>({ action: 'list', file: normalized }, signal)
      result.details.push(
        ['ZIP entries', String(entries.length)],
        ['Files', String(entries.filter((entry) => !entry.directory).length)],
      )
    } else {
      const text = await readJsonFile(file, signal)
      const value: unknown = JSON.parse(text)
      const shape = value === null ? 'null' : Array.isArray(value) ? 'array' : typeof value
      result.details.push(['JSON structure', shape])
      if (typeof value === 'object' && value !== null)
        result.details.push(['Top-level entries', String(Object.keys(value).length)])
      // Use the converters' own safety rules rather than promising incompatible handoffs.
      const { jsonToCsv } = await import('../../lib/jsonCsv')
      try {
        jsonToCsv(text)
      } catch {
        result.excludedTools.push('json-csv')
      }
      const { convertJsonYaml } = await import('../../lib/jsonYaml')
      try {
        convertJsonYaml(text, 'json-yaml')
      } catch {
        result.excludedTools.push('json-yaml')
      }
    }
    signal.throwIfAborted()
    result.valid = true
  } catch (error) {
    signal.throwIfAborted()
    result.warning = `Inspection could not validate this file: ${fileError(error)}`
  }
  return result
}
