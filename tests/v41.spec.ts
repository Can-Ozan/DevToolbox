import { test as base, expect } from '@playwright/test'
import { readFile } from 'node:fs/promises'
import AxeBuilder from '@axe-core/playwright'
import { zipSync, strToU8 } from 'fflate'
import { PDFDocument } from 'pdf-lib'

// Match normal WebKit storage: ephemeral/private profiles reject IndexedDB Blob writes.
const test = base.extend({
  context: async ({ browserName, context, playwright, baseURL, contextOptions }, provide) => {
    if (browserName !== 'webkit') return provide(context)
    const persistent = await playwright.webkit.launchPersistentContext('', {
      ...contextOptions,
      baseURL,
    })
    try {
      await provide(persistent)
    } finally {
      await persistent.close()
    }
  },
})
const textFile = {
  name: 'alpha.json',
  mimeType: 'application/json',
  buffer: Buffer.from('{"hello":"world"}'),
}

const packageInput = JSON.stringify({
  name: 'demo-世界',
  version: '1.0.0',
  private: true,
  type: 'module',
  dependencies: { react: 'latest' },
  devDependencies: { react: '^19', vite: '^8' },
  scripts: { dev: 'vite', test: '', postinstall: '<script>throw new Error("unsafe")</script>' },
  repository: 'https://example.invalid/private-repo',
})
const longPackageName = `@scope/${'dependency'.repeat(20)}`
const longPackageInput = JSON.stringify({
  name: 'project'.repeat(30),
  version: `1.0.0-${'abcdef'.repeat(40)}`,
  private: true,
  type: 'module',
  dependencies: { [longPackageName]: `1.0.0-${'abcdef'.repeat(40)}` },
  // The duplicate declaration includes the long name in a diagnostic as well.
  devDependencies: { [longPackageName]: 'latest' },
  scripts: { build: `node ${'command'.repeat(60)}`, ['script'.repeat(40)]: '' },
  repository: `https://example.invalid/${'repository'.repeat(30)}`,
})

test('Package analyzer paste/file/Workspace, diagnostics, copy/download, errors and privacy', async ({
  page,
  context,
  browserName,
}) => {
  if (browserName === 'chromium')
    await context.grantPermissions(['clipboard-read', 'clipboard-write'])
  const external: string[] = []
  const errors: string[] = []
  page.on('pageerror', (error) => errors.push(error.message))
  page.on('request', (request) => {
    if (
      !request.url().startsWith('http://127.0.0.1:4173') &&
      !request.url().startsWith('blob:') &&
      !request.url().startsWith('data:')
    )
      external.push(request.url())
  })
  await page.goto('/tools/package-json')
  await page.getByLabel('package.json input', { exact: true }).fill(packageInput)
  await page.getByRole('button', { name: 'Analyze package.json', exact: true }).click()
  await expect(page.getByRole('region', { name: 'Project summary' })).toContainText('demo-世界')
  await expect(page.getByRole('region', { name: 'Diagnostics' })).toContainText(
    'both runtime and development',
  )
  await expect(page.getByRole('region', { name: 'Scripts', exact: true })).toContainText('<script>')
  await page.getByRole('button', { name: 'Copy summary', exact: true }).click()
  await expect(page.getByText('Copied to clipboard', { exact: true })).toBeVisible()
  if (browserName === 'chromium')
    expect(await page.evaluate(() => navigator.clipboard.readText())).toContain('name: demo-世界')
  const downloading = page.waitForEvent('download')
  await page.getByRole('button', { name: 'Download', exact: true }).click()
  const download = await downloading
  expect(download.suggestedFilename()).toBe('package-analysis.json')
  const downloaded = JSON.parse(await readFile((await download.path())!, 'utf8'))
  expect(downloaded.overview).toContainEqual(['name', 'demo-世界'])
  await page.getByRole('button', { name: 'Clear', exact: true }).click()
  await expect(page.getByRole('region', { name: 'Project summary' })).toHaveCount(0)
  await expect(page.getByRole('button', { name: 'Copy summary', exact: true })).toBeDisabled()
  await page.getByLabel('package.json input', { exact: true }).fill('{broken')
  await page.getByRole('button', { name: 'Analyze package.json', exact: true }).click()
  await expect(
    page.getByText('Invalid JSON. Check quotes, commas and brackets.', { exact: true }),
  ).toBeVisible()
  await page.getByLabel('Upload from device', { exact: true }).setInputFiles({
    name: 'package.json',
    mimeType: 'application/json',
    buffer: Buffer.from(packageInput),
  })
  await expect(page.getByRole('region', { name: 'Project summary' })).toContainText('demo-世界')
  await page.goto('/workspace')
  await page.locator('input[type=file]').setInputFiles({
    name: 'package.json',
    mimeType: 'application/json',
    buffer: Buffer.from(packageInput),
  })
  await expect(page.locator('.workspace-file')).toHaveCount(1)
  await page.reload()
  await page.goto('/tools/file-inspector')
  await page.getByRole('button', { name: 'Choose from Workspace', exact: true }).click()
  await page.getByRole('button', { name: /Use package.json/ }).click()
  await page.getByRole('button', { name: 'Open Package.json Analyzer', exact: true }).click()
  await expect(page).toHaveURL(/package-json\?file=/)
  await expect(page.getByRole('region', { name: 'Project summary' })).toContainText('demo-世界')
  await page.reload()
  await expect(page.getByRole('region', { name: 'Project summary' })).toContainText('demo-世界')
  expect(external).toEqual([])
  expect(errors).toEqual([])
})

for (const theme of ['light', 'dark'] as const) {
  for (const [sample, input] of [
    ['results', packageInput],
    ['long values', longPackageInput],
  ]) {
    test(`Package analyzer responsive ${sample} and accessibility in ${theme}`, async ({
      page,
    }) => {
      await page.emulateMedia({ colorScheme: theme })
      await page.goto('/tools/package-json')
      await expect(page.locator('html')).toHaveAttribute('data-theme', theme)
      await page.getByLabel('package.json input', { exact: true }).fill(input)
      await page.getByRole('button', { name: 'Analyze package.json', exact: true }).click()
      const dependencies = page.getByRole('region', { name: 'Dependencies', exact: true })
      for (const details of await dependencies.locator('details').all()) {
        await details.locator('summary').click()
        await expect(details).toHaveAttribute('open', '')
      }
      for (const width of [320, 375, 768, 1024, 1440]) {
        await test.step(`${sample} at ${width}px`, async () => {
          await page.setViewportSize({ width, height: 900 })
          expect(
            await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth),
          ).toBe(true)
          // A field can spill into panel padding without widening the page on every OS/font.
          const overflowingText = await page
            .locator('.file-output dt, .file-output dd, .file-output li, .file-output summary')
            .evaluateAll((elements) =>
              elements
                .filter((element) => element.scrollWidth > element.clientWidth)
                .map((element) => ({
                  text: element.textContent,
                  width: element.clientWidth,
                  scrollWidth: element.scrollWidth,
                })),
            )
          expect(overflowingText).toEqual([])
          if (width === 320 || width === 1440) {
            expect(
              (await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze())
                .violations,
            ).toEqual([])
          }
        })
      }
    })
  }
}

test('Inspector detects image/PDF/ZIP, validates JSON, and hands off persisted bytes', async ({
  page,
}) => {
  const external: string[] = []
  page.on('request', (request) => {
    if (
      !request.url().startsWith('http://127.0.0.1:4173') &&
      !request.url().startsWith('blob:') &&
      !request.url().startsWith('data:')
    )
      external.push(request.url())
  })
  const errors: string[] = []
  page.on('pageerror', (error) => errors.push(error.message))
  await page.goto('/tools/file-inspector')
  const png = await page.evaluate(() => {
    const canvas = document.createElement('canvas')
    canvas.width = 24
    canvas.height = 12
    return canvas.toDataURL().split(',')[1]
  })
  await page.getByLabel('Upload from device', { exact: true }).setInputFiles({
    name: 'misnamed.bin',
    mimeType: 'application/octet-stream',
    buffer: Buffer.from(png, 'base64'),
  })
  await expect(page.getByRole('region', { name: 'File inspection' })).toContainText('24 × 12 px')
  await page.getByRole('button', { name: 'Open Image Resizer', exact: true }).click()
  await expect(page).toHaveURL(/image-resizer\?file=/)
  await expect(page.getByLabel('Width', { exact: true })).toHaveValue('24')
  await page.goto('/tools/file-inspector')
  await page.getByRole('button', { name: 'Choose from Workspace', exact: true }).click()
  await page.getByRole('button', { name: /Use misnamed.bin/ }).click()
  await expect(page.getByRole('region', { name: 'File inspection' })).toContainText('24 × 12 px')
  await page.getByRole('button', { name: 'Open Image Metadata Viewer', exact: true }).click()
  await expect(page).toHaveURL(/image-metadata\?file=/)
  await page.goto('/workspace')
  await expect(page.locator('.workspace-file')).toHaveCount(1)
  const pdf = await PDFDocument.create()
  pdf.addPage([80, 60])
  pdf.addPage([80, 60])
  await page.goto('/tools/file-inspector')
  await page.getByLabel('Upload from device', { exact: true }).setInputFiles({
    name: 'small.pdf',
    mimeType: 'application/pdf',
    buffer: Buffer.from(await pdf.save()),
  })
  await expect(
    page
      .getByRole('region', { name: 'File inspection' })
      .locator('div')
      .filter({ has: page.locator('dt', { hasText: /^Pages$/ }) }),
  ).toContainText('2')
  await expect(page.getByRole('button', { name: 'Open PDF Splitter', exact: true })).toBeVisible()
  await page.getByRole('button', { name: 'Clear file', exact: true }).click()
  await expect(page.getByRole('region', { name: 'File inspection' })).toHaveCount(0)
  await page.getByLabel('Upload from device', { exact: true }).setInputFiles({
    name: 'sample.zip',
    mimeType: 'application/zip',
    buffer: Buffer.from(zipSync({ 'one.txt': strToU8('one'), 'two.json': strToU8('{}') })),
  })
  await expect(page.getByRole('button', { name: 'Open ZIP Utilities', exact: true })).toBeVisible()
  await page.getByRole('button', { name: 'Clear file', exact: true }).click()
  await page.getByLabel('Upload from device', { exact: true }).setInputFiles(textFile)
  await page.getByRole('button', { name: 'Open JSON Formatter', exact: true }).click()
  await expect(page.getByLabel('JSON input', { exact: true })).toHaveValue('{"hello":"world"}')
  await page.getByRole('button', { name: 'Format JSON', exact: true }).click()
  await expect(page.getByLabel('JSON output', { exact: true })).toHaveValue(/"hello": "world"/)
  await page.goto('/tools/file-inspector')
  await page
    .getByLabel('Upload from device', { exact: true })
    .setInputFiles({ name: 'bad.json', mimeType: 'application/json', buffer: Buffer.from('{bad') })
  await expect(page.getByRole('region', { name: 'File inspection' })).toContainText(
    'could not validate',
  )
  await expect(page.getByRole('region', { name: 'Recommended tools' })).toHaveCount(0)
  expect(errors).toEqual([])
  expect(external).toEqual([])
})

for (const theme of ['light', 'dark'] as const) {
  test(`Inspector responsive results and accessibility in ${theme}`, async ({ page }) => {
    await page.emulateMedia({ colorScheme: theme })
    await page.goto('/tools/file-inspector')
    await page.getByLabel('Upload from device', { exact: true }).setInputFiles(textFile)
    await expect(
      page.getByRole('button', { name: 'Open JSON Formatter', exact: true }),
    ).toBeVisible()
    for (const width of [320, 375, 768, 1024, 1440]) {
      await page.setViewportSize({ width, height: 900 })
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
        true,
      )
    }
    await expect(page.locator('html')).toHaveAttribute('data-theme', theme)
    expect(
      (await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze())
        .violations,
    ).toEqual([])
  })
}
test('collections accept legacy v1 backups without changing existing files', async ({ page }) => {
  const bytes = strToU8('legacy content')
  const buffer = Buffer.from(
    zipSync({
      'files/0': bytes,
      'manifest.json': strToU8(
        JSON.stringify({
          schemaVersion: 1,
          exportedAt: '2025-01-01T00:00:00Z',
          files: [
            {
              path: 'files/0',
              name: 'legacy.txt',
              mimeType: 'text/plain',
              size: bytes.length,
              pinned: true,
              createdAt: 1700000000000,
            },
          ],
        }),
      ),
    }),
  )
  await page.goto('/workspace')
  await page.locator('input[type=file]').setInputFiles(textFile)
  await expect(page.locator('.workspace-file')).toHaveCount(1)
  await page.getByRole('button', { name: 'Import Workspace backup', exact: true }).click()
  await page
    .getByLabel('Workspace backup file')
    .setInputFiles({ name: 'v1.zip', mimeType: 'application/zip', buffer })
  await expect(page.getByRole('dialog', { name: 'Import Workspace backup?' })).toContainText(
    '0 collections',
  )
  await page.getByRole('button', { name: 'Confirm import', exact: true }).click()
  await expect(page.locator('.workspace-file')).toHaveCount(2)
  await page.reload()
  await page.getByRole('button', { name: 'Preview legacy.txt', exact: true }).click()
  await expect(page.getByRole('dialog')).toContainText('legacy content')
})

for (const theme of ['light', 'dark'] as const) {
  test(`collections are responsive and accessible in ${theme}`, async ({ page }) => {
    test.setTimeout(90_000)
    await page.emulateMedia({ colorScheme: theme, reducedMotion: 'reduce' })
    await page.goto('/workspace')
    await page.locator('input[type=file]').setInputFiles(textFile)
    await expect(page.locator('.workspace-file')).toHaveCount(1)
    await createCollection(page, 'Portfolio with a long descriptive collection name')
    await page.getByLabel('Collection', { exact: true }).selectOption('')
    await page.getByRole('button', { name: 'More actions for alpha.json' }).click()
    await page.getByRole('menuitem', { name: 'Move alpha.json to collection' }).click()
    await page.getByLabel('Destination collection').selectOption({ index: 1 })
    await page.getByRole('button', { name: 'Apply collection', exact: true }).click()
    await expect(page.getByRole('dialog')).toHaveCount(0)
    for (const width of [320, 375, 768, 1024, 1440]) {
      await page.setViewportSize({ width, height: 900 })
      for (const view of ['Grid', 'List']) {
        await page.getByRole('button', { name: view, exact: true }).click()
        expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
          true,
        )
        const clipped = await page.locator('main button').evaluateAll((items) =>
          items
            .filter((item) => {
              const rect = item.getBoundingClientRect()
              return rect.width && (rect.left < -1 || rect.right > innerWidth + 1)
            })
            .map((item) => item.textContent),
        )
        expect(clipped).toEqual([])
      }
    }
    await expect(page.locator('html')).toHaveAttribute('data-theme', theme)
    expect(
      (await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze())
        .violations,
    ).toEqual([])
    await page.setViewportSize({ width: 320, height: 568 })
    const trigger = page.getByRole('button', { name: 'New collection', exact: true })
    await trigger.focus()
    await trigger.press('Enter')
    await page.getByLabel('Collection name', { exact: true }).fill('Keyboard project')
    expect(
      (await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze())
        .violations,
    ).toEqual([])
    await page.keyboard.press('Escape')
    await expect(trigger).toBeFocused()
    await expect(page.locator('body')).not.toHaveCSS('overflow', 'hidden')
  })
}
async function createCollection(page: import('@playwright/test').Page, name: string) {
  await page.getByRole('button', { name: 'New collection', exact: true }).click()
  await page.getByLabel('Collection name', { exact: true }).fill(name)
  await page.getByRole('button', { name: 'Save collection', exact: true }).click()
  await expect(page.getByRole('dialog')).toHaveCount(0)
}

test('collections create, rename, bulk move, remove assignment and delete without losing files', async ({
  page,
}) => {
  await page.goto('/workspace')
  await expect(page.getByText('Loading Workspace…')).not.toBeVisible()
  await page
    .locator('input[type=file]')
    .setInputFiles([
      textFile,
      { name: 'beta.txt', mimeType: 'text/plain', buffer: Buffer.from('keep me') },
    ])
  await expect(page.locator('.workspace-file')).toHaveCount(2)
  await createCollection(page, 'Portfolio')
  await page.getByLabel('Collection', { exact: true }).selectOption('')
  await page.getByRole('button', { name: 'Select files', exact: true }).click()
  await page.getByRole('button', { name: 'Select all visible', exact: true }).click()
  await page.getByRole('button', { name: 'Move selected to collection', exact: true }).click()
  await page.getByLabel('Destination collection').selectOption({ label: 'Portfolio' })
  await page.getByRole('button', { name: 'Apply collection', exact: true }).click()
  await expect(page.getByRole('dialog')).toHaveCount(0)
  await page.reload()
  await page.getByLabel('Collection', { exact: true }).selectOption({ label: 'Portfolio (2)' })
  await expect(page.locator('.workspace-file')).toHaveCount(2)
  await page.getByRole('button', { name: 'Rename collection', exact: true }).click()
  await page.getByLabel('Collection name', { exact: true }).fill('API Project')
  await page.getByRole('button', { name: 'Save collection', exact: true }).click()
  await expect(page.getByRole('dialog')).toHaveCount(0)
  await page.getByRole('button', { name: 'More actions for alpha.json' }).click()
  await page.getByRole('menuitem', { name: 'Move alpha.json to collection' }).click()
  await page.getByLabel('Destination collection').selectOption('')
  await page.getByRole('button', { name: 'Apply collection', exact: true }).click()
  await expect(page.locator('.workspace-file')).toHaveCount(1)
  await page.getByRole('button', { name: 'Delete collection', exact: true }).click()
  await expect(page.getByRole('dialog')).toContainText('files will remain')
  await page.getByRole('button', { name: 'Confirm delete collection', exact: true }).click()
  await expect(page.locator('.workspace-file')).toHaveCount(2)
  await page.reload()
  await expect(page.locator('.workspace-file')).toHaveCount(2)
  await expect(page.getByLabel('Collection', { exact: true }).locator('option')).toHaveCount(2)
})

test('collections and empty projects survive Workspace backup restore', async ({ page }) => {
  await page.goto('/workspace')
  await page.locator('input[type=file]').setInputFiles(textFile)
  await expect(page.locator('.workspace-file')).toHaveCount(1)
  await createCollection(page, 'API')
  await createCollection(page, 'Empty project')
  await page.getByLabel('Collection', { exact: true }).selectOption('')
  await page.getByRole('button', { name: 'More actions for alpha.json' }).click()
  await page.getByRole('menuitem', { name: 'Move alpha.json to collection' }).click()
  await page.getByLabel('Destination collection').selectOption({ label: 'API' })
  await page.getByRole('button', { name: 'Apply collection', exact: true }).click()
  await expect(page.getByRole('dialog')).toHaveCount(0)
  await page.getByRole('button', { name: 'Export Workspace', exact: true }).click()
  const output = page.getByRole('region', { name: 'File output' })
  await expect(output).toBeVisible()
  const downloading = page.waitForEvent('download')
  await output.getByRole('button', { name: 'Download', exact: true }).click()
  const buffer = await readFile((await (await downloading).path())!)
  await page.getByRole('button', { name: 'Clear Workspace', exact: true }).click()
  await page.getByRole('button', { name: 'Confirm clear', exact: true }).click()
  await expect(page.locator('.workspace-file')).toHaveCount(0)
  await page.getByRole('button', { name: 'Import Workspace backup', exact: true }).click()
  await page
    .getByLabel('Workspace backup file')
    .setInputFiles({ name: 'backup.zip', mimeType: 'application/zip', buffer })
  await expect(page.getByRole('dialog', { name: 'Import Workspace backup?' })).toContainText(
    '2 collections',
  )
  await page.getByRole('button', { name: 'Confirm import', exact: true }).click()
  await expect(page.locator('.workspace-file')).toHaveCount(1)
  await page.reload()
  await page.getByLabel('Collection', { exact: true }).selectOption({ label: 'API (1)' })
  await expect(page.locator('.workspace-file')).toContainText('alpha.json')
  await page.getByLabel('Collection', { exact: true }).selectOption({ label: 'Empty project (0)' })
  await expect(page.locator('.workspace-file')).toHaveCount(0)
})
