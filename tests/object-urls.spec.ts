import { test, expect, type Page } from '@playwright/test'
import { PDFDocument } from 'pdf-lib'

type Audit = {
  live: Record<string, string>
  created: string[]
  revoked: string[]
  brokenImages: string[]
  workers: number
}
const audit = (page: Page) => page.evaluate(() => Reflect.get(window, 'urlAudit') as Audit)
async function openTool(page: Page, query: string, path: string) {
  await page.keyboard.press('Control+k')
  await page.getByRole('combobox', { name: 'Search tools, files and actions' }).fill(query)
  await page.keyboard.press('Enter')
  await expect(page).toHaveURL(path)
}
async function makePdf(pages = 2) {
  const pdf = await PDFDocument.create()
  for (let i = 0; i < pages; i++) pdf.addPage([400, 400])
  return {
    name: 'lifecycle.pdf',
    mimeType: 'application/pdf',
    buffer: Buffer.from(await pdf.save()),
  }
}
test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    const state: Audit = { live: {}, created: [], revoked: [], brokenImages: [], workers: 0 }
    Object.assign(window, { urlAudit: state })
    const create = URL.createObjectURL.bind(URL),
      revoke = URL.revokeObjectURL.bind(URL)
    URL.createObjectURL = (value) => {
      const url = create(value)
      state.live[url] = value instanceof Blob ? value.type : 'media'
      state.created.push(url)
      return url
    }
    URL.revokeObjectURL = (url) => {
      delete state.live[url]
      state.revoked.push(url)
      revoke(url)
    }
    document.addEventListener(
      'error',
      (event) => {
        if (event.target instanceof HTMLImageElement && event.target.src.startsWith('blob:'))
          state.brokenImages.push(event.target.src)
      },
      true,
    )
    const OriginalWorker = Worker
    window.Worker = class extends OriginalWorker {
      ended = false
      constructor(url: string | URL, options?: WorkerOptions) {
        super(url, options)
        state.workers++
      }
      terminate() {
        if (!this.ended) {
          this.ended = true
          state.workers--
        }
        super.terminate()
      }
    }
  })
})

test('crop source/result replacements, clear/error, navigation and downloads release their URLs', async ({
  page,
}) => {
  await page.goto('/tools/image-cropper')
  const bytes = await page.evaluate(() => {
    const c = document.createElement('canvas')
    c.width = 80
    c.height = 40
    return c.toDataURL().split(',')[1]
  })
  const image = { name: 'source.png', mimeType: 'image/png', buffer: Buffer.from(bytes, 'base64') }
  await page.locator('input[type=file]').setInputFiles(image)
  await expect(page.getByAltText('Input preview')).toBeVisible()
  const original = await page.getByAltText('Input preview').getAttribute('src')
  for (let i = 0; i < 3; i++) {
    await page.getByRole('button', { name: 'Crop image', exact: true }).click()
    await expect(page.getByAltText('Output preview')).toBeVisible()
    await expect.poll(async () => Object.keys((await audit(page)).live).length).toBe(2)
    const output = await page.getByAltText('Output preview').getAttribute('src')
    const downloading = page.waitForEvent('download')
    await page
      .getByRole('region', { name: 'File output' })
      .getByRole('button', { name: 'Download', exact: true })
      .click()
    await downloading
    await expect.poll(async () => Object.keys((await audit(page)).live).length).toBe(2)
    await page.getByLabel('Crop width', { exact: true }).fill(String(70 - i))
    await expect.poll(async () => (await audit(page)).revoked.includes(output!)).toBe(true)
    await expect.poll(async () => Object.keys((await audit(page)).live)).toEqual([original])
  }
  await page.locator('input[type=file]').setInputFiles({ ...image, name: 'replacement.png' })
  await expect.poll(async () => (await audit(page)).revoked.includes(original!)).toBe(true)
  await expect(page.getByAltText('Input preview')).toBeVisible()
  await page
    .locator('input[type=file]')
    .setInputFiles({ name: 'damaged.png', mimeType: 'image/png', buffer: Buffer.from('invalid') })
  await expect(page.getByRole('alert')).toBeVisible()
  await expect.poll(async () => Object.keys((await audit(page)).live)).toEqual([])
  await page.locator('input[type=file]').setInputFiles(image)
  await expect(page.getByAltText('Input preview')).toBeVisible()
  await openTool(page, 'open settings', '/settings')
  await expect.poll(async () => Object.keys((await audit(page)).live)).toEqual([])
  expect((await audit(page)).brokenImages).toEqual([])
})

test('PDF image batches release every preview and renderer worker on replace, error, cancel and unmount', async ({
  page,
}) => {
  await page.goto('/tools/pdf-to-images')
  await page.locator('input[type=file]').setInputFiles(await makePdf())
  for (let i = 0; i < 3; i++) {
    await page.getByRole('button', { name: 'Render images' }).click()
    await expect(page.getByAltText('Output preview')).toHaveCount(2)
    await expect.poll(async () => (await audit(page)).workers).toBe(0)
    const batch = Object.keys((await audit(page)).live)
    expect(batch).toHaveLength(2)
    expect(Object.values((await audit(page)).live)).toEqual(['image/png', 'image/png'])
    await page.getByLabel('Resolution').selectOption(i % 2 ? '1' : '1.5')
    await expect.poll(async () => Object.keys((await audit(page)).live)).toEqual([])
    expect(batch.every((url) => url.startsWith('blob:'))).toBe(true)
    const state = await audit(page)
    expect(batch.every((url) => state.revoked.includes(url))).toBe(true)
  }
  await page.getByLabel('Page selection').selectOption('custom')
  await page.getByLabel('Page range').fill('1,1')
  await page.getByRole('button', { name: 'Render images' }).click()
  await expect(page.getByRole('alert')).toBeVisible()
  await expect.poll(async () => (await audit(page)).workers).toBe(0)
  expect(Object.keys((await audit(page)).live)).toEqual([])
  await page.getByLabel('Page selection').selectOption('all')
  await page.locator('input[type=file]').setInputFiles(await makePdf(25))
  await page.getByRole('button', { name: 'Render images' }).click()
  await expect.poll(async () => (await audit(page)).workers).toBe(1)
  await page.getByRole('button', { name: 'Cancel processing' }).click()
  await expect.poll(async () => (await audit(page)).workers).toBe(0)
  expect(Object.keys((await audit(page)).live)).toEqual([])
  await page.locator('input[type=file]').setInputFiles(await makePdf())
  await page.getByRole('button', { name: 'Render images' }).click()
  await expect(page.getByAltText('Output preview')).toHaveCount(2)
  await openTool(page, 'open settings', '/settings')
  await expect.poll(async () => Object.keys((await audit(page)).live)).toEqual([])
  await openTool(page, 'raster', '/tools/pdf-to-images')
  await page.locator('input[type=file]').setInputFiles(await makePdf(25))
  await page.getByRole('button', { name: 'Render images' }).click()
  await expect.poll(async () => (await audit(page)).workers).toBe(1)
  await openTool(page, 'open settings', '/settings')
  await expect.poll(async () => (await audit(page)).workers).toBe(0)
  expect(Object.keys((await audit(page)).live)).toEqual([])
  expect((await audit(page)).brokenImages).toEqual([])
})

test('Workspace preview closure and thumbnails release URLs without removing persistent Blobs', async ({
  page,
}) => {
  await page.goto('/workspace')
  const data = await page.evaluate(() => {
    const c = document.createElement('canvas')
    c.width = 40
    c.height = 30
    return c.toDataURL().split(',')[1]
  })
  await page.locator('input[type=file]').setInputFiles({
    name: 'persistent.png',
    mimeType: 'image/png',
    buffer: Buffer.from(data, 'base64'),
  })
  await expect(page.locator('.workspace-file')).toHaveCount(1)
  await page.getByRole('button', { name: 'List', exact: true }).click()
  await expect.poll(async () => Object.keys((await audit(page)).live)).toEqual([])
  for (let i = 0; i < 3; i++) {
    await page.getByRole('button', { name: 'Preview persistent.png' }).click()
    await expect(page.getByAltText('Preview of persistent.png')).toBeVisible()
    expect(Object.keys((await audit(page)).live)).toHaveLength(1)
    await page.keyboard.press('Escape')
    await expect.poll(async () => Object.keys((await audit(page)).live)).toEqual([])
  }
  await page.getByRole('button', { name: 'Grid', exact: true }).click()
  await expect(page.locator('.file-thumbnail img')).toBeVisible()
  await openTool(page, 'open settings', '/settings')
  await expect.poll(async () => Object.keys((await audit(page)).live)).toEqual([])
  await openTool(page, 'open workspace', '/workspace')
  await expect(page.locator('.workspace-file')).toContainText('persistent.png')
  // Thumbnails decode only while their card intersects the viewport.
  await page.locator('.file-thumbnail').scrollIntoViewIfNeeded()
  await expect(page.locator('.file-thumbnail img')).toBeVisible()
  expect((await audit(page)).brokenImages).toEqual([])
})
