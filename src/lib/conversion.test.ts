import { describe, expect, it } from 'vitest'
import { csvToJson, jsonToCsv, parseCsv, type Delimiter } from './jsonCsv'
import { centeredCrop, normalizeCrop } from './crop'
import { parsePageSelection } from './pdfPages'
import { nextTools } from '../registry/discovery'
import { tools } from '../registry/tools'

describe('tabular JSON and CSV', () => {
  it('infers first-seen columns and keeps missing/null fields empty', () => {
    expect(
      jsonToCsv('[{"name":"Can","age":20},{"name":"Ali","active":true},{"name":null}]'),
    ).toEqual({ output: 'name,age,active\r\nCan,20,\r\nAli,,true\r\n,,', rows: 3, columns: 3 })
  })
  it.each<Delimiter>([',', ';', '\t'])(
    'round trips quoted, escaped, multiline and Unicode cells with %j',
    (delimiter) => {
      const rows = [{ name: 'Can, "Ozan";\t🌍', notes: 'one\r\ntwo\nthree', spaces: ' padded ' }]
      expect(
        JSON.parse(csvToJson(jsonToCsv(JSON.stringify(rows), delimiter).output, delimiter).output),
      ).toEqual(rows)
    },
  )
  it('strips BOM and skips physical blank lines while retaining quoted empty records', () => {
    expect(csvToJson('\uFEFFname\r\n\r\nCan\r\n""\r\n').output).toBe(
      '[\n  {\n    "name": "Can"\n  },\n  {\n    "name": ""\n  }\n]',
    )
  })
  it('retains values as strings, including zeros and formulas', () => {
    expect(JSON.parse(csvToJson('code,number,formula\n001,1e9,=1+2').output)).toEqual([
      { code: '001', number: '1e9', formula: '=1+2' },
    ])
  })
  it('preserves dangerous-looking keys without changing object prototypes', () => {
    const result = csvToJson('__proto__,constructor\nsafe,value')
    expect(jsonToCsv(result.output).output).toBe('__proto__,constructor\r\nsafe,value')
    expect(Object.getPrototypeOf(JSON.parse(result.output)[0])).toBe(Object.prototype)
  })
  it('supports headers without data rows', () =>
    expect(csvToJson('a,b')).toEqual({ output: '[]', rows: 0, columns: 2 }))
  it.each([
    '',
    '[]',
    '{}',
    '[null]',
    '[1]',
    '[[]]',
    '[{}]',
    '[{"":1}]',
    '[{"x":{}}]',
    '[{"x":[]}]',
    '[{"x":1e400}]',
    '{broken',
  ])('rejects unsupported JSON %j', (input) => expect(() => jsonToCsv(input)).toThrow())
  it.each([
    '',
    '\n\n',
    'a,a\n1,2',
    ',b\n1,2',
    'a,b\n1',
    'a\n1,2',
    'a\n"missing',
    'a\na"b',
    'a\n"quoted" suffix',
  ])('rejects malformed CSV %j', (input) => expect(() => csvToJson(input)).toThrow())
  it('bounds input, column count and row count', () => {
    expect(() => parseCsv('a'.repeat(200_001))).toThrow(/200,000/)
    expect(() => parseCsv(Array.from({ length: 201 }, (_, i) => `c${i}`).join(','))).toThrow(
      /200 columns/,
    )
    expect(() => parseCsv('a\n' + 'x\n'.repeat(10_001))).toThrow(/10,000/)
  })
})
describe('crop geometry', () => {
  const bounds = { width: 400, height: 300 }
  it('clamps coordinates, negative sizes and oversized selections', () => {
    expect(normalizeCrop({ x: -20, y: 290.7, width: 500, height: -10 }, bounds)).toEqual({
      x: 0,
      y: 291,
      width: 400,
      height: 1,
    })
    expect(normalizeCrop({ x: 800, y: 500, width: 30, height: 30 }, bounds)).toEqual({
      x: 399,
      y: 299,
      width: 1,
      height: 1,
    })
  })
  it.each([1, 4 / 3, 16 / 9, 3 / 2])(
    'centers a maximal %f aspect selection within bounds',
    (ratio) => {
      const crop = centeredCrop(bounds, ratio)
      expect(crop.x).toBeGreaterThanOrEqual(0)
      expect(crop.y).toBeGreaterThanOrEqual(0)
      expect(crop.x + crop.width).toBeLessThanOrEqual(bounds.width)
      expect(crop.y + crop.height).toBeLessThanOrEqual(bounds.height)
      expect(Math.abs(crop.height - crop.width / ratio)).toBeLessThanOrEqual(0.5)
    },
  )
  it('resizes a ratio-locked rectangle to fit the remaining height', () =>
    expect(normalizeCrop({ x: 50, y: 200, width: 300, height: 20 }, bounds, 1)).toEqual({
      x: 50,
      y: 200,
      width: 100,
      height: 100,
    }))
  it('resets free crop to the entire input', () =>
    expect(centeredCrop(bounds)).toEqual({ ...bounds, x: 0, y: 0 }))
  it.each([NaN, Infinity, -Infinity])('rejects non-finite coordinates %s', (value) =>
    expect(() => normalizeCrop({ x: value, y: 0, width: 100, height: 100 }, bounds)).toThrow(),
  )
  it('rejects unsafe source dimensions and invalid ratios', () => {
    expect(() => centeredCrop({ width: 10000, height: 10 })).toThrow()
    expect(() => normalizeCrop({ x: 0, y: 0, ...bounds }, bounds, 0)).toThrow()
  })
})
describe('PDF rendering selections and registry integration', () => {
  it.each([
    ['1', [0]],
    ['1-3', [0, 1, 2]],
    ['1,3,5', [0, 2, 4]],
  ])('parses %s', (input, expected) =>
    expect(parsePageSelection(input as string, 5)).toEqual(expected),
  )
  it.each(['0', '6', '3-1', '1,1', '1-3,2', '1-', '-1', '', '1,,2'])(
    'rejects invalid range %j',
    (input) => expect(() => parsePageSelection(input, 5)).toThrow(),
  )
  it('has 32 tools and connects PDF images to every compatible image tool', () => {
    expect(tools).toHaveLength(32)
    expect(nextTools('pdf-to-images', 'image/png').map((tool) => tool.id)).toEqual(
      expect.arrayContaining([
        'image-cropper',
        'image-compressor',
        'image-resizer',
        'image-converter',
        'image-metadata',
        'image-rotate',
      ]),
    )
    expect(nextTools('image-cropper', 'image/webp').map((tool) => tool.id)).toContain(
      'images-to-pdf',
    )
  })
})
