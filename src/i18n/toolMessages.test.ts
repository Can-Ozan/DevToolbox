import { afterAll, beforeAll, expect, it } from 'vitest'
import { initializeI18n, changeAppLanguage, disposeI18n, i18n } from './index'
import { renderMessage } from './messages'
import { decodeBase64, errorDescriptor } from '../lib/encoding'
import { formatCode } from '../lib/codeFormat'
import { buildCron, cronValues, describeCron } from '../lib/cron'
import { jsonToCsv } from '../lib/jsonCsv'
import { validateDimensions } from '../lib/imageFiles'
import { parsePageSelection } from '../lib/pdfPages'
import { safeArchivePath } from '../lib/archive'
import { analyzePackage, packageAnalysisJson } from '../tools/package-json/analyzePackage'

beforeAll(initializeI18n)
afterAll(disposeI18n)

it('inspection diagnostics localize without changing package exports or user values', async () => {
  await changeAppLanguage('tr')
  const result = analyzePackage(
    '{"name":"{{shell.settings}} 世界","description":"Not declared","dependencies":{"react":"latest"}}',
  )
  const canonical = JSON.parse(packageAnalysisJson(result))
  expect(Object.keys(canonical)).toEqual(['overview', 'dependencies', 'scripts', 'diagnostics'])
  expect(canonical.overview).toContainEqual(['name', '{{shell.settings}} 世界'])
  expect(canonical.overview).toContainEqual(['description', 'Not declared'])
  expect(
    canonical.diagnostics.some((item: { message: string }) =>
      item.message.includes('broad "latest"'),
    ),
  ).toBe(true)
  expect(
    result.presentation.diagnostics.map((value) => renderMessage(value, i18n.t)).join(' '),
  ).toContain('geniş')
  expect(result.presentation.missingOverview).not.toContain('description')
  let failure: unknown
  try {
    safeArchivePath('../escape')
  } catch (error) {
    failure = error
  }
  expect(renderMessage(errorDescriptor(failure), i18n.t)).toContain('Güvensiz ZIP')
})

it('files localize image and PDF validation without changing processing limits', async () => {
  await changeAppLanguage('de')
  let failure: unknown
  try {
    validateDimensions(0, 4)
  } catch (error) {
    failure = error
  }
  expect(renderMessage(errorDescriptor(failure), i18n.t)).toContain('Breite und Höhe')
  await changeAppLanguage('tr')
  try {
    parsePageSelection('3', 2)
  } catch (error) {
    failure = error
  }
  expect(renderMessage(errorDescriptor(failure), i18n.t)).toContain('Sayfa numaraları')
  expect(parsePageSelection('2,1', 2)).toEqual([1, 0])
})

it('localizes existing validation errors without changing canonical English Error messages', async () => {
  let failure: unknown
  try {
    decodeBase64('*')
  } catch (error) {
    failure = error
  }
  expect((failure as Error).message).toBe(
    'Invalid Base64. Use letters, numbers, + and / with valid padding.',
  )
  const notice = errorDescriptor(failure)
  await changeAppLanguage('de')
  expect(renderMessage(notice, i18n.t)).toContain('Ungültiges Base64')
  await changeAppLanguage('tr')
  expect(renderMessage(notice, i18n.t)).toContain('Geçersiz Base64')
})

it('translates code validation and preserves unknown parser details as literal text', async () => {
  await changeAppLanguage('es')
  const error = await formatCode('', 'html').catch((error: unknown) => error)
  expect(renderMessage(errorDescriptor(error), i18n.t)).toBe('Introduce código para formatear.')
  const userDetail = '<script>alert(1)</script> {{common.clear}}'
  expect(renderMessage(errorDescriptor(new Error(userDetail)), i18n.t)).toBe(userDetail)
})

it('localizes dynamic diagnostics while preserving cron expressions and CSV output', async () => {
  await changeAppLanguage('tr')
  expect(buildCron(cronValues('0 9 * * *'))).toBe('0 9 * * *')
  expect(jsonToCsv('[{"name":"世界","value":42}]').output).toBe('name,value\r\n世界,42')
  let error: unknown
  try {
    buildCron({ ...cronValues('* * * * *'), minute: '90' })
  } catch (reason) {
    error = reason
  }
  expect(renderMessage(errorDescriptor(error), i18n.t)).toContain('Dakika')
  expect(describeCron('0 9 * * 0')).toBe('Every Sunday at 09:00')
  expect(describeCron('0 9 * * 0', (value) => renderMessage(value, i18n.t))).toBe(
    'Her Pazar 09:00 saatinde',
  )
  const hostile = '<img> {{toolUi.clear}}'
  try {
    jsonToCsv(JSON.stringify([{ [hostile]: {} }]))
  } catch (failure) {
    expect(renderMessage(errorDescriptor(failure), i18n.t)).toContain(hostile)
  }
})
