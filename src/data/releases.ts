export interface Release {
  version: string
  title: string
  date: string
  features: readonly string[]
  improvements: readonly string[]
  fixes: readonly string[]
}

// Newest first. Keep an entry matching package.json for each published version.
export const releases: readonly Release[] = [
  {
    version: '4.1.0',
    title: 'Workspace Intelligence',
    date: '2026-09-30',
    features: ['Workspace Collections', 'Smart File Inspector', 'Package.json Analyzer'],
    improvements: [
      'Improved Workspace organization',
      'Better local file handoffs',
      'Expanded SEO and discoverability metadata',
      'Sitemap and robots support',
    ],
    fixes: [
      'Fixed Package.json Analyzer long-value overflow',
      'Normalized route metadata for trailing-slash URLs',
      'Fixed search and Workspace keyboard-navigation regressions',
    ],
  },
]

export function getReleaseByVersion(version: string) {
  return releases.find((release) => release.version === version)
}

export function releaseSections(release: Release) {
  return [
    { title: 'New', items: release.features },
    { title: 'Improvements', items: release.improvements },
    { title: 'Fixes', items: release.fixes },
  ].filter((section) => section.items.length > 0)
}

export function isRelease(value: unknown): value is Release {
  if (!value || typeof value !== 'object') return false
  const release = value as Record<string, unknown>
  return (
    typeof release.version === 'string' &&
    /^\d+\.\d+\.\d+(?:-[\w.-]+)?$/.test(release.version) &&
    typeof release.title === 'string' &&
    release.title.trim().length > 0 &&
    typeof release.date === 'string' &&
    /^\d{4}-\d{2}-\d{2}$/.test(release.date) &&
    !Number.isNaN(Date.parse(release.date)) &&
    ['features', 'improvements', 'fixes'].every(
      (key) =>
        Array.isArray(release[key]) &&
        release[key].every((item) => typeof item === 'string' && item.trim().length > 0),
    )
  )
}
