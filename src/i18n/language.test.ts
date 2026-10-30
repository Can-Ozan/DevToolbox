import { describe, expect, it } from 'vitest'
import { isLanguage, resolveLanguage } from './language'

describe('language detection', () => {
  it.each([
    ['tr-TR', 'tr'],
    ['de-AT', 'de'],
    ['es-MX', 'es'],
    ['en-GB', 'en'],
    ['TR-tr', 'tr'],
    ['fr-FR', 'en'],
  ])('resolves primary browser language %s to %s', (browser, expected) => {
    expect(resolveLanguage(undefined, [browser])).toBe(expected)
  })

  it('respects explicit English instead of the browser language', () => {
    expect(resolveLanguage('en', ['tr-TR'])).toBe('en')
    expect(resolveLanguage('es', ['de-AT'])).toBe('es')
  })

  it('falls back for an unsupported primary language without scanning secondary choices', () => {
    expect(resolveLanguage(undefined, ['fr-FR', 'tr-TR'])).toBe('en')
    expect(resolveLanguage('invalid', [], 'de-DE')).toBe('de')
    expect(resolveLanguage(null, [])).toBe('en')
  })

  it('accepts only canonical persisted language codes', () => {
    expect(['en', 'tr', 'de', 'es'].every(isLanguage)).toBe(true)
    for (const invalid of ['tr-TR', 'EN', '', null, {}, 1, undefined])
      expect(isLanguage(invalid)).toBe(false)
  })
})
