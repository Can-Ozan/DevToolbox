export const bases = [
  { base: 2, name: 'Binary' },
  { base: 8, name: 'Octal' },
  { base: 10, name: 'Decimal' },
  { base: 16, name: 'Hexadecimal' },
] as const
export type NumberBase = (typeof bases)[number]['base']
export function convertNumberBase(
  input: string,
  base: NumberBase,
  uppercase = false,
): Record<NumberBase, string> {
  const text = input.trim()
  const patterns = { 2: /^[01]+$/, 8: /^[0-7]+$/, 10: /^\d+$/, 16: /^[\da-f]+$/i }
  const prefix = { 2: '0b', 8: '0o', 10: '', 16: '0x' }
  let digits = text.replace(/^[+-]/, '')
  if (base !== 10 && digits.toLowerCase().startsWith(prefix[base])) digits = digits.slice(2)
  if (!patterns[base].test(digits))
    throw new Error(
      `Enter a valid base-${base} integer. Fractions and exponents are not supported.`,
    )
  if (digits.length > 4096) throw new Error('Input is limited to 4,096 digits.')
  const value = BigInt(prefix[base] + digits) * (text.startsWith('-') ? -1n : 1n)
  const hex = value.toString(16)
  return {
    2: value.toString(2),
    8: value.toString(8),
    10: value.toString(10),
    16: uppercase ? hex.toUpperCase() : hex,
  }
}
