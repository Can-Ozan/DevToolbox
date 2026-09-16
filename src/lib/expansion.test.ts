import { describe, expect, it } from 'vitest'
import { convertJsonYaml } from './jsonYaml'
import { convertCases } from './caseConverter'
import { convertNumberBase } from './numberBase'
import { contrastColor, contrastRatio, contrastChecks } from './contrast'
import { parseUrl } from './urlParser'
import { buildCron, cronValues, cronPresets, describeCron } from './cron'

describe('JSON/YAML conversion', () => {
  it('round-trips nested objects, arrays, booleans, null, and Unicode', () => {
    const value = {
      text: '👋 世界 İstanbul',
      nested: { list: [true, false, null, 42, { label: 'é' }] },
    }
    expect(
      JSON.parse(convertJsonYaml(convertJsonYaml(JSON.stringify(value), 'json-yaml'), 'yaml-json')),
    ).toEqual(value)
  })
  it.each(['null', 'true', '42', '"世界"', '[]'])(
    'round-trips JSON scalar or collection %s',
    (input) =>
      expect(JSON.parse(convertJsonYaml(convertJsonYaml(input, 'json-yaml'), 'yaml-json'))).toEqual(
        JSON.parse(input),
      ),
  )
  it.each([
    'a: [broken',
    'a: 1\na: 2',
    'a: .inf',
    'a: 9007199254740993',
    '&loop [*loop]',
    '1: value',
    'x: !custom value',
  ])('rejects unsafe or incompatible YAML: %s', (input) =>
    expect(() => convertJsonYaml(input, 'yaml-json')).toThrow(),
  )
  it('expands ordinary aliases and rejects malformed JSON', () => {
    expect(JSON.parse(convertJsonYaml('a: &item [true, null]\nb: *item', 'yaml-json'))).toEqual({
      a: [true, null],
      b: [true, null],
    })
    expect(() => convertJsonYaml('{broken', 'json-yaml')).toThrow()
  })
})
describe('case conversion', () => {
  it.each(['helloWorld', 'hello_world', 'hello-world', 'Hello World'])(
    'splits words consistently from %s',
    (input) => {
      const result = convertCases(input)
      expect(result.camelCase).toBe('helloWorld')
      expect(result.snake_case).toBe('hello_world')
      expect(result['kebab-case']).toBe('hello-world')
    },
  )
  it('handles acronyms, Unicode and sentence boundaries', () => {
    expect(convertCases('HTTPServer').snake_case).toBe('http_server')
    expect(convertCases('déjà-vu 世界').PascalCase).toBe('DéjàVu世界')
    expect(convertCases('HELLO. WORLD!')['Sentence case']).toBe('Hello. World!')
    expect(convertCases('').camelCase).toBe('')
  })
})
describe('integer base conversion', () => {
  it('converts binary, octal, decimal, and hexadecimal both ways', () => {
    expect(convertNumberBase('11111111', 2)[10]).toBe('255')
    expect(convertNumberBase('255', 10)).toEqual({ 2: '11111111', 8: '377', 10: '255', 16: 'ff' })
    expect(convertNumberBase('0xFF', 16)[10]).toBe('255')
    expect(convertNumberBase('-0b101', 2)[10]).toBe('-5')
  })
  it('preserves integers far beyond Number.MAX_SAFE_INTEGER', () => {
    const value = '12345678901234567890123456789012345678901234567890'
    const hex = convertNumberBase(value, 10, true)[16]
    expect(convertNumberBase(hex, 16)[10]).toBe(value)
  })
  it.each(['12', '1.5', '1e3', '0xFF', '-', ''])('rejects invalid binary %s', (value) =>
    expect(() => convertNumberBase(value, 2)).toThrow(),
  )
})
describe('WCAG contrast', () => {
  it('matches known ratios and symmetric ordering', () => {
    const black = contrastColor('#000')
    const white = contrastColor('rgb(255, 255, 255)')
    expect(contrastRatio(black, white)).toBe(21)
    expect(contrastRatio(white, black)).toBe(21)
    expect(contrastRatio(black, black)).toBe(1)
    expect(contrastRatio(contrastColor('#777777'), white)).toBeCloseTo(4.478089, 5)
  })
  it('uses unrounded AA and AAA thresholds', () => {
    expect(contrastChecks(4.499).map((c) => c.passes)).toEqual([false, true, false, false])
    expect(contrastChecks(7).every((c) => c.passes)).toBe(true)
  })
})
describe('URL parser', () => {
  it('preserves query duplicates, port, and fragment while redacting credentials', () => {
    const parsed = parseUrl(
      'https://alice:secret@example.com:8080/docs?tag=one&tag=two&q=hello+world&token=secret#intro',
    )
    expect(parsed).toMatchObject({
      protocol: 'https:',
      username: 'alice',
      passwordPresent: true,
      host: 'example.com:8080',
      hostname: 'example.com',
      port: '8080',
      pathname: '/docs',
      fragment: '#intro',
      origin: 'https://example.com:8080',
    })
    expect(parsed.queryParameters).toEqual([
      { key: 'tag', value: 'one' },
      { key: 'tag', value: 'two' },
      { key: 'q', value: 'hello world' },
      { key: 'token', value: '[redacted]' },
    ])
    expect(JSON.stringify(parsed)).not.toContain('secret')
  })
  it('uses native default-port normalization and rejects relative URLs', () => {
    expect(parseUrl('https://example.com:443').port).toBe('')
    expect(() => parseUrl('/docs')).toThrow()
  })
})
describe('cron builder', () => {
  it.each([
    ['Every minute', '* * * * *'],
    ['Every 5 minutes', '*/5 * * * *'],
    ['Every hour', '0 * * * *'],
    ['Every day', '0 9 * * *'],
    ['Every weekday', '0 9 * * 1-5'],
    ['Every week', '0 9 * * 0'],
    ['Every month', '0 9 1 * *'],
  ])('provides the %s preset', (label, expression) => {
    expect(cronPresets.find((p) => p.label === label)?.expression).toBe(expression)
    expect(buildCron(cronValues(expression))).toBe(expression)
  })
  it('describes daily and interval schedules', () => {
    expect(describeCron('0 9 * * *')).toBe('Every day at 09:00')
    expect(describeCron('*/15 * * * *')).toBe('Every 15 minutes')
  })
  it.each([
    '60 * * * *',
    '*/0 * * * *',
    '0 24 * * *',
    '0 9 0 * *',
    '0 9 * 13 *',
    '0 9 * * 5-1',
    '0 9 * * bogus',
  ])('rejects invalid fields: %s', (expression) =>
    expect(() => buildCron(cronValues(expression))).toThrow(),
  )
})
