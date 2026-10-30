import { messageError } from '../i18n/messages'
import { MessageError, message, type DisplayMessage } from '../i18n/messages'

export function errorDescriptor(error: unknown): DisplayMessage {
  return error instanceof MessageError
    ? error.descriptor
    : typeof error === 'string'
      ? error
      : error instanceof Error
        ? error.message
        : message('toolErrors.generic', errorMessage(error))
}

export function encodeBase64(value: string): string {
  const bytes = new TextEncoder().encode(value)
  let binary = ''
  for (let i = 0; i < bytes.length; i += 8192)
    binary += String.fromCharCode(...bytes.subarray(i, i + 8192))
  return btoa(binary)
}
export function decodeBase64(value: string): string {
  const clean = value.replace(/\s/g, '')
  if (!/^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}(?:==)?|[A-Za-z0-9+/]{3}=?)?$/.test(clean))
    throw messageError(
      'toolErrors.base64Invalid',
      'Invalid Base64. Use letters, numbers, + and / with valid padding.',
    )
  try {
    const bytes = Uint8Array.from(atob(clean), (char) => char.charCodeAt(0))
    // Preserve a leading U+FEFF as text instead of consuming it as a byte-order mark.
    return new TextDecoder('utf-8', { fatal: true, ignoreBOM: true }).decode(bytes)
  } catch {
    throw messageError(
      'toolErrors.base64Utf8',
      'This value is not valid Base64-encoded UTF-8 text.',
    )
  }
}
function decodeSegment(segment: string): unknown {
  if (!/^[A-Za-z0-9_-]+$/.test(segment))
    throw messageError('toolErrors.jwtCharacters', 'JWT sections must use Base64URL characters.')
  return JSON.parse(decodeBase64(segment.replace(/-/g, '+').replace(/_/g, '/'))) as unknown
}
function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === 'object' && !Array.isArray(value)
}
export function decodeJwt(token: string) {
  const parts = token.trim().split('.')
  if (parts.length !== 3 || !parts[0] || !parts[1] || !/^[A-Za-z0-9_-]*$/.test(parts[2]))
    throw messageError(
      'toolErrors.jwtSections',
      'Expected a JWT with three dot-separated sections: header.payload.signature.',
    )
  try {
    const header = decodeSegment(parts[0])
    const payload = decodeSegment(parts[1])
    if (!isRecord(header) || !isRecord(payload))
      throw messageError('toolErrors.jwtObjects', 'Header and payload must be JSON objects.')
    return { header, payload, signature: parts[2] }
  } catch (error) {
    throw new MessageError(
      message('toolErrors.jwtDecode', 'Cannot decode token: {{reason}}', {
        reason: errorDescriptor(error),
      }),
      { cause: error },
    )
  }
}
export function errorMessage(error: unknown): string {
  return error instanceof Error
    ? error.message
    : 'Something went wrong. Check your input and try again.'
}
