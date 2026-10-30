import { afterEach, describe, expect, it, vi } from 'vitest'
import { parsePreferences, preferences, STORAGE_KEY } from './preferences'

afterEach(() => {
  preferences.reset()
  vi.unstubAllGlobals()
})

describe('language preferences compatibility', () => {
  it('reads an explicit choice without changing existing preferences', () => {
    const saved = {
      version: 1,
      language: 'tr',
      theme: 'dark',
      favorites: ['json'],
      recent: ['base64'],
      toolUsage: { json: 7 },
      workspaceView: 'list',
      jsonIndent: '4',
      hexCase: 'lower',
      jpegQuality: 65,
      jpegBackground: '#123456',
      collapsed: true,
    }
    expect(parsePreferences(JSON.stringify(saved))).toEqual(saved)
  })

  it('keeps old preferences and ignores an invalid language without resetting other fields', () => {
    for (const language of [undefined, 'xx', null, {}, 'tr-TR']) {
      const parsed = parsePreferences(JSON.stringify({ version: 1, theme: 'dark', language }))
      expect(parsed.theme).toBe('dark')
      expect(parsed.language).toBeUndefined()
    }
    expect(parsePreferences('{broken').language).toBeUndefined()
  })

  it('does not persist an automatic language during unrelated preference changes', () => {
    const values = new Map<string, string>()
    vi.stubGlobal('localStorage', {
      setItem: (key: string, value: string) => values.set(key, value),
    })
    preferences.setTheme('light')
    expect(JSON.parse(values.get(STORAGE_KEY)!)).not.toHaveProperty('language')
    preferences.setLanguage('en')
    preferences.setTheme('dark')
    expect(JSON.parse(values.get(STORAGE_KEY)!)).toMatchObject({ language: 'en', theme: 'dark' })
    preferences.reset()
    expect(JSON.parse(values.get(STORAGE_KEY)!)).not.toHaveProperty('language')
  })

  it('retains the explicit in-memory choice when storage writes are denied', () => {
    vi.stubGlobal('localStorage', {
      setItem: () => {
        throw new Error('denied')
      },
    })
    preferences.setLanguage('de')
    expect(preferences.getSnapshot().language).toBe('de')
  })

  it('notifies subscribers and releases the subscription', () => {
    const listener = vi.fn()
    const unsubscribe = preferences.subscribe(listener)
    preferences.setLanguage('es')
    expect(listener).toHaveBeenCalledTimes(1)
    unsubscribe()
    preferences.setLanguage('tr')
    expect(listener).toHaveBeenCalledTimes(1)
  })
})
