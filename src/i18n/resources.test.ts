import { createInstance } from 'i18next'
import { describe, expect, it } from 'vitest'
import en from './resources/en'
import tr from './resources/tr'
import de from './resources/de'
import es from './resources/es'

const locales = { tr, de, es }
const flatten = (value: unknown, prefix = ''): Map<string, string> => {
  const result = new Map<string, string>()
  if (!value || typeof value !== 'object') return result
  for (const [key, child] of Object.entries(value)) {
    const path = prefix ? `${prefix}.${key}` : key
    if (typeof child === 'string') result.set(path, child)
    else
      for (const [nestedKey, nestedValue] of flatten(child, path))
        result.set(nestedKey, nestedValue)
  }
  return result
}
const placeholders = (value: string) =>
  [...value.matchAll(/\{\{(\w+)(?:,[^}]+)?\}\}/g)].map((match) => match[1]).sort()

describe('shipped translation resources', () => {
  const english = flatten(en)
  it.each(Object.entries(locales))('contains every English key in %s', (_, resource) => {
    const translated = flatten(resource)
    expect([...english.keys()].filter((key) => !translated.has(key))).toEqual([])
    expect([...translated.entries()].filter(([, value]) => !value.trim())).toEqual([])
  })

  it.each(Object.entries(locales))('preserves interpolation placeholders in %s', (_, resource) => {
    const translated = flatten(resource)
    for (const [key, value] of english) {
      expect(placeholders(translated.get(key) ?? '')).toEqual(placeholders(value))
    }
  })

  it('keeps plural variants complete for every shipped locale', () => {
    for (const resource of [en, ...Object.values(locales)]) {
      const keys = flatten(resource)
      for (const key of keys.keys()) {
        if (key.endsWith('_one')) expect(keys.has(key.replace(/_one$/, '_other'))).toBe(true)
        if (key.endsWith('_other')) expect(keys.has(key.replace(/_other$/, '_one'))).toBe(true)
      }
    }
  })

  it('retains English fallback for a deliberately sparse runtime resource', async () => {
    const instance = createInstance()
    await instance.init({
      lng: 'tr',
      fallbackLng: 'en',
      resources: { en: { translation: en }, tr: { translation: { common: { copy: 'Kopyala' } } } },
      returnEmptyString: false,
    })
    expect(instance.t('common.copy')).toBe('Kopyala')
    expect(instance.t('common.download')).toBe('Download')
  })
})
