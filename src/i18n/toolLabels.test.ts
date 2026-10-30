import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { initializeI18n, changeAppLanguage, disposeI18n } from './index'
import { getCategoryLabel, getToolText } from './toolLabels'
import { searchTools, tools } from '../registry/tools'
import { sortTools } from '../registry/discovery'

beforeAll(async () => {
  await initializeI18n()
  for (const language of ['tr', 'de', 'es', 'en'] as const) await changeAppLanguage(language)
})
afterAll(disposeI18n)

describe('localized discovery', () => {
  it.each(['en', 'tr', 'de', 'es'] as const)(
    'preserves canonical json and technical aliases in %s',
    (language) => {
      expect(searchTools('json', undefined, language)[0].id).toBe('json')
      expect(searchTools('workspace', undefined, language)).toEqual([])
      expect(searchTools('sha256', undefined, language).map((tool) => tool.id)).toContain('hash')
      expect(searchTools('npm', undefined, language).map((tool) => tool.id)).toContain(
        'package-json',
      )
    },
  )
  it.each([
    ['tr', 'parola', 'password'],
    ['de', 'Passwort', 'password'],
    ['es', 'contraseñas', 'password'],
    ['tr', 'biçimlendirici', 'json'],
    ['de', 'Abhängigkeiten', 'package-json'],
    ['es', 'dependencias', 'package-json'],
  ] as const)('finds %s query %s without changing registry identity', (language, query, id) => {
    expect(searchTools(query, undefined, language)).toContain(tools.find((tool) => tool.id === id))
  })
  it('translates display categories without changing category filters or paths', () => {
    expect(getCategoryLabel('Generators', 'de')).toBe('Generatoren')
    const json = tools.find((tool) => tool.id === 'json')!
    expect(getToolText(json, 'tr').name).toBe('JSON Biçimlendirici')
    expect(getToolText(json, 'en').name).toBe('JSON Formatter')
    expect(json.path).toBe('/tools/json')
    expect(searchTools('parola', 'Generators', 'tr').map((tool) => tool.id)).toContain('password')
    expect(searchTools('parola', 'PDF', 'tr')).toEqual([])
  })
  it('sorts by localized names without changing original objects or registry order', () => {
    const ids = tools.map((tool) => tool.id)
    const subset = ['password', 'hash'].map((id) => tools.find((tool) => tool.id === id)!)
    expect(
      sortTools(subset, 'name', { toolUsage: {}, recent: [], favorites: [] }, 'es').map(
        (tool) => tool.id,
      ),
    ).toEqual(['password', 'hash'])
    expect(
      sortTools(subset, 'name', { toolUsage: {}, recent: [], favorites: [] }, 'en').map(
        (tool) => tool.id,
      ),
    ).toEqual(['hash', 'password'])
    expect(tools.map((tool) => tool.id)).toEqual(ids)
  })
})
