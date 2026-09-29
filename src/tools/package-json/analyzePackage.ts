import { JSON_CHARACTER_LIMIT } from '../../lib/jsonFile'

export const DEPENDENCY_GROUPS = [
  'dependencies',
  'devDependencies',
  'peerDependencies',
  'optionalDependencies',
] as const
const COMMON_SCRIPTS = new Set(['dev', 'build', 'test', 'lint', 'start', 'preview', 'typecheck'])
export interface Diagnostic {
  level: 'info' | 'warning' | 'error'
  message: string
}
export interface PackageAnalysis {
  overview: [string, string][]
  dependencies: { group: (typeof DEPENDENCY_GROUPS)[number]; entries: [string, string][] }[]
  scripts: { name: string; command: string; common: boolean }[]
  diagnostics: Diagnostic[]
}
function record(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === 'object' && !Array.isArray(value)
}
function display(value: unknown) {
  return typeof value === 'string' ? value : (JSON.stringify(value) ?? 'Not declared')
}

/** Structural guidance only: never resolves versions, fetches packages or executes scripts. */
export function analyzePackage(input: string): PackageAnalysis {
  if (input.length > JSON_CHARACTER_LIMIT)
    throw new Error('Input is limited to 200,000 characters.')
  if (!input.trim()) throw new Error('Paste or select a package.json file.')
  let data: unknown
  try {
    data = JSON.parse(input.replace(/^\uFEFF/, ''))
  } catch {
    throw new Error('Invalid JSON. Check quotes, commas and brackets.')
  }
  if (!record(data)) throw new Error('package.json must contain a JSON object.')
  const diagnostics: Diagnostic[] = []
  const add = (level: Diagnostic['level'], message: string) => diagnostics.push({ level, message })
  for (const field of ['name', 'version']) {
    if (data[field] === undefined || data[field] === '')
      add(
        data.private === true ? 'info' : 'warning',
        `${field} is missing${data.private === true ? ' in this private project; declare it if needed for tooling.' : '; declare it if this package will be published.'}`,
      )
    else if (typeof data[field] !== 'string') add('error', `${field} must be a string.`)
  }
  if (data.private !== undefined && typeof data.private !== 'boolean')
    add('error', 'private must be a boolean.')
  for (const field of ['description', 'packageManager']) {
    if (data[field] !== undefined && typeof data[field] !== 'string')
      add('error', `${field} must be a string.`)
  }
  if (data.type !== undefined && data.type !== 'module' && data.type !== 'commonjs')
    add('error', 'type must be "module" or "commonjs".')
  else
    add(
      'info',
      data.type === undefined
        ? 'Module type is not declared; this analysis does not infer runtime behavior.'
        : `Module type is explicitly ${data.type}.`,
    )
  if (
    data.engines !== undefined &&
    (!record(data.engines) ||
      Object.entries(data.engines).some(
        ([key, value]) => !key.trim() || typeof value !== 'string' || !value.trim(),
      ))
  )
    add('error', 'engines must be an object of non-empty string version requirements.')
  const memberships = new Map<string, string[]>()
  let dependencyCount = 0
  const dependencies = DEPENDENCY_GROUPS.map((group) => {
    const value = data[group]
    if (value === undefined) return { group, entries: [] }
    if (!record(value)) {
      add('error', `${group} must be an object.`)
      return { group, entries: [] }
    }
    const raw = Object.entries(value)
    dependencyCount += raw.length
    if (dependencyCount > 1000)
      throw new Error('Analyze at most 1,000 dependency declarations at a time.')
    const entries: [string, string][] = raw.map(([name, version]) => {
      memberships.set(name, [...(memberships.get(name) ?? []), group])
      if (!name.trim()) add('error', `${group} contains an empty package name.`)
      if (typeof version !== 'string' || !version.trim())
        add('error', `${group}.${name}: version/specifier must be a non-empty string.`)
      else if (
        version.trim().toLowerCase() === 'latest' ||
        /(^|[.\s|])(?:\*|x)(?=$|[.\s|])/i.test(version.trim())
      )
        add(
          'warning',
          `${group}.${name}: broad "${version}" specifier. Use a deliberate version policy; installed versions are not checked.`,
        )
      return [name, display(version)]
    })
    return { group, entries }
  })
  for (const [name, groups] of memberships) {
    if (groups.length > 1) {
      const redundant = groups.includes('dependencies') && groups.includes('devDependencies')
      add(
        redundant ? 'warning' : 'info',
        `${name} appears in ${groups.join(' and ')}. ${redundant ? 'Check whether both runtime and development declarations are intentional.' : 'Overlap can be intentional, including peer and optional dependencies.'}`,
      )
    }
  }
  const scripts: PackageAnalysis['scripts'] = []
  if (data.scripts !== undefined && !record(data.scripts))
    add('error', 'scripts must be an object of command strings.')
  if (record(data.scripts)) {
    const entries = Object.entries(data.scripts)
    if (entries.length > 200) throw new Error('Analyze at most 200 scripts at a time.')
    for (const [name, command] of entries) {
      scripts.push({ name, command: display(command), common: COMMON_SCRIPTS.has(name) })
      if (!name.trim()) add('error', 'A script name is empty.')
      if (typeof command !== 'string') add('error', `Script "${name}" must be a string.`)
      else if (!command.trim()) add('warning', `Script "${name}" is empty.`)
    }
  }
  for (const useful of ['test', 'lint', 'build']) {
    if (!scripts.some((script) => script.name === useful))
      add('info', `No "${useful}" script is declared. Add one only if this project needs it.`)
  }
  return {
    overview: [
      'name',
      'version',
      'private',
      'description',
      'license',
      'type',
      'packageManager',
      'engines',
      'repository',
    ].map((key) => [key, display(data[key])]),
    dependencies,
    scripts,
    diagnostics,
  }
}

export function packageSummary(analysis: PackageAnalysis) {
  return [
    'Package.json analysis (local structural checks)',
    ...analysis.overview.map(([key, value]) => `${key}: ${value}`),
    ...analysis.dependencies.map(({ group, entries }) => `${group}: ${entries.length}`),
    `Scripts: ${analysis.scripts.length}`,
    `Diagnostics: ${analysis.diagnostics.filter((item) => item.level === 'error').length} errors, ${analysis.diagnostics.filter((item) => item.level === 'warning').length} warnings, ${analysis.diagnostics.filter((item) => item.level === 'info').length} information items`,
    'No version resolution, vulnerability assessment or network lookup was performed.',
  ].join('\n')
}
