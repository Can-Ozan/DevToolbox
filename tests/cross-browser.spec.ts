import { test, expect } from '@playwright/test'
import { PDFDocument } from 'pdf-lib'
import { readFile } from 'node:fs/promises'
import AxeBuilder from '@axe-core/playwright'

for (const format of ['image/png', 'image/jpeg'] as const) {
  test(`text-only PDF exports readable ${format} pages and releases replaced previews`, async ({
    page,
  }) => {
    await page.addInitScript(() => {
      const live = new Set<string>()
      const create = URL.createObjectURL.bind(URL)
      const revoke = URL.revokeObjectURL.bind(URL)
      Object.assign(window, { livePdfPreviewURLs: live })
      URL.createObjectURL = (blob) => {
        const url = create(blob)
        live.add(url)
        return url
      }
      URL.revokeObjectURL = (url) => {
        live.delete(url)
        revoke(url)
      }
    })
    const pdf = await PDFDocument.create()
    // No painted page background: this reproduces the formerly black PNG export.
    pdf.addPage([320, 180]).drawText('Readable PDF text', { x: 20, y: 100, size: 18 })
    await page.goto('/tools/pdf-to-images')
    await page.locator('input[type=file]').setInputFiles({
      name: 'text-only.pdf',
      mimeType: 'application/pdf',
      buffer: Buffer.from(await pdf.save()),
    })
    await page.getByLabel('Output format').selectOption(format)
    for (const scale of [1, 2]) {
      await page.getByLabel('Resolution').selectOption(String(scale))
      await expect
        .poll(() => page.evaluate(() => Reflect.get(window, 'livePdfPreviewURLs').size))
        .toBe(0)
      await page.getByRole('button', { name: 'Render images', exact: true }).press('Enter')
      const preview = page.getByAltText('Output preview')
      await expect(preview).toBeVisible()
      await expect
        .poll(() => preview.evaluate((img: HTMLImageElement) => img.naturalWidth))
        .toBe(320 * scale)
      const pixels = await preview.evaluate((img: HTMLImageElement) => {
        const canvas = document.createElement('canvas')
        canvas.width = img.naturalWidth
        canvas.height = img.naturalHeight
        const ctx = canvas.getContext('2d')!
        ctx.drawImage(img, 0, 0)
        const data = ctx.getImageData(0, 0, canvas.width, canvas.height).data
        let white = 0,
          dark = 0,
          transparent = 0
        for (let i = 0; i < data.length; i += 4) {
          if (data[i] > 240 && data[i + 1] > 240 && data[i + 2] > 240) white++
          if (data[i] < 30 && data[i + 1] < 30 && data[i + 2] < 30) dark++
          if (data[i + 3] !== 255) transparent++
        }
        return {
          width: canvas.width,
          height: canvas.height,
          background: Array.from(data.slice(0, 4)),
          white,
          dark,
          transparent,
        }
      })
      expect(pixels.width).toBe(320 * scale)
      expect(pixels.height).toBe(180 * scale)
      expect(pixels.background).toEqual([255, 255, 255, 255])
      expect(pixels.white).toBeGreaterThan(pixels.width * pixels.height * 0.9)
      expect(pixels.dark).toBeGreaterThan(100) // Real text, not an empty white page.
      expect(pixels.dark).toBeLessThan(pixels.width * pixels.height * 0.1)
      expect(pixels.transparent).toBe(0)
      const downloading = page.waitForEvent('download')
      await page.getByRole('button', { name: 'Download', exact: true }).click()
      const bytes = await readFile((await (await downloading).path())!)
      expect(bytes.subarray(0, format === 'image/png' ? 8 : 2).toString('hex')).toBe(
        format === 'image/png' ? '89504e470d0a1a0a' : 'ffd8',
      )
    }
    await page.keyboard.press('Control+k')
    await page
      .getByRole('combobox', { name: 'Search tools, files and actions' })
      .fill('open settings')
    await page.keyboard.press('Enter')
    await expect(page).toHaveURL('/settings')
    await expect
      .poll(() => page.evaluate(() => Reflect.get(window, 'livePdfPreviewURLs').size))
      .toBe(0)
  })
}

for (const theme of ['light', 'dark'] as const) {
  test(`Markdown task-list names, states and accessibility in ${theme}`, async ({ page }) => {
    await page.emulateMedia({ colorScheme: theme, reducedMotion: 'reduce' })
    await page.goto('/tools/markdown')
    await page
      .getByLabel('Markdown input')
      .fill(
        '- [x] **Ship** `v4` & review\n' +
          '- [ ] Read [release notes](https://example.com)\n' +
          '- [ ] Parent task\n' +
          '  - [x] Nested 子任务\n\n' +
          '- [ ] Multi-line\n  task text\n\n  Further details',
      )
    const preview = page.locator('.markdown-preview')
    await expect(preview.getByRole('checkbox')).toHaveCount(5)
    for (const [name, checked] of [
      ['Ship v4 & review', true],
      ['Read release notes', false],
      ['Parent task', false],
      ['Nested 子任务', true],
      ['Multi-line task text', false],
    ] as const) {
      const checkbox = preview.getByRole('checkbox', { name, exact: true })
      await expect(checkbox).toBeDisabled()
      await expect(checkbox).toBeChecked({ checked })
    }
    const result = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21aa'])
      .analyze()
    expect(result.violations).toEqual([])
  })
}

const workspaceTest = test.extend({
  context: async ({ browserName, context, playwright, baseURL, contextOptions }, runTest) => {
    if (browserName !== 'webkit') return runTest(context)
    // WebKit's ephemeral/private context rejects IndexedDB Blob writes.
    // A fresh temporary persistent profile exercises the normal file-vault lifecycle.
    // An empty userDataDir lets Playwright create and remove the temporary profile.
    const persistent = await playwright.webkit.launchPersistentContext('', {
      ...contextOptions,
      baseURL,
    })
    try {
      await runTest(persistent)
    } finally {
      await persistent.close()
    }
  },
})

async function image(page: import('@playwright/test').Page) {
  const data = await page.evaluate(() => {
    const c = document.createElement('canvas')
    c.width = 80
    c.height = 40
    const ctx = c.getContext('2d')!
    ctx.fillStyle = '#8765dc'
    ctx.fillRect(0, 0, 80, 40)
    return c.toDataURL().split(',')[1]
  })
  return { name: 'cross.png', mimeType: 'image/png', buffer: Buffer.from(data, 'base64') }
}
test('cross-browser routing, keyboard search, responsive layout and optional PWA status', async ({
  page,
}) => {
  const errors: string[] = []
  page.on('pageerror', (error) => errors.push(error.message))
  await page.goto('/')
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
  await page.keyboard.press('Control+k')
  await page.getByRole('combobox', { name: 'Search tools, files and actions' }).fill('xml')
  await page.keyboard.press('Enter')
  await expect(page).toHaveURL('/tools/xml')
  await page.reload()
  await expect(page.getByRole('button', { name: 'Format XML', exact: true })).toBeVisible()
  for (const width of [320, 375, 768, 1024, 1440, 1920]) {
    await page.setViewportSize({ width, height: 900 })
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
  }
  await page.goto('/settings')
  await expect(page.getByRole('heading', { name: 'Install & offline' })).toBeVisible()
  await page.evaluate(() => {
    Object.defineProperty(navigator, 'onLine', { value: false, configurable: true })
    window.dispatchEvent(new Event('offline'))
  })
  await expect(page.locator('.connection-status')).toContainText('Offline')
  await page.evaluate(() => {
    Object.defineProperty(navigator, 'onLine', { value: true, configurable: true })
    window.dispatchEvent(new Event('online'))
  })
  await expect(page.locator('.connection-status')).toContainText('Online')
  expect(errors).toEqual([])
})
workspaceTest(
  'cross-browser Workspace persistence, preview and crop release object URLs',
  async ({ page }) => {
    await page.addInitScript(() => {
      const create = URL.createObjectURL.bind(URL),
        revoke = URL.revokeObjectURL.bind(URL),
        live = new Set<string>()
      Object.assign(window, { liveURLs: live })
      URL.createObjectURL = (value) => {
        const url = create(value)
        live.add(url)
        return url
      }
      URL.revokeObjectURL = (url) => {
        live.delete(url)
        revoke(url)
      }
    })
    await page.goto('/workspace')
    await expect(page.getByRole('heading', { name: 'Your Workspace is empty.' })).toBeVisible()
    await expect(page.getByText('Loading Workspace…')).not.toBeVisible()
    const uploaded = await image(page)
    await page.locator('input[type=file]').setInputFiles(uploaded)
    await expect(page.getByRole('button', { name: 'Import files', exact: true })).toBeEnabled()
    await expect(page.getByRole('alert')).toHaveCount(0)
    await expect(page.locator('.workspace-file')).toHaveCount(1)
    await page.reload()
    await expect(page.locator('.workspace-file')).toContainText('cross.png')
    await page.getByRole('button', { name: 'More actions for cross.png' }).click()
    const downloading = page.waitForEvent('download')
    await page.getByRole('menuitem', { name: 'Download cross.png' }).click()
    const download = await downloading
    expect(await readFile((await download.path())!)).toEqual(uploaded.buffer)
    await page.getByRole('button', { name: 'Preview cross.png', exact: true }).click()
    await expect(page.getByAltText('Preview of cross.png')).toBeVisible()
    await expect(page.locator('.file-metadata')).toContainText('image/png')
    await page.keyboard.press('Escape')
    await page.goto('/tools/image-cropper')
    await page.getByRole('button', { name: 'Choose from Workspace' }).click()
    await page.getByRole('button', { name: /Use cross.png/ }).click()
    await expect(page.getByAltText('Input preview')).toBeVisible()
    await page.getByLabel('Crop width', { exact: true }).fill('40')
    await page.getByRole('button', { name: 'Crop image', exact: true }).click()
    await expect(page.getByAltText('Output preview')).toBeVisible()
    await expect
      .poll(() =>
        page.getByAltText('Output preview').evaluate((img: HTMLImageElement) => img.naturalWidth),
      )
      .toBe(40)
    await page.keyboard.press('Control+k')
    await page
      .getByRole('combobox', { name: 'Search tools, files and actions' })
      .fill('open settings')
    await page.keyboard.press('Enter')
    await expect(page).toHaveURL('/settings')
    await expect.poll(() => page.evaluate(() => Reflect.get(window, 'liveURLs').size)).toBe(0)
  },
)
test('cross-browser Workspace write rejection restores controls and reports the error', async ({
  page,
  browserName,
}) => {
  const errors: string[] = []
  page.on('pageerror', (error) => errors.push(error.message))
  if (browserName !== 'webkit')
    await page.addInitScript(() => {
      const original = IDBObjectStore.prototype.add
      IDBObjectStore.prototype.add = function (...args) {
        // A real asynchronous constraint error; metadata must also roll back.
        if (this.name === 'blobs') original.call(this, new Blob(['duplicate']), args[1])
        return original.apply(this, args)
      }
    })
  // WebKit's default private context produces the native Blob preparation error.
  await page.goto('/workspace')
  await expect(page.getByRole('heading', { name: 'Your Workspace is empty.' })).toBeVisible()
  await page.locator('input[type=file]').setInputFiles(await image(page))
  await expect(page.getByRole('alert')).toBeVisible()
  if (browserName === 'webkit')
    await expect(page.getByRole('alert')).toContainText('IndexedDB storage is unavailable')
  await expect(page.getByRole('button', { name: 'Import files', exact: true })).toBeEnabled()
  await expect(page.locator('.workspace-file')).toHaveCount(0)
  await page.reload()
  await expect(page.getByRole('heading', { name: 'Your Workspace is empty.' })).toBeVisible()
  await expect(page.locator('.workspace-file')).toHaveCount(0)
  expect(errors).toEqual([])
})

test('cross-browser PDF rendering uses the bundled local worker', async ({ page }) => {
  const errors: string[] = []
  page.on('pageerror', (error) => errors.push(error.message))
  const pdf = await PDFDocument.create()
  pdf.addPage([200, 100]).drawText('Local PDF', { x: 10, y: 40, size: 15 })
  await page.goto('/tools/pdf-to-images')
  await page.locator('input[type=file]').setInputFiles({
    name: 'cross.pdf',
    mimeType: 'application/pdf',
    buffer: Buffer.from(await pdf.save()),
  })
  await page.getByRole('button', { name: 'Render images' }).click()
  await expect(page.getByAltText('Output preview')).toBeVisible()
  await expect
    .poll(() =>
      page.getByAltText('Output preview').evaluate((img: HTMLImageElement) => img.naturalWidth),
    )
    .toBe(200)
  expect(errors).toEqual([])
})
test('cross-browser native XML and local formatter workers', async ({ page }) => {
  await page.goto('/tools/xml')
  await page.getByLabel('XML input').fill('<a><b/></a>')
  // The asynchronous PWA banner can shift the page during a pointer click.
  await page.getByRole('button', { name: 'Format XML', exact: true }).press('Enter')
  await expect(page.getByLabel('XML output')).toContainText('  <b/>')
  await page.getByLabel('XML input').fill('<a><b></a>')
  await page.getByRole('button', { name: 'Validate XML' }).click()
  await expect(page.getByRole('alert')).toBeVisible()
  await page.goto('/tools/code-formatter')
  await page.getByRole('button', { name: 'JavaScript', exact: true }).click()
  await page.getByLabel('Code input').fill('const a={value:1};')
  await page.getByRole('button', { name: 'Format code' }).click()
  await expect(page.getByLabel('Formatted code')).toContainText('value: 1')
})
test('cross-browser ZIP creation, download and explicit extraction', async ({ page }) => {
  await page.goto('/tools/zip')
  await page
    .locator('input[type=file]')
    .setInputFiles([
      { name: 'a.txt', mimeType: 'text/plain', buffer: Buffer.from('local archive') },
    ])
  await page.getByRole('button', { name: 'Generate ZIP' }).click()
  await expect(page.getByRole('region', { name: 'File output' })).toBeVisible()
  const downloading = page.waitForEvent('download')
  await page.getByRole('button', { name: 'Download', exact: true }).click()
  const download = await downloading
  expect(download.suggestedFilename()).toBe('archive.zip')
  const path = await download.path()
  await page.getByRole('button', { name: 'Extract ZIP', exact: true }).click()
  await page.locator('input[type=file]').setInputFiles({
    name: 'archive.zip',
    mimeType: 'application/zip',
    buffer: await readFile(path!),
  })
  await page.getByRole('button', { name: 'Inspect ZIP' }).click()
  await page.getByRole('checkbox', { name: 'Extract a.txt', exact: true }).check()
  await page.getByRole('button', { name: 'Extract selected (1)', exact: true }).click()
  await expect(page.getByRole('region', { name: 'File output' })).toContainText('a.txt')
})
