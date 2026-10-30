import type { Language } from '../i18n/language'
import type { Release, ReleaseLocalization } from './releases'

function isLocalization(value: unknown): value is ReleaseLocalization {
  if (!value || typeof value !== 'object') return false
  const localization = value as Record<string, unknown>
  return (
    typeof localization.title === 'string' &&
    localization.title.trim().length > 0 &&
    ['features', 'improvements', 'fixes'].every(
      (key) =>
        Array.isArray(localization[key]) &&
        localization[key].every((item) => typeof item === 'string' && item.trim().length > 0),
    )
  )
}

export function localizeRelease(release: Release, language: Language): Release {
  if (language === 'en') return release
  const localization = release.localizations?.[language]
  if (!isLocalization(localization)) return release
  return {
    ...release,
    title: localization.title,
    features: localization.features,
    improvements: localization.improvements,
    fixes: localization.fixes,
  }
}
