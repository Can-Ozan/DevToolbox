import { afterEach, describe, expect, it, vi } from 'vitest'
import { PDFDocument } from 'pdf-lib'
import {
  aspectResize,
  imageHeader,
  processImage,
  validateDimensions,
  type ImageOptions,
} from './imageFiles'
import { parsePageSelection, processPdf } from './pdfFiles'

const pixel = Uint8Array.from(
  Buffer.from(
    'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jRZkAAAAASUVORK5CYII=',
    'base64',
  ),
)
afterEach(() => vi.unstubAllGlobals())

describe('image safety and sizing', () => {
  it('reads PNG dimensions before decoding and rejects spoofed types', () => {
    expect(imageHeader(pixel, 'image/png')).toEqual({ width: 1, height: 1 })
    expect(() => imageHeader(pixel, 'image/jpeg')).toThrow('damaged')
    expect(() => imageHeader(pixel, 'image/svg+xml')).toThrow('unsupported')
  })
  it('resizes either dimension with the original aspect ratio', () => {
    expect(aspectResize({ width: 1200, height: 800 }, 'width', 600)).toEqual({
      width: 600,
      height: 400,
    })
    expect(aspectResize({ width: 1200, height: 800 }, 'height', 200)).toEqual({
      width: 300,
      height: 200,
    })
  })
  it.each([
    [0, 10],
    [1.5, 10],
    [9000, 20],
    [5000, 5000],
    [NaN, 100],
  ])('rejects unsafe dimensions %s × %s', (width, height) => {
    expect(() => validateDimensions(width, height)).toThrow()
  })
  it.each(['image/png', 'image/jpeg'] as const)(
    'encodes %s, handles JPEG alpha background, and releases resources',
    async (format) => {
      const context = {
        fillStyle: '',
        fillRect: vi.fn(),
        translate: vi.fn(),
        rotate: vi.fn(),
        scale: vi.fn(),
        drawImage: vi.fn(),
      }
      const canvas = {
        width: 0,
        height: 0,
        getContext: () => context,
        toBlob: vi.fn((callback: BlobCallback, mime: string) =>
          callback(new Blob(['encoded'], { type: mime })),
        ),
      }
      const bitmap = { width: 1, height: 1, close: vi.fn() }
      vi.stubGlobal('createImageBitmap', vi.fn().mockResolvedValue(bitmap))
      vi.stubGlobal('document', { createElement: () => canvas })
      const options: ImageOptions = {
        width: 10,
        height: 20,
        format,
        quality: 0.8,
        background: '#ffffff',
        rotation: 90,
        flipX: true,
        flipY: false,
      }
      const blob = await processImage(new Blob([pixel], { type: 'image/png' }), options)
      expect(blob.type).toBe(format)
      expect(canvas.toBlob).toHaveBeenCalledWith(expect.any(Function), format, 0.8)
      expect(context.fillRect).toHaveBeenCalledTimes(format === 'image/jpeg' ? 1 : 0)
      expect(context.scale).toHaveBeenCalledWith(-1, 1)
      expect(context.drawImage).toHaveBeenCalledWith(bitmap, 0, 0, 1, 1, -5, -10, 10, 20)
      expect(bitmap.close).toHaveBeenCalledOnce()
      expect(canvas.width).toBe(0)
    },
  )
})

async function makePdf(widths: number[]) {
  const document = await PDFDocument.create()
  widths.forEach((width) => document.addPage([width, 200]))
  return new Blob([new Uint8Array(await document.save())], { type: 'application/pdf' })
}
async function widths(blob?: Blob) {
  if (!blob) throw new Error('Missing PDF output')
  return (await PDFDocument.load(await blob.arrayBuffer()))
    .getPages()
    .map((page) => page.getWidth())
}

describe('local PDF processing', () => {
  it('merges documents with correct page counts and order', async () => {
    const result = await processPdf({
      operation: 'merge',
      files: [await makePdf([100, 200]), await makePdf([300])],
    })
    expect(result.pageCount).toBe(3)
    expect(await widths(result.blob)).toEqual([100, 200, 300])
  })
  it('extracts ranges and reorders/removes pages', async () => {
    const file = await makePdf([100, 200, 300, 400])
    expect(
      await widths(
        (await processPdf({ operation: 'extract', files: [file], pages: '1-2,4' })).blob,
      ),
    ).toEqual([100, 200, 400])
    expect(
      await widths((await processPdf({ operation: 'reorder', files: [file], pages: '3,1' })).blob),
    ).toEqual([300, 100])
  })
  it.each(['', '0', '1-6', '3-1', '1,1', '1,,2', 'x', 'Infinity'])(
    'rejects invalid page selection %s',
    (value) => {
      expect(() => parsePageSelection(value, 5)).toThrow()
    },
  )
  it('rejects range syntax in numeric reorder mode', () => {
    expect(() => parsePageSelection('1-3', 5, false)).toThrow('comma-separated')
  })
  it('creates an A4 landscape page per image with validated margins', async () => {
    const file = new Blob([pixel], { type: 'image/png' })
    const result = await processPdf({
      operation: 'images',
      files: [file, file],
      orientation: 'landscape',
      fit: 'cover',
      margin: 24,
    })
    expect(result.pageCount).toBe(2)
    expect((await widths(result.blob))[0]).toBeCloseTo(841.89, 1)
    await expect(processPdf({ operation: 'images', files: [file], margin: 1000 })).rejects.toThrow(
      'Margins',
    )
  })
  it('handles corrupted or wrongly typed inputs', async () => {
    await expect(
      processPdf({
        operation: 'inspect',
        files: [new Blob(['broken'], { type: 'application/pdf' })],
      }),
    ).rejects.toThrow('valid PDF')
    await expect(
      processPdf({ operation: 'inspect', files: [new Blob(['x'], { type: 'text/plain' })] }),
    ).rejects.toThrow('Unsupported')
  })
})
