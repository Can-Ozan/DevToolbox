import { messageError } from '../i18n/messages'
import type { FileInput } from '../workspace/workspaceTypes'

export const JSON_FILE_LIMIT = 800_000
export const JSON_CHARACTER_LIMIT = 200_000
export async function readJsonFile(file: FileInput, signal: AbortSignal) {
  if (file.blob.size > JSON_FILE_LIMIT)
    throw messageError(
      'toolErrors.jsonFile',
      'JSON files are limited to 800 KB and 200,000 characters.',
    )
  signal.throwIfAborted()
  const text = (await file.blob.text()).replace(/^\uFEFF/, '')
  signal.throwIfAborted()
  if (text.length > JSON_CHARACTER_LIMIT)
    throw messageError('toolErrors.jsonInput', 'JSON input is limited to 200,000 characters.')
  return text
}
