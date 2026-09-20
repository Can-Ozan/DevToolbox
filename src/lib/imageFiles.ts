import type { ReportStage } from './processing'
import { FILE_LIMITS, IMAGE_TYPES, validateFile } from '../workspace/workspaceUtils'

export interface ImageDimensions {
  width: number
  height: number
}
export type ImageFormat = 'image/png' | 'image/jpeg' | 'image/webp'
export interface ImageOptions extends ImageDimensions {
  crop?: ImageDimensions & { x: number; y: number }
  format: ImageFormat
  quality: number
  background: string
  rotation: number
  flipX: boolean
  flipY: boolean
}

export function validateDimensions(width: number, height: number) {
  if (!Number.isInteger(width) || !Number.isInteger(height) || width < 1 || height < 1)
    throw new Error('Width and height must be positive whole numbers.')
  if (
    width > FILE_LIMITS.imageDimension ||
    height > FILE_LIMITS.imageDimension ||
    width * height > FILE_LIMITS.imagePixels
  )
    throw new Error(
      `Images are limited to ${FILE_LIMITS.imageDimension} px per side and 16 megapixels.`,
    )
  return { width, height }
}

export function aspectResize(original: ImageDimensions, side: 'width' | 'height', value: number) {
  const other = side === 'width' ? 'height' : 'width'
  return validateDimensions(
    side === 'width' ? value : Math.max(1, Math.round((value * original[other]) / original[side])),
    side === 'height' ? value : Math.max(1, Math.round((value * original[other]) / original[side])),
  )
}

// Inspect dimensions before decoding so small compressed files cannot allocate giant bitmaps.
export function imageHeader(bytes: Uint8Array, mime: string): ImageDimensions {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength)
  const ascii = (start: number, length: number) =>
    String.fromCharCode(...bytes.slice(start, start + length))
  const invalid = () => {
    throw new Error('This image is damaged, unsupported, or does not match its file type.')
  }
  if (
    mime === 'image/png' &&
    bytes.length >= 24 &&
    bytes[0] === 137 &&
    ascii(1, 7) === 'PNG\r\n\x1a\n' &&
    ascii(12, 4) === 'IHDR'
  )
    return validateDimensions(view.getUint32(16), view.getUint32(20))
  if (mime === 'image/jpeg' && bytes[0] === 255 && bytes[1] === 216) {
    let offset = 2
    while (offset + 9 < bytes.length) {
      if (bytes[offset++] !== 255) return invalid()
      while (bytes[offset] === 255) offset++
      const marker = bytes[offset++]
      if (marker === 217 || marker === 218) break
      if (marker === 1 || (marker >= 208 && marker <= 215)) continue
      const length = view.getUint16(offset)
      if (length < 2 || offset + length > bytes.length) break
      if ([192, 193, 194, 195, 197, 198, 199, 201, 202, 203, 205, 206, 207].includes(marker))
        return validateDimensions(view.getUint16(offset + 5), view.getUint16(offset + 3))
      offset += length
    }
  }
  if (
    mime === 'image/webp' &&
    bytes.length >= 30 &&
    ascii(0, 4) === 'RIFF' &&
    ascii(8, 4) === 'WEBP'
  ) {
    const chunk = ascii(12, 4)
    if (chunk === 'VP8X') {
      if (bytes[20] & 2) throw new Error('Animated WebP is not supported. Choose a still image.')
      const uint24 = (offset: number) =>
        bytes[offset] + (bytes[offset + 1] << 8) + (bytes[offset + 2] << 16)
      return validateDimensions(uint24(24) + 1, uint24(27) + 1)
    }
    if (chunk === 'VP8 ' && bytes[23] === 157 && bytes[24] === 1 && bytes[25] === 42)
      return validateDimensions(view.getUint16(26, true) & 16383, view.getUint16(28, true) & 16383)
    if (chunk === 'VP8L' && bytes[20] === 47) {
      const bits = view.getUint32(21, true)
      return validateDimensions((bits & 16383) + 1, ((bits >>> 14) & 16383) + 1)
    }
  }
  return invalid()
}

export async function decodeImage(blob: Blob) {
  validateFile({ name: 'Image', blob }, IMAGE_TYPES)
  imageHeader(new Uint8Array(await blob.slice(0, 1024 * 1024).arrayBuffer()), blob.type)
  let bitmap: ImageBitmap
  try {
    bitmap = await createImageBitmap(blob)
  } catch {
    throw new Error(
      'The browser could not decode this image. Try a different PNG, JPEG, or WebP file.',
    )
  }
  try {
    validateDimensions(bitmap.width, bitmap.height)
  } catch (error) {
    bitmap.close()
    throw error
  }
  return bitmap
}

export async function imageDimensions(blob: Blob) {
  const image = await decodeImage(blob)
  try {
    return { width: image.width, height: image.height }
  } finally {
    image.close()
  }
}

export async function processImage(
  blob: Blob,
  options: ImageOptions,
  signal?: AbortSignal,
  report?: ReportStage,
): Promise<Blob> {
  report?.('validating')
  validateDimensions(options.width, options.height)
  if (
    !IMAGE_TYPES.includes(options.format) ||
    !Number.isFinite(options.quality) ||
    options.quality < 0.1 ||
    options.quality > 1 ||
    ![0, 90, 180, 270].includes(options.rotation) ||
    !/^#[\da-f]{6}$/i.test(options.background)
  )
    throw new Error('Invalid image output options.')
  report?.('reading')
  const bitmap = await decodeImage(blob)
  const canvas = document.createElement('canvas')
  try {
    signal?.throwIfAborted()
    const crop = options.crop ?? { x: 0, y: 0, width: bitmap.width, height: bitmap.height }
    if (
      !Object.values(crop).every(Number.isInteger) ||
      crop.x < 0 ||
      crop.y < 0 ||
      crop.width < 1 ||
      crop.height < 1 ||
      crop.x + crop.width > bitmap.width ||
      crop.y + crop.height > bitmap.height
    )
      throw new Error('Crop bounds must stay inside the image.')
    report?.('generating')
    const swap = options.rotation === 90 || options.rotation === 270
    canvas.width = swap ? options.height : options.width
    canvas.height = swap ? options.width : options.height
    const context = canvas.getContext('2d')
    if (!context) throw new Error('Canvas processing is unavailable in this browser.')
    if (options.format === 'image/jpeg') {
      context.fillStyle = options.background
      context.fillRect(0, 0, canvas.width, canvas.height)
    }
    context.translate(canvas.width / 2, canvas.height / 2)
    context.rotate((options.rotation * Math.PI) / 180)
    context.scale(options.flipX ? -1 : 1, options.flipY ? -1 : 1)
    context.drawImage(
      bitmap,
      crop.x,
      crop.y,
      crop.width,
      crop.height,
      -options.width / 2,
      -options.height / 2,
      options.width,
      options.height,
    )
    report?.('preparing')
    const result = await new Promise<Blob>((resolve, reject) =>
      canvas.toBlob(
        (output) => {
          if (!output || output.type !== options.format)
            reject(new Error('This browser cannot encode the selected format. Choose PNG or JPEG.'))
          else resolve(output)
        },
        options.format,
        options.quality,
      ),
    )
    signal?.throwIfAborted()
    return result
  } finally {
    bitmap.close()
    canvas.width = 0
    canvas.height = 0
  }
}
