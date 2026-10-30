import { createInstance } from 'i18next'
import { initReactI18next } from 'react-i18next'
import { preferences } from '../storage/preferences'
import { resolveLanguage, type Language } from './language'
import en from './resources/en'

export const i18n = createInstance()
const loaders = {
  tr: () => import('./resources/tr'),
  de: () => import('./resources/de'),
  es: () => import('./resources/es'),
}
let initialization: Promise<void> | undefined
let unsubscribe: (() => void) | undefined
let revision = 0
let explicitLanguage = preferences.getSnapshot().language
let status = { loading: false, error: false }
const listeners = new Set<() => void>()

export const getLanguageStatus = () => status
export function subscribeLanguageStatus(listener: () => void) {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}
function setStatus(loading: boolean, error = false) {
  status = { loading, error }
  listeners.forEach((listener) => listener())
}
function detectedLanguage() {
  return resolveLanguage(
    preferences.getSnapshot().language,
    typeof navigator === 'undefined' ? [] : navigator.languages,
    typeof navigator === 'undefined' ? undefined : navigator.language,
  )
}
async function applyLanguage(language: Language, persist: boolean): Promise<boolean> {
  const request = ++revision
  setStatus(true)
  const scrollPosition =
    typeof window === 'undefined' ? undefined : { left: window.scrollX, top: window.scrollY }
  try {
    if (language !== 'en' && !i18n.hasResourceBundle(language, 'translation')) {
      const resource = await loaders[language]()
      if (request !== revision) return false
      i18n.addResourceBundle(language, 'translation', resource.default)
    }
    if (request !== revision) return false
    await i18n.changeLanguage(language)
    if (request !== revision) return false
    if (typeof document !== 'undefined') document.documentElement.lang = language
    if (scrollPosition && typeof window !== 'undefined') {
      const restoreScroll = () => {
        if (typeof window.scrollTo !== 'function') return
        try {
          window.scrollTo(scrollPosition.left, scrollPosition.top)
        } catch {
          // Scroll restoration is optional and must not fail language changes.
        }
      }
      restoreScroll()
      if (typeof window.requestAnimationFrame === 'function') {
        try {
          window.requestAnimationFrame(restoreScroll)
        } catch {
          // Scroll restoration is optional and must not fail language changes.
        }
      }
    }
    if (persist) {
      explicitLanguage = language
      preferences.setLanguage(language)
    }
    setStatus(false)
    return true
  } catch {
    if (request === revision) setStatus(false, true)
    return false
  }
}

export function initializeI18n(): Promise<void> {
  initialization ??= (async () => {
    await i18n.use(initReactI18next).init({
      lng: 'en',
      fallbackLng: 'en',
      supportedLngs: ['en', 'tr', 'de', 'es'],
      load: 'languageOnly',
      resources: { en: { translation: en } },
      returnNull: false,
      returnEmptyString: false,
      interpolation: { escapeValue: false }, // React escapes interpolation as text.
      react: { useSuspense: false },
    })
    if (typeof document !== 'undefined') document.documentElement.lang = 'en'
    unsubscribe = preferences.subscribe(() => {
      const next = preferences.getSnapshot().language
      if (next === explicitLanguage) return
      explicitLanguage = next
      void applyLanguage(detectedLanguage(), false)
    })
    await applyLanguage(detectedLanguage(), false)
  })()
  return initialization
}

export async function changeAppLanguage(language: Language): Promise<boolean> {
  await initializeI18n()
  return applyLanguage(language, true)
}

// The runtime owns its store subscription; HMR must not keep an older runtime alive.
export function disposeI18n() {
  revision++
  unsubscribe?.()
  unsubscribe = undefined
  listeners.clear()
}
if (import.meta.hot) import.meta.hot.dispose(disposeI18n)
