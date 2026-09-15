export interface Rgb {
  r: number
  g: number
  b: number
}
export type ColorFormat = 'hex' | 'rgb' | 'hsl'
const inRange = (value: number, max: number) => Number.isFinite(value) && value >= 0 && value <= max
export function parseColor(value: string, format: ColorFormat): Rgb {
  if (format === 'hex') {
    let hex = value.trim().replace(/^#/, '')
    if (!/^([a-f\d]{3}|[a-f\d]{6})$/i.test(hex))
      throw new Error('HEX needs 3 or 6 hexadecimal digits, for example #7760D7.')
    if (hex.length === 3) hex = [...hex].map((char) => char + char).join('')
    return {
      r: parseInt(hex.slice(0, 2), 16),
      g: parseInt(hex.slice(2, 4), 16),
      b: parseInt(hex.slice(4, 6), 16),
    }
  }
  if (format === 'rgb') {
    const match = value
      .trim()
      .match(
        /^(?:rgb\(\s*)?(\d+(?:\.\d+)?)\s*,\s*(\d+(?:\.\d+)?)\s*,\s*(\d+(?:\.\d+)?)(?:\s*\))?$/i,
      )
    if (!match || value.includes('(') !== value.includes(')'))
      throw new Error('Use RGB values such as rgb(119, 96, 215).')
    const [r, g, b] = match.slice(1).map(Number)
    if (![r, g, b].every((number) => inRange(number, 255)))
      throw new Error('Each RGB channel must be between 0 and 255.')
    return { r: Math.round(r), g: Math.round(g), b: Math.round(b) }
  }
  const match = value
    .trim()
    .match(
      /^(?:hsl\(\s*)?(\d+(?:\.\d+)?)\s*,\s*(\d+(?:\.\d+)?)%\s*,\s*(\d+(?:\.\d+)?)%(?:\s*\))?$/i,
    )
  if (!match || value.includes('(') !== value.includes(')'))
    throw new Error('Use HSL values such as hsl(252, 60%, 61%).')
  const [h, saturation, lightness] = match.slice(1).map(Number)
  if (!inRange(h, 360) || !inRange(saturation, 100) || !inRange(lightness, 100))
    throw new Error('Hue must be 0–360; saturation and lightness must be 0–100%.')
  const s = saturation / 100
  const l = lightness / 100
  const a = s * Math.min(l, 1 - l)
  const f = (n: number) => {
    const k = (n + h / 30) % 12
    return Math.round(255 * (l - a * Math.max(-1, Math.min(k - 3, 9 - k, 1))))
  }
  return { r: f(0), g: f(8), b: f(4) }
}
export function formatColor({ r, g, b }: Rgb): Record<ColorFormat, string> {
  const channels = [r, g, b].map((value) => value / 255)
  const max = Math.max(...channels)
  const min = Math.min(...channels)
  const d = max - min
  const l = (max + min) / 2
  let h = 0
  if (d) {
    if (max === channels[0])
      h = ((channels[1] - channels[2]) / d + (channels[1] < channels[2] ? 6 : 0)) * 60
    else if (max === channels[1]) h = ((channels[2] - channels[0]) / d + 2) * 60
    else h = ((channels[0] - channels[1]) / d + 4) * 60
  }
  const s = d === 0 ? 0 : d / (1 - Math.abs(2 * l - 1))
  const round = (n: number) => Math.round(n * 10) / 10
  return {
    hex: `#${[r, g, b]
      .map((n) => n.toString(16).padStart(2, '0'))
      .join('')
      .toUpperCase()}`,
    rgb: `rgb(${r}, ${g}, ${b})`,
    hsl: `hsl(${round(h)}, ${round(s * 100)}%, ${round(l * 100)}%)`,
  }
}
