function requireCrypto() {
  if (!globalThis.crypto?.getRandomValues)
    throw new Error(
      'Secure randomness is unavailable. Open this app on HTTPS or localhost in a modern browser.',
    )
  return globalThis.crypto
}
export function randomInt(max: number) {
  if (!Number.isInteger(max) || max < 1 || max > 0x100000000)
    throw new Error('Invalid random range.')
  const crypto = requireCrypto()
  const limit = Math.floor(0x100000000 / max) * max
  const values = new Uint32Array(1)
  do {
    crypto.getRandomValues(values)
  } while (values[0] >= limit)
  return values[0] % max
}
export function generateUuid() {
  const crypto = requireCrypto()
  if (crypto.randomUUID) return crypto.randomUUID()
  const bytes = crypto.getRandomValues(new Uint8Array(16))
  bytes[6] = (bytes[6] & 0x0f) | 0x40
  bytes[8] = (bytes[8] & 0x3f) | 0x80
  const hex = Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('')
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`
}
export interface PasswordOptions {
  uppercase: boolean
  lowercase: boolean
  numbers: boolean
  symbols: boolean
  excludeAmbiguous: boolean
}
export const defaultPasswordOptions: PasswordOptions = {
  uppercase: true,
  lowercase: true,
  numbers: true,
  symbols: true,
  excludeAmbiguous: false,
}
export function passwordPools(options: PasswordOptions) {
  const groups = {
    uppercase: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ',
    lowercase: 'abcdefghijklmnopqrstuvwxyz',
    numbers: '0123456789',
    symbols: '!@#$%^&*()-_=+[]{};:,.?/',
  }
  return (Object.keys(groups) as (keyof typeof groups)[])
    .filter((key) => options[key])
    .map((key) => (options.excludeAmbiguous ? groups[key].replace(/[O0Il1|]/g, '') : groups[key]))
}
export function generatePassword(length: number, options: PasswordOptions) {
  if (!Number.isInteger(length) || length < 8 || length > 128)
    throw new Error('Choose a password length between 8 and 128.')
  const pools = passwordPools(options)
  if (!pools.length) throw new Error('Select at least one character type.')
  const all = pools.join('')
  // Condition uniform random candidates on containing every selected character type.
  for (;;) {
    const password = Array.from({ length }, () => all[randomInt(all.length)]).join('')
    if (pools.every((pool) => [...password].some((char) => pool.includes(char)))) return password
  }
}
