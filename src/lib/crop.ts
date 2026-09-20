import { validateDimensions, type ImageDimensions } from './imageFiles'

export interface CropRect extends ImageDimensions {
  x: number
  y: number
}
const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value))
export function normalizeCrop(rect: CropRect, bounds: ImageDimensions, ratio?: number): CropRect {
  validateDimensions(bounds.width, bounds.height)
  if (
    !Object.values(rect).every(Number.isFinite) ||
    (ratio !== undefined && (!Number.isFinite(ratio) || ratio <= 0))
  )
    throw new Error('Enter finite crop coordinates and a positive aspect ratio.')
  const x = clamp(Math.round(rect.x), 0, bounds.width - 1)
  const y = clamp(Math.round(rect.y), 0, bounds.height - 1)
  let width = clamp(Math.round(rect.width), 1, bounds.width - x)
  let height = clamp(Math.round(rect.height), 1, bounds.height - y)
  if (ratio) {
    width = Math.min(width, Math.max(1, Math.floor((bounds.height - y) * ratio)))
    height = clamp(Math.round(width / ratio), 1, bounds.height - y)
  }
  return { x, y, width, height }
}
export function centeredCrop(bounds: ImageDimensions, ratio?: number) {
  const rect = normalizeCrop({ x: 0, y: 0, ...bounds }, bounds, ratio)
  return {
    ...rect,
    x: Math.floor((bounds.width - rect.width) / 2),
    y: Math.floor((bounds.height - rect.height) / 2),
  }
}
