import { describe, expect, it } from 'vitest'
import { decodeBase64, decodeJwt, encodeBase64 } from './encoding'
import { defaultPasswordOptions, generatePassword, generateUuid } from './random'
import { formatColor, parseColor } from './color'
import { dateDetails, parseTimestamp } from './timestamp'
import { generateLorem } from './lorem'
import { matchRegex } from './regex'
import { compareText } from './diff'
import { parsePreferences } from '../storage/preferences'

describe('Base64 and JWT', () => {
  it('preserves a leading Unicode BOM character when round-tripping text', () => {
    const text = '\uFEFFMerhaba 👋 世界'
    expect(decodeBase64(encodeBase64(text))).toBe(text)
  })
  it.each(['Hello world', 'Merhaba 👋 İstanbul 世界', '', 'a'.repeat(100000)])(
    'round-trips UTF-8 (%#. test)',
    (text) => expect(decodeBase64(encodeBase64(text))).toBe(text),
  )
  it.each(['%', 'a', 'abcd===', 'ab=c', '/w=='])(
    'rejects invalid or non UTF-8 Base64 %s',
    (value) => expect(() => decodeBase64(value)).toThrow(),
  )
  it('accepts valid unpadded Base64', () => expect(decodeBase64('SGk')).toBe('Hi'))
  it('decodes JWT JSON without trusting the signature', () => {
    const encode = (value: unknown) =>
      encodeBase64(JSON.stringify(value)).replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_')
    const token = `${encode({ alg: 'none' })}.${encode({ sub: '世界', exp: 1700000000 })}.`
    expect(decodeJwt(token)).toEqual({
      header: { alg: 'none' },
      payload: { sub: '世界', exp: 1700000000 },
      signature: '',
    })
  })
  it.each(['no-token', 'a.b.c', 'W10.e30.', 'e30.e30.illegal+'])(
    'rejects malformed JWT %s',
    (token) => expect(() => decodeJwt(token)).toThrow(),
  )
})
describe('secure generators', () => {
  it('generates unique RFC v4 UUIDs', () => {
    const values = Array.from({ length: 100 }, generateUuid)
    expect(new Set(values).size).toBe(100)
    values.forEach((value) =>
      expect(value).toMatch(/^[a-f\d]{8}-[a-f\d]{4}-4[a-f\d]{3}-[89ab][a-f\d]{3}-[a-f\d]{12}$/),
    )
  })
  it.each([8, 20, 128])(
    'guarantees requested password length and selected character classes %s',
    (length) => {
      const value = generatePassword(length, defaultPasswordOptions)
      expect(value).toHaveLength(length)
      expect(value).toMatch(/[A-Z]/)
      expect(value).toMatch(/[a-z]/)
      expect(value).toMatch(/[0-9]/)
      expect(value).toMatch(/[^a-zA-Z0-9]/)
    },
  )
  it('excludes ambiguous characters', () =>
    expect(
      generatePassword(128, { ...defaultPasswordOptions, excludeAmbiguous: true }),
    ).not.toMatch(/[O0Il1|]/))
  it('supports a numbers-only alphabet', () =>
    expect(
      generatePassword(64, {
        uppercase: false,
        lowercase: false,
        numbers: true,
        symbols: false,
        excludeAmbiguous: false,
      }),
    ).toMatch(/^\d{64}$/))
  it('rejects an empty alphabet and invalid lengths', () => {
    expect(() =>
      generatePassword(8, {
        uppercase: false,
        lowercase: false,
        numbers: false,
        symbols: false,
        excludeAmbiguous: false,
      }),
    ).toThrow()
    for (const length of [7, 129, NaN, 9.5])
      expect(() => generatePassword(length, defaultPasswordOptions)).toThrow()
  })
})
describe('colors, dates and placeholder text', () => {
  it.each(['#000', '#fff', '#f00', '#123456', '#7760d7'])(
    'round-trips colors through HSL: %s',
    (hex) => {
      const rgb = parseColor(hex, 'hex')
      expect(parseColor(formatColor(rgb).hsl, 'hsl')).toEqual(rgb)
    },
  )
  it('converts known HSL and RGB values', () => {
    expect(formatColor(parseColor('hsl(120, 100%, 50%)', 'hsl')).hex).toBe('#00FF00')
    expect(formatColor(parseColor('rgb(255, 0, 0)', 'rgb')).hsl).toBe('hsl(0, 100%, 50%)')
  })
  it('rejects malformed colors and out-of-range channels', () => {
    expect(() => parseColor('#zzzzzz', 'hex')).toThrow()
    expect(() => parseColor('rgb(256, 0, 0)', 'rgb')).toThrow()
    expect(() => parseColor('hsl(30, 101%, 50%)', 'hsl')).toThrow()
    expect(() => parseColor('rgb(1, 2, 3', 'rgb')).toThrow()
  })
  it('converts seconds, milliseconds, fractions, and pre-epoch values', () => {
    expect(parseTimestamp('0', 'seconds').toISOString()).toBe('1970-01-01T00:00:00.000Z')
    expect(parseTimestamp('1700000000', 'seconds').getTime()).toBe(1700000000000)
    expect(dateDetails(parseTimestamp('1700000000000', 'milliseconds'))['Unix seconds']).toBe(
      '1700000000',
    )
    expect(parseTimestamp('-0.5', 'seconds').getTime()).toBe(-500)
  })
  it.each(['', 'abc', '1e309', '9999999999999999999999999'])(
    'rejects invalid timestamps %s',
    (value) => expect(() => parseTimestamp(value, 'seconds')).toThrow(),
  )
  it('generates exact counts', () => {
    expect(generateLorem('words', 37).split(/\s+/)).toHaveLength(37)
    expect(generateLorem('sentences', 17).split('.').filter(Boolean)).toHaveLength(17)
    expect(generateLorem('paragraphs', 9).split('\n\n')).toHaveLength(9)
    expect(() => generateLorem('paragraphs', 101)).toThrow()
  })
})
describe('regular expressions and diff', () => {
  it('reports captures, named groups and indices', () => {
    const result = matchRegex('(?<word>hi) (\\d+)', 'g', 'hi 12, hi 34')
    expect(result.matches).toHaveLength(2)
    expect(result.matches[1]).toMatchObject({
      index: 7,
      value: 'hi 34',
      groups: ['hi', '34'],
      namedGroups: { word: 'hi' },
    })
  })
  it('handles zero-width Unicode matches without looping', () =>
    expect(matchRegex('(?:)', 'gu', '😀').matches.map((match) => match.index)).toEqual([0, 2]))
  it('preserves non-global and sticky behavior', () => {
    expect(matchRegex('a', '', 'aa').matches).toHaveLength(1)
    expect(matchRegex('a', 'y', 'ba').matches).toHaveLength(0)
  })
  it('caps results and rejects bad flags or syntax', () => {
    expect(matchRegex('a', 'g', 'a'.repeat(1200)).limited).toBe(true)
    expect(() => matchRegex('(', 'g', '')).toThrow()
    expect(() => matchRegex('a', 'gg', '')).toThrow()
  })
  it('reports added and removed lines and final newlines', () => {
    const changes = compareText('a\nb\n', 'a\nc\n')
    expect(changes.find((part) => part.removed)?.value).toBe('b\n')
    expect(changes.find((part) => part.added)?.value).toBe('c\n')
    expect(compareText('a', 'a\n').some((part) => part.added)).toBe(true)
    expect(compareText('same', 'same').every((part) => !part.added && !part.removed)).toBe(true)
  })
  it('bounds oversized comparisons', () =>
    expect(() => compareText('a'.repeat(200001), '')).toThrow())
})
describe('versioned local preferences', () => {
  it.each([null, '{broken', 'null', '[]', '{"version":2}'])(
    'recovers safely from corrupt or unsupported data %s',
    (raw) =>
      expect(parsePreferences(raw)).toMatchObject({
        version: 1,
        theme: 'system',
        favorites: [],
        recent: [],
      }),
  )
  it('validates fields, removes duplicate IDs and keeps 10 recent tools', () => {
    const result = parsePreferences(
      JSON.stringify({
        version: 1,
        theme: 'invalid',
        favorites: ['json', 'json', 23],
        recent: Array.from({ length: 20 }, (_, i) => `tool${i}`),
        collapsed: 'yes',
      }),
    )
    expect(result.favorites).toEqual(['json'])
    expect(result.recent).toHaveLength(10)
    expect(result.theme).toBe('system')
    expect(result.collapsed).toBe(false)
  })
})
