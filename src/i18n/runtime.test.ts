import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { STORAGE_KEY } from '../storage/preferences'

let runtime: typeof import('./index') | undefined
let values: Map<string, string>
let browser: EventTarget

beforeEach(() => {
  vi.resetModules()
  vi.doUnmock('./resources/tr')
  values = new Map()
  browser = new EventTarget()
  vi.stubGlobal('window', browser)
  vi.stubGlobal('document', { documentElement: { lang: '' } })
  vi.stubGlobal('navigator', { languages: ['tr-TR'], language: 'tr-TR' })
  vi.stubGlobal('localStorage', {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => values.set(key, value),
  })
})

afterEach(() => {
  runtime?.disposeI18n()
  runtime = undefined
  vi.unstubAllGlobals()
  vi.doUnmock('./resources/tr')
})

async function start() {
  runtime = await import('./index')
  await runtime.initializeI18n()
  return runtime
}

describe('language runtime', () => {
  it('detects the browser before rendering without saving an explicit choice', async () => {
    const { i18n } = await start()
    expect(i18n.language).toBe('tr')
    expect(document.documentElement.lang).toBe('tr')
    expect(i18n.t('settings.language.label')).toBe('Dil')
    expect(values.has(STORAGE_KEY)).toBe(false)
  })

  it('persists explicit English and clears it on reset back to browser detection', async () => {
    const { i18n, changeAppLanguage } = await start()
    expect(await changeAppLanguage('en')).toBe(true)
    expect(JSON.parse(values.get(STORAGE_KEY)!).language).toBe('en')
    const { preferences } = await import('../storage/preferences')
    preferences.reset()
    await vi.waitFor(() => expect(i18n.language).toBe('tr'))
    expect(JSON.parse(values.get(STORAGE_KEY)!)).not.toHaveProperty('language')
  })

  it('uses English for missing and empty values instead of rendering keys', async () => {
    const { i18n } = await start()
    i18n.removeResourceBundle('tr', 'translation')
    i18n.addResourceBundle('tr', 'translation', { settings: { language: { label: '' } } })
    expect(i18n.t('settings.language.label')).toBe('Language')
    expect(i18n.t('settings.language.description')).toBe(
      'Choose the interface language. Your content stays unchanged.',
    )
    // @ts-expect-error invalid keys must be rejected by TypeScript even with a fallback
    i18n.t('settings.nonexistent', { defaultValue: 'fallback' })
  })

  it('recovers startup to English and reports a failed locale without persisting it', async () => {
    vi.doMock('./resources/tr', () => {
      throw new Error('chunk unavailable')
    })
    const { i18n, changeAppLanguage } = await start()
    expect(i18n.language).toBe('en')
    expect(document.documentElement.lang).toBe('en')
    expect(await changeAppLanguage('tr')).toBe(false)
    expect(i18n.language).toBe('en')
    expect(values.has(STORAGE_KEY)).toBe(false)
  })

  it('keeps the latest choice when an older locale finishes loading later', async () => {
    vi.stubGlobal('navigator', { languages: ['en'] })
    let finish!: (value: { default: { settings: { language: { label: string } } } }) => void
    vi.doMock(
      './resources/tr',
      () =>
        new Promise((resolve) => {
          finish = resolve
        }),
    )
    const { i18n, changeAppLanguage } = await start()
    const older = changeAppLanguage('tr')
    await vi.waitFor(() => expect(finish).toBeTypeOf('function'))
    expect(await changeAppLanguage('de')).toBe(true)
    finish({ default: { settings: { language: { label: 'Dil' } } } })
    expect(await older).toBe(false)
    expect(i18n.language).toBe('de')
    expect(document.documentElement.lang).toBe('de')
    expect(JSON.parse(values.get(STORAGE_KEY)!).language).toBe('de')
  })

  it('still changes language when localStorage is blocked', async () => {
    vi.stubGlobal('localStorage', {
      getItem: () => {
        throw new Error('denied')
      },
      setItem: () => {
        throw new Error('denied')
      },
    })
    const { i18n, changeAppLanguage } = await start()
    expect(await changeAppLanguage('es')).toBe(true)
    expect(i18n.language).toBe('es')
    const { preferences } = await import('../storage/preferences')
    expect(preferences.getSnapshot().language).toBe('es')
  })

  it('synchronizes storage events without writing back and cleans up its subscription', async () => {
    const { i18n, disposeI18n } = await start()
    const saved = JSON.stringify({ version: 1, language: 'es', theme: 'dark' })
    values.set(STORAGE_KEY, saved)
    const event = Object.assign(new Event('storage'), { key: STORAGE_KEY })
    browser.dispatchEvent(event)
    await vi.waitFor(() => expect(i18n.language).toBe('es'))
    expect(values.get(STORAGE_KEY)).toBe(saved)
    disposeI18n()
    const { preferences } = await import('../storage/preferences')
    preferences.setLanguage('de')
    await Promise.resolve()
    expect(i18n.language).toBe('es')
  })
})
