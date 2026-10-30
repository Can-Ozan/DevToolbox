export type Language = 'en' | 'tr' | 'de' | 'es'

export const languageNames: Record<Language, string> = {
  en: 'English',
  tr: 'Türkçe',
  de: 'Deutsch',
  es: 'Español',
}

export function isLanguage(value: unknown): value is Language {
  return value === 'en' || value === 'tr' || value === 'de' || value === 'es'
}

export function resolveLanguage(
  explicit: unknown,
  browserLanguages: readonly string[],
  browserLanguage?: string,
): Language {
  if (isLanguage(explicit)) return explicit
  const primary = (browserLanguages[0] || browserLanguage || '').toLowerCase().split('-')[0]
  return isLanguage(primary) ? primary : 'en'
}
