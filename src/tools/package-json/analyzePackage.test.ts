import { expect, it } from 'vitest'
import { analyzePackage, packageSummary } from './analyzePackage'
import { inspectFile } from '../file-inspector/inspection'
import { inspectionTools } from '../../registry/discovery'
const analyze = (data: unknown) => analyzePackage(JSON.stringify(data))

it('summarizes all overview fields, dependency groups and common scripts', () => {
  const result = analyze({
    name: '世界',
    version: '1.0.0',
    private: true,
    description: 'Example',
    license: 'MIT',
    type: 'module',
    packageManager: 'npm@11',
    engines: { node: '>=22' },
    repository: { type: 'git', url: 'https://example.test/repo' },
    dependencies: { react: '^19' },
    devDependencies: { vite: '^8' },
    peerDependencies: { react: '^19' },
    optionalDependencies: { optional: '1.0.0' },
    scripts: {
      dev: 'vite',
      build: 'vite build',
      test: 'vitest',
      lint: 'eslint .',
      start: 'node index.js',
      preview: 'vite preview',
      typecheck: 'tsc',
      custom: 'echo custom',
    },
  })
  expect(result.overview).toHaveLength(9)
  expect(result.dependencies.map((group) => group.entries.length)).toEqual([1, 1, 1, 1])
  expect(result.scripts.filter((script) => script.common)).toHaveLength(7)
  expect(result.diagnostics.some((item) => item.level === 'error')).toBe(false)
  expect(result.diagnostics).toContainEqual({
    level: 'info',
    message: expect.stringContaining('Overlap can be intentional'),
  })
  expect(packageSummary(result)).toContain('name: 世界')
  expect(packageSummary(result)).toContain('No version resolution')
})
it.each(['', '{bad', '[]', 'null', '42', '"text"'])('rejects invalid package input %s', (input) => {
  expect(() => analyzePackage(input)).toThrow()
})
it('diagnoses runtime/dev overlap, broad specifiers and invalid values deterministically', () => {
  const result = analyze({
    dependencies: { same: 'latest', wild: '*', minor: '1.x', bad: 42, blank: '' },
    devDependencies: { same: '^1.0.0' },
    scripts: { test: '', bad: false },
    engines: { node: 22 },
    type: 'broken',
  })
  expect(result.diagnostics.filter((item) => item.message.includes('broad'))).toHaveLength(3)
  expect(result.diagnostics).toContainEqual({
    level: 'warning',
    message: expect.stringContaining('both runtime and development'),
  })
  expect(result.diagnostics).toContainEqual({
    level: 'error',
    message: expect.stringContaining('engines must'),
  })
  expect(result.diagnostics).toContainEqual({
    level: 'error',
    message: 'type must be "module" or "commonjs".',
  })
  expect(result.diagnostics).toContainEqual({
    level: 'warning',
    message: 'Script "test" is empty.',
  })
  expect(result.diagnostics).toContainEqual({
    level: 'info',
    message: expect.stringContaining('No "lint"'),
  })
  expect(
    analyze({
      dependencies: { same: 'latest', wild: '*', minor: '1.x', bad: 42, blank: '' },
      devDependencies: { same: '^1.0.0' },
      scripts: { test: '', bad: false },
      engines: { node: 22 },
      type: 'broken',
    }),
  ).toEqual(result)
})
it('treats private project missing fields and useful scripts as guidance', () => {
  expect(analyze({ private: true }).diagnostics.every((item) => item.level === 'info')).toBe(true)
  expect(analyze({}).diagnostics.filter((item) => item.level === 'warning')).toHaveLength(2)
})
it('rejects malformed group, scripts and metadata types without crashing', () => {
  const result = analyze({
    name: 42,
    version: false,
    private: 'yes',
    description: [],
    packageManager: 2,
    dependencies: [],
    devDependencies: null,
    scripts: 42,
    engines: [],
  })
  expect(result.diagnostics.filter((item) => item.level === 'error')).toHaveLength(9)
})
it('keeps script/URL content inert and handles special property names safely', () => {
  const result = analyzePackage(
    '{"dependencies":{"__proto__":"1.0.0","constructor":"file:../local"},"scripts":{"postinstall":"<script>alert(1)</script>"},"repository":"javascript:alert(1)"}',
  )
  expect(result.dependencies[0].entries).toHaveLength(2)
  expect(result.scripts[0].command).toBe('<script>alert(1)</script>')
  expect(result.overview).toContainEqual(['repository', 'javascript:alert(1)'])
  expect({}).not.toHaveProperty('polluted')
})
it('does not label file/git/workspace/npm alias specifiers as outdated or invalid', () => {
  const result = analyze({
    dependencies: {
      one: 'file:../one',
      two: 'git+https://example.test/repo',
      three: 'workspace:*',
      four: 'npm:other@^1',
    },
  })
  expect(result.diagnostics.filter((item) => item.level === 'error')).toEqual([])
})
it('enforces bounded text, dependency and script inputs', () => {
  expect(() => analyzePackage(' '.repeat(200_001))).toThrow('200,000')
  expect(() =>
    analyze({
      dependencies: Object.fromEntries(
        Array.from({ length: 1001 }, (_, index) => [`p${index}`, '1']),
      ),
    }),
  ).toThrow('1,000')
  expect(() =>
    analyze({
      scripts: Object.fromEntries(Array.from({ length: 201 }, (_, index) => [`s${index}`, 'echo'])),
    }),
  ).toThrow('200 scripts')
})
it('recommends Package.json Analyzer only for the matching filename', async () => {
  const result = await inspectFile(
    { name: 'package.json', blob: new Blob(['{}'], { type: 'application/json' }) },
    new AbortController().signal,
  )
  expect(inspectionTools('package.json', result).map((item) => item.tool.id)).toContain(
    'package-json',
  )
  expect(inspectionTools('data.json', result).map((item) => item.tool.id)).not.toContain(
    'package-json',
  )
})
