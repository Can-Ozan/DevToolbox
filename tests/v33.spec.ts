import { test, expect, type Page } from '@playwright/test'
import AxeBuilder from '@axe-core/playwright'
import { readFile } from 'node:fs/promises'
import { zipSync, strToU8, unzipSync } from 'fflate'

const note = (name: string, text = 'local bytes') => ({
  name,
  mimeType: 'text/plain',
  buffer: Buffer.from(text),
})
async function downloadOutput(page: Page) {
  const pending = page.waitForEvent('download')
  await page.getByRole('button', { name: 'Download', exact: true }).click()
  const file = await pending
  return {
    name: file.suggestedFilename(),
    mimeType: 'application/zip',
    buffer: await readFile((await file.path())!),
  }
}
test('XML preserves declarations and mixed content, rejects XXE and supports copy/download', async ({
  page,
  context,
}) => {
  await context.grantPermissions(['clipboard-read', 'clipboard-write'])
  const external: string[] = []
  page.on('request', (request) => {
    if (request.url().includes('example.test')) external.push(request.url())
  })
  await page.goto('/tools/xml')
  const input = page.getByLabel('XML input'),
    output = page.getByLabel('XML output')
  await input.fill(
    '<?xml version="1.0"?><r xmlns:a="urn:a"><!--ok--><a:c/><data><![CDATA[x < y]]></data></r>',
  )
  await page.getByLabel('Indentation').selectOption('tab')
  await page.getByRole('button', { name: 'Format XML', exact: true }).click()
  await expect(output).toContainText('\t<a:c/>')
  await page.getByRole('button', { name: 'Copy output' }).click()
  await expect
    .poll(() => page.evaluate(() => navigator.clipboard.readText()))
    .toContain('<![CDATA[x < y]]>')
  const pending = page.waitForEvent('download')
  await page.getByRole('button', { name: 'Download' }).click()
  expect((await pending).suggestedFilename()).toBe('formatted.xml')
  await input.fill('<p>Hello <b>world</b> !</p>')
  await page.getByRole('button', { name: 'Minify XML' }).click()
  await expect(output).toHaveValue('<p>Hello <b>world</b> !</p>')
  await input.fill('<!DOCTYPE x SYSTEM "https://example.test/private"><x/>')
  await page.getByRole('button', { name: 'Validate XML' }).click()
  await expect(page.getByRole('alert')).toContainText('disabled')
  expect(external).toEqual([])
  await page.getByRole('button', { name: 'Clear', exact: true }).click()
  await expect(input).toHaveValue('')
})
test('formatter stays lazy, reports syntax errors and never executes input', async ({
  page,
  context,
}) => {
  await context.grantPermissions(['clipboard-read', 'clipboard-write'])
  const requests: string[] = []
  page.on('request', (request) => requests.push(request.url()))
  await page.goto('/')
  await page.evaluate(async () => {
    await navigator.serviceWorker.ready
  })
  expect(requests.filter((url) => /\/(?:babel|estree|standalone|html|postcss)-/.test(url))).toEqual(
    [],
  )
  await page.goto('/tools/code-formatter')
  await page
    .getByLabel('Code input')
    .fill('<div><b>Hello</b><script>window.ran=true</script></div>')
  await page.getByRole('button', { name: 'Format code' }).click()
  await expect(page.getByLabel('Formatted code')).toContainText('window.ran=true')
  expect(await page.evaluate(() => Reflect.get(window, 'ran'))).toBeUndefined()
  await page.getByRole('button', { name: 'CSS', exact: true }).click()
  await page.getByLabel('Code input').fill('a{color:red}')
  await page.getByRole('button', { name: 'Format code' }).click()
  await expect(page.getByLabel('Formatted code')).toContainText('color: red')
  await page.getByRole('button', { name: 'JavaScript', exact: true }).click()
  await page.getByLabel('Code input').fill('function f(){return 1}')
  await page.getByLabel('Indentation').selectOption('4')
  await page.getByRole('button', { name: 'Format code' }).click()
  await expect(page.getByLabel('Formatted code')).toContainText('    return 1;')
  await page.getByRole('button', { name: 'Copy output' }).click()
  await expect.poll(() => page.evaluate(() => navigator.clipboard.readText())).toContain('return 1')
  const download = page.waitForEvent('download')
  await page.getByRole('button', { name: 'Download', exact: true }).click()
  expect((await download).suggestedFilename()).toBe('formatted.js')
  await page.getByLabel('Code input').fill('const =')
  await page.getByRole('button', { name: 'Format code' }).click()
  await expect(page.getByRole('alert')).toBeVisible()
  await expect(page.getByLabel('Formatted code')).toHaveValue('')
})
test('Workspace multi-select filters, ZIP, transactional delete and portable backup restore', async ({
  page,
}) => {
  await page.goto('/workspace')
  await page
    .locator('input[type=file]')
    .setInputFiles([
      note('a.txt'),
      note('b.txt'),
      { name: 'data.json', mimeType: 'application/json', buffer: Buffer.from('{"local":true}') },
    ])
  await expect(page.locator('.workspace-file')).toHaveCount(3)
  await page.getByRole('button', { name: 'More actions for a.txt' }).click()
  await page.getByRole('menuitem', { name: 'Pin a.txt' }).click()
  await page.getByRole('button', { name: 'Export Workspace', exact: true }).click()
  await expect(page.getByRole('region', { name: 'File output' })).toBeVisible()
  const backup = await downloadOutput(page)
  await page.getByRole('button', { name: 'Clear archive result' }).click()
  const manifest = JSON.parse(new TextDecoder().decode(unzipSync(backup.buffer)['manifest.json']))
  expect(manifest.files.find((file: { name: string }) => file.name === 'a.txt').pinned).toBe(true)
  await page.getByRole('button', { name: 'Select files', exact: true }).click()
  await page.getByLabel('Search files').fill('.txt')
  await page.getByRole('button', { name: 'Select all visible' }).click()
  await expect(page.getByText('2 files selected.', { exact: false })).toBeVisible()
  await page.getByRole('button', { name: 'ZIP selected' }).click()
  await expect(page.getByRole('region', { name: 'File output' })).toBeVisible()
  const selected = await downloadOutput(page)
  expect(Object.keys(unzipSync(selected.buffer))).toEqual(['a.txt', 'b.txt'])
  await page.getByRole('button', { name: 'Clear archive result' }).click()
  await page.getByRole('button', { name: 'Delete selected', exact: true }).click()
  await expect(page.getByRole('dialog', { name: 'Delete 2 selected files?' })).toBeVisible()
  await page.getByRole('button', { name: 'Cancel', exact: true }).click()
  await expect(page.locator('.workspace-file')).toHaveCount(2)
  await page.getByRole('button', { name: 'Delete selected', exact: true }).click()
  await page.getByRole('button', { name: 'Confirm delete selected' }).click()
  await page.getByLabel('Search files').fill('')
  await expect(page.locator('.workspace-file')).toHaveCount(1)
  await page.getByRole('button', { name: 'Import Workspace backup' }).click()
  await page.getByLabel('Workspace backup file').setInputFiles(backup)
  await expect(page.getByRole('dialog', { name: 'Import Workspace backup?' })).toContainText(
    '3 validated files',
  )
  await page.getByRole('button', { name: 'Confirm import' }).click()
  await expect(page.locator('.workspace-file')).toHaveCount(4)
  await expect(page.locator('.workspace-file')).toContainText(['a.txt'])
  await expect(page.getByRole('heading', { name: 'data-2.json', exact: true })).toBeVisible()
  await page.reload()
  await expect(page.locator('.workspace-file')).toHaveCount(4)
  await expect(page.getByRole('checkbox', { name: /Select / })).toHaveCount(0)
})
test('ZIP traversal and malformed backups fail without changing Workspace', async ({ page }) => {
  await page.goto('/tools/zip')
  await page.getByRole('button', { name: 'Extract ZIP', exact: true }).click()
  await page.locator('input[type=file]').setInputFiles({
    name: 'bad.zip',
    mimeType: 'application/zip',
    buffer: Buffer.from(zipSync({ '../private': strToU8('x') })),
  })
  await page.getByRole('button', { name: 'Inspect ZIP' }).click()
  await expect(page.getByRole('alert')).toContainText('Unsafe ZIP path')
  await page.goto('/workspace')
  await page.locator('input[type=file]').setInputFiles(note('keep.txt'))
  await expect(page.locator('.workspace-file')).toHaveCount(1)
  await page.getByRole('button', { name: 'Import Workspace backup' }).click()
  await page.getByLabel('Workspace backup file').setInputFiles({
    name: 'bad.zip',
    mimeType: 'application/zip',
    buffer: Buffer.from(zipSync({ 'manifest.json': strToU8('{"schemaVersion":99}') })),
  })
  await expect(page.getByRole('alert')).toContainText('schema version')
  await expect(page.locator('.workspace-file')).toHaveCount(1)
})
for (const theme of ['light', 'dark'] as const)
  test(`v3.3 loaded controls, dialogs and selection are accessible/responsive in ${theme}`, async ({
    page,
  }) => {
    test.setTimeout(90000)
    await page.emulateMedia({ colorScheme: theme, reducedMotion: 'reduce' })
    for (const route of [
      '/tools/xml',
      '/tools/code-formatter',
      '/tools/zip',
      '/workspace',
      '/settings',
    ]) {
      await page.goto(route)
      if (route === '/workspace') {
        await page.locator('input[type=file]').setInputFiles(note('accessible.txt'))
        await expect(page.locator('.workspace-file')).toHaveCount(1)
        await page.getByRole('button', { name: 'Select files', exact: true }).click()
        await page.getByRole('checkbox', { name: 'Select accessible.txt' }).check()
      }
      if (route === '/tools/zip') {
        await page.getByRole('button', { name: 'Extract ZIP', exact: true }).click()
        await page.locator('input[type=file]').setInputFiles({
          name: 'entries.zip',
          mimeType: 'application/zip',
          buffer: Buffer.from(zipSync({ 'a.txt': strToU8('hello') })),
        })
        await page.getByRole('button', { name: 'Inspect ZIP' }).click()
        await expect(page.getByRole('checkbox', { name: 'Extract a.txt' })).toBeVisible()
      }
      for (const width of [320, 375, 768, 1024, 1440, 1920]) {
        await page.setViewportSize({ width, height: 900 })
        expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
          true,
        )
      }
      expect(
        (await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze())
          .violations,
      ).toEqual([])
      if (route === '/workspace') {
        await page.getByRole('button', { name: 'Delete selected', exact: true }).click()
        expect(
          (await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa']).analyze()).violations,
        ).toEqual([])
        await page.keyboard.press('Escape')
      }
    }
  })
