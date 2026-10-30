import { describe, expect, it } from 'vitest'
import { releases, type Release } from './releases'
import { localizeRelease } from './localizedRelease'

describe('localizeRelease', () => {
  it('localizes the known release without changing version or date', () => {
    const localized = localizeRelease(releases[0], 'tr')
    expect(localized.title).toBe('Çalışma Alanı Zekâsı')
    expect(localized.version).toBe(releases[0].version)
    expect(localized.date).toBe(releases[0].date)
  })

  it('keeps unknown versions and legacy payloads in English', () => {
    const release: Release = {
      version: '99.0.0',
      title: 'Future release',
      date: '2099-01-01',
      features: ['Future feature'],
      improvements: [],
      fixes: [],
    }
    expect(localizeRelease(release, 'de')).toBe(release)
  })

  it('ignores malformed optional localization data', () => {
    const release = {
      ...releases[0],
      localizations: { de: { title: '', features: ['ok'], improvements: [], fixes: [] } },
    } as Release
    expect(localizeRelease(release, 'de')).toBe(release)
  })
})
