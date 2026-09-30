import { afterEach, expect, it, vi } from 'vitest'
import { detectFileType, inspectFile } from './inspection'
import { inspectionTools } from '../../registry/discovery'
import { JSON_FILE_LIMIT, readJsonFile } from '../../lib/jsonFile'
const file = (text: string, name = 'data.json', type = 'application/json') => ({
  name,
  blob: new Blob([text], { type }),
})
const signal = () => new AbortController().signal
afterEach(() => vi.unstubAllGlobals())

it('detects signatures before misleading MIME or extensions', () => {
  expect(detectFileType(new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10]), file('{}'))).toBe(
    'image/png',
  )
  expect(detectFileType(new Uint8Array([255, 216, 255]), file('{}'))).toBe('image/jpeg')
  expect(detectFileType(new TextEncoder().encode('RIFFxxxxWEBP'), file('{}'))).toBe('image/webp')
  expect(detectFileType(new TextEncoder().encode('%PDF-1.7'), file('{}'))).toBe('application/pdf')
  expect(detectFileType(new Uint8Array([80, 75, 5, 6]), file('{}'))).toBe('application/zip')
})
it.each([
  ['{}', 'object', '0'],
  ['[1,2]', 'array', '2'],
  ['null', 'null', undefined],
  ['true', 'boolean', undefined],
])('inspects JSON shape %s', async (text, shape, count) => {
  const result = await inspectFile(file(text), signal())
  expect(result.valid).toBe(true)
  expect(result.details).toContainEqual(['JSON structure', shape])
  if (count) expect(result.details).toContainEqual(['Top-level entries', count])
})
it('only recommends conversions that accept the JSON shape and limits', async () => {
  const flat = await inspectFile(file('[{"name":"世界"}]'), signal())
  expect(inspectionTools('data.json', flat).map(({ tool }) => tool.id)).toEqual([
    'json',
    'json-yaml',
    'json-csv',
  ])
  const nested = await inspectFile(file('[{"nested":{}}]'), signal())
  expect(inspectionTools('data.json', nested).map(({ tool }) => tool.id)).toEqual([
    'json',
    'json-yaml',
  ])
  const unsafe = await inspectFile(file('{"number":1e300}'), signal())
  expect(inspectionTools('data.json', unsafe).map(({ tool }) => tool.id)).toEqual(['json'])
})
it('keeps malformed and unsupported files as metadata without unsafe recommendations', async () => {
  for (const input of [
    file('{bad'),
    file('<svg onload="evil()"/>', 'attack.svg', 'image/svg+xml'),
  ]) {
    const result = await inspectFile(input, signal())
    expect(result.valid).toBe(false)
    expect(result.warning).toBeTruthy()
    expect(inspectionTools(input.name, result)).toEqual([])
  }
})
it('bounds JSON reading and handles BOM/Unicode without losing content', async () => {
  expect(await readJsonFile(file('\uFEFF{"hello":"世界😀"}'), signal())).toBe('{"hello":"世界😀"}')
  await expect(readJsonFile(file(' '.repeat(JSON_FILE_LIMIT + 1)), signal())).rejects.toThrow(
    '800 KB',
  )
  await expect(readJsonFile(file(' '.repeat(200_001)), signal())).rejects.toThrow('200,000')
})
it('honors cancellation before and after reading', async () => {
  const controller = new AbortController()
  controller.abort()
  await expect(inspectFile(file('{}'), controller.signal)).rejects.toThrow()
  const pending = new AbortController()
  const blob = new Blob(['{}'])
  vi.spyOn(blob, 'text').mockImplementation(async () => {
    pending.abort()
    return '{}'
  })
  await expect(readJsonFile({ name: 'a.json', blob }, pending.signal)).rejects.toThrow()
})
it('closes the decoded bitmap and does not create preview URLs', async () => {
  const bytes = new Uint8Array(24)
  bytes.set([137, 80, 78, 71, 13, 10, 26, 10], 0)
  bytes.set(new TextEncoder().encode('IHDR'), 12)
  const view = new DataView(bytes.buffer)
  view.setUint32(16, 20)
  view.setUint32(20, 10)
  const close = vi.fn()
  vi.stubGlobal('createImageBitmap', async () => ({ width: 20, height: 10, close }))
  const result = await inspectFile(
    { name: 'wrong.json', blob: new Blob([bytes], { type: 'application/json' }) },
    signal(),
  )
  expect(result.valid).toBe(true)
  expect(result.details).toContainEqual(['Dimensions', '20 × 10 px'])
  expect(close).toHaveBeenCalledOnce()
})
