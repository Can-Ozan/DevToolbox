export interface Release {
  version: string
  title: string
  date: string
  features: readonly string[]
  improvements: readonly string[]
  fixes: readonly string[]
  localizations?: Partial<Record<'tr' | 'de' | 'es', ReleaseLocalization>>
}
export interface ReleaseLocalization {
  title: string
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
    localizations: {
      tr: {
        title: 'Çalışma Alanı Zekâsı',
        features: [
          'Çalışma Alanı Koleksiyonları',
          'Akıllı Dosya İnceleyici',
          'Package.json Analizcisi',
        ],
        improvements: [
          'Geliştirilmiş Çalışma Alanı düzeni',
          'Daha iyi yerel dosya aktarımları',
          'Genişletilmiş SEO ve keşfedilebilirlik meta verileri',
          'Site haritası ve robots desteği',
        ],
        fixes: [
          'Package.json Analizcisi uzun değer taşması düzeltildi',
          'Sondaki eğik çizgili URL’ler için rota meta verileri normalleştirildi',
          'Arama ve Çalışma Alanı klavye gezinimi gerilemeleri düzeltildi',
        ],
      },
      de: {
        title: 'Workspace-Intelligenz',
        features: ['Workspace-Sammlungen', 'Intelligente Dateiprüfung', 'Package.json-Analysator'],
        improvements: [
          'Verbesserte Workspace-Organisation',
          'Bessere lokale Dateiübergaben',
          'Erweiterte SEO- und Auffindbarkeits-Metadaten',
          'Unterstützung für Sitemap und robots',
        ],
        fixes: [
          'Überlauf langer Werte im Package.json-Analysator behoben',
          'Routenmetadaten für URLs mit abschließendem Schrägstrich normalisiert',
          'Fehler bei der Tastaturnavigation in Suche und Workspace behoben',
        ],
      },
      es: {
        title: 'Inteligencia del espacio de trabajo',
        features: [
          'Colecciones del espacio de trabajo',
          'Inspector de archivos inteligente',
          'Analizador de Package.json',
        ],
        improvements: [
          'Organización mejorada del espacio de trabajo',
          'Mejores transferencias de archivos locales',
          'Metadatos SEO y de descubrimiento ampliados',
          'Compatibilidad con sitemap y robots',
        ],
        fixes: [
          'Corregido el desbordamiento de valores largos en el analizador de Package.json',
          'Metadatos de ruta normalizados para URL con barra final',
          'Corregidas regresiones de búsqueda y navegación por teclado del espacio de trabajo',
        ],
      },
    },
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
