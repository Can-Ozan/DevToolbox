import { parseColor, type Rgb } from './color'

export function contrastColor(input: string) {
  return parseColor(input, input.includes(',') || /^rgb/i.test(input) ? 'rgb' : 'hex')
}
// WCAG 2.2 relative luminance: https://www.w3.org/TR/WCAG22/#dfn-relative-luminance
export function relativeLuminance({ r, g, b }: Rgb) {
  const linear = [r, g, b].map((channel) => {
    const s = channel / 255
    return s <= 0.04045 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4
  })
  return linear[0] * 0.2126 + linear[1] * 0.7152 + linear[2] * 0.0722
}
export function contrastRatio(foreground: Rgb, background: Rgb) {
  const a = relativeLuminance(foreground)
  const b = relativeLuminance(background)
  return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05)
}
export function contrastChecks(ratio: number) {
  return [
    { label: 'AA normal text', minimum: 4.5 },
    { label: 'AA large text', minimum: 3 },
    { label: 'AAA normal text', minimum: 7 },
    { label: 'AAA large text', minimum: 4.5 },
  ].map((check) => ({ ...check, passes: ratio >= check.minimum }))
}
