import { JSON_CHARACTER_LIMIT } from '../../lib/jsonFile'
import { englishMessage, message, messageError, type AppMessage } from '../../i18n/messages'

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
  presentation: { diagnostics: AppMessage[]; missingOverview: string[] }
}
function record(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === 'object' && !Array.isArray(value)
}
function display(value: unknown) {
  return typeof value === 'string' ? value : (JSON.stringify(value) ?? 'Not declared')
}
function groupList(groups: string[]): AppMessage {
  if (groups.length === 2)
    return message('inspection.groupsTwo', '{{first}} and {{second}}', {
      first: groups[0],
      second: groups[1],
    })
  return message('inspection.groupsMany', '{{groups}} and {{last}}', {
    groups: groupList(groups.slice(0, -1)),
    last: groups.at(-1) ?? '',
  })
}

/** Structural guidance only: never resolves versions, fetches packages or executes scripts. */
export function analyzePackage(input: string): PackageAnalysis {
  if (input.length > JSON_CHARACTER_LIMIT)
    throw messageError('inspection.inputSize', 'Input is limited to 200,000 characters.')
  if (!input.trim())
    throw messageError('inspection.packageEmpty', 'Paste or select a package.json file.')
  let data: unknown
  try {
    data = JSON.parse(input.replace(/^\uFEFF/, ''))
  } catch {
    throw messageError('inspection.invalidJson', 'Invalid JSON. Check quotes, commas and brackets.')
  }
  if (!record(data))
    throw messageError('inspection.packageObject', 'package.json must contain a JSON object.')
  const diagnostics: Diagnostic[] = []
  const presentation: AppMessage[] = []
  const add = (level: Diagnostic['level'], notice: AppMessage) => {
    diagnostics.push({ level, message: englishMessage(notice) })
    presentation.push(notice)
  }
  for (const field of ['name', 'version']) {
    if (data[field] === undefined || data[field] === '')
      add(
        data.private === true ? 'info' : 'warning',
        message(
          data.private === true ? 'inspection.missingPrivate' : 'inspection.missingPublic',
          data.private === true
            ? '{{field}} is missing in this private project; declare it if needed for tooling.'
            : '{{field}} is missing; declare it if this package will be published.',
          { field },
        ),
      )
    else if (typeof data[field] !== 'string')
      add('error', message('inspection.fieldString', '{{field}} must be a string.', { field }))
  }
  if (data.private !== undefined && typeof data.private !== 'boolean')
    add('error', message('inspection.privateBoolean', 'private must be a boolean.'))
  for (const field of ['description', 'packageManager']) {
    if (data[field] !== undefined && typeof data[field] !== 'string')
      add('error', message('inspection.fieldString', '{{field}} must be a string.', { field }))
  }
  if (data.type !== undefined && data.type !== 'module' && data.type !== 'commonjs')
    add('error', message('inspection.moduleType', 'type must be "module" or "commonjs".'))
  else
    add(
      'info',
      data.type === undefined
        ? message(
            'inspection.moduleMissing',
            'Module type is not declared; this analysis does not infer runtime behavior.',
          )
        : message('inspection.moduleExplicit', 'Module type is explicitly {{type}}.', {
            type: data.type as string,
          }),
    )
  if (
    data.engines !== undefined &&
    (!record(data.engines) ||
      Object.entries(data.engines).some(
        ([key, value]) => !key.trim() || typeof value !== 'string' || !value.trim(),
      ))
  )
    add(
      'error',
      message(
        'inspection.engines',
        'engines must be an object of non-empty string version requirements.',
      ),
    )
  const memberships = new Map<string, string[]>()
  let dependencyCount = 0
  const dependencies = DEPENDENCY_GROUPS.map((group) => {
    const value = data[group]
    if (value === undefined) return { group, entries: [] }
    if (!record(value)) {
      add('error', message('inspection.groupObject', '{{group}} must be an object.', { group }))
      return { group, entries: [] }
    }
    const raw = Object.entries(value)
    dependencyCount += raw.length
    if (dependencyCount > 1000)
      throw messageError(
        'inspection.dependencyLimit',
        'Analyze at most 1,000 dependency declarations at a time.',
      )
    const entries: [string, string][] = raw.map(([name, version]) => {
      memberships.set(name, [...(memberships.get(name) ?? []), group])
      if (!name.trim())
        add(
          'error',
          message('inspection.emptyPackage', '{{group}} contains an empty package name.', {
            group,
          }),
        )
      if (typeof version !== 'string' || !version.trim())
        add(
          'error',
          message(
            'inspection.versionString',
            '{{group}}.{{name}}: version/specifier must be a non-empty string.',
            { group, name },
          ),
        )
      else if (
        version.trim().toLowerCase() === 'latest' ||
        /(^|[.\s|])(?:\*|x)(?=$|[.\s|])/i.test(version.trim())
      )
        add(
          'warning',
          message(
            'inspection.broad',
            '{{group}}.{{name}}: broad "{{version}}" specifier. Use a deliberate version policy; installed versions are not checked.',
            { group, name, version: version.trim() },
          ),
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
        message('inspection.overlap', '{{name}} appears in {{groups}}. {{reason}}', {
          name,
          groups: groupList(groups),
          reason: message(
            redundant ? 'inspection.redundant' : 'inspection.intentional',
            redundant
              ? 'Check whether both runtime and development declarations are intentional.'
              : 'Overlap can be intentional, including peer and optional dependencies.',
          ),
        }),
      )
    }
  }
  const scripts: PackageAnalysis['scripts'] = []
  if (data.scripts !== undefined && !record(data.scripts))
    add(
      'error',
      message('inspection.scriptsObject', 'scripts must be an object of command strings.'),
    )
  if (record(data.scripts)) {
    const entries = Object.entries(data.scripts)
    if (entries.length > 200)
      throw messageError('inspection.scriptLimit', 'Analyze at most 200 scripts at a time.')
    for (const [name, command] of entries) {
      scripts.push({ name, command: display(command), common: COMMON_SCRIPTS.has(name) })
      if (!name.trim()) add('error', message('inspection.scriptName', 'A script name is empty.'))
      if (typeof command !== 'string')
        add(
          'error',
          message('inspection.scriptString', 'Script "{{name}}" must be a string.', { name }),
        )
      else if (!command.trim())
        add('warning', message('inspection.scriptEmpty', 'Script "{{name}}" is empty.', { name }))
    }
  }
  for (const useful of ['test', 'lint', 'build']) {
    if (!scripts.some((script) => script.name === useful))
      add(
        'info',
        message(
          'inspection.scriptMissing',
          'No "{{name}}" script is declared. Add one only if this project needs it.',
          { name: useful },
        ),
      )
  }
  const overviewKeys = [
    'name',
    'version',
    'private',
    'description',
    'license',
    'type',
    'packageManager',
    'engines',
    'repository',
  ]
  return {
    overview: overviewKeys.map((key) => [key, display(data[key])]),
    dependencies,
    scripts,
    diagnostics,
    presentation: {
      diagnostics: presentation,
      missingOverview: overviewKeys.filter((key) => data[key] === undefined),
    },
  }
}

export function packageAnalysisJson(analysis: PackageAnalysis) {
  return JSON.stringify(
    {
      overview: analysis.overview,
      dependencies: analysis.dependencies,
      scripts: analysis.scripts,
      diagnostics: analysis.diagnostics,
    },
    null,
    2,
  )
}

export interface PackageSummaryLabels {
  title: string
  scripts: string
  diagnostics: string
  help: string
  notDeclared: string
}
const englishSummaryLabels: PackageSummaryLabels = {
  title: 'Package.json analysis (local structural checks)',
  scripts: 'Scripts: {{count}}',
  diagnostics: 'Diagnostics: {{errors}} errors, {{warnings}} warnings, {{info}} information items',
  help: 'No version resolution, vulnerability assessment or network lookup was performed.',
  notDeclared: 'Not declared',
}
export function packageSummary(
  analysis: PackageAnalysis,
  labels: PackageSummaryLabels = englishSummaryLabels,
) {
  const missing = new Set(analysis.presentation.missingOverview)
  const counts = {
    errors: analysis.diagnostics.filter((item) => item.level === 'error').length,
    warnings: analysis.diagnostics.filter((item) => item.level === 'warning').length,
    info: analysis.diagnostics.filter((item) => item.level === 'info').length,
  }
  return [
    labels.title,
    ...analysis.overview.map(
      ([key, value]) => `${key}: ${missing.has(key) ? labels.notDeclared : value}`,
    ),
    ...analysis.dependencies.map(({ group, entries }) => `${group}: ${entries.length}`),
    labels.scripts.replace('{{count}}', String(analysis.scripts.length)),
    labels.diagnostics
      .replace('{{errors}}', String(counts.errors))
      .replace('{{warnings}}', String(counts.warnings))
      .replace('{{info}}', String(counts.info)),
    labels.help,
  ].join('\n')
}
