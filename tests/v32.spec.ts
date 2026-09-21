import { test, expect, type Page } from '@playwright/test'
import AxeBuilder from '@axe-core/playwright'
import { PDFDocument, rgb, StandardFonts } from 'pdf-lib'
import { readFile } from 'node:fs/promises'

async function image(page: Page) {
  const data = await page.evaluate(() => {
    const canvas = document.createElement('canvas')
    canvas.width = 80
    canvas.height = 40
    const ctx = canvas.getContext('2d')!
    ctx.fillStyle = '#ff0000'
    ctx.fillRect(0, 0, 40, 40)
    return canvas.toDataURL().split(',')[1]
  })
  return { name: 'sample.png', mimeType: 'image/png', buffer: Buffer.from(data, 'base64') }
}
async function pdf(widths = [100, 200]) {
  const doc = await PDFDocument.create()
  const font = await doc.embedFont(StandardFonts.Helvetica)
  for (const width of widths) {
    const page = doc.addPage([width, 150])
    page.drawRectangle({ x: 0, y: 0, width, height: 150, color: rgb(1, 0, 0) })
    page.drawText('DevToolbox', { x: 8, y: 90, size: 12, font })
  }
  return {
    name: 'document.pdf',
    mimeType: 'application/pdf',
    buffer: Buffer.from(await doc.save()),
  }
}
async function dimensions(page: Page, index = 0) {
  return page
    .getByAltText('Output preview')
    .nth(index)
    .evaluate((image: HTMLImageElement) => [image.naturalWidth, image.naturalHeight])
}

test('CSV conversion, quoting, alternate delimiters, copy/download, clear and malformed input', async ({
  page,
  context,
}) => {
  await context.grantPermissions(['clipboard-read', 'clipboard-write'])
  await page.goto('/tools/json-csv')
  const rows = [
    { name: 'Can; "Ozan" 🌍', note: 'one\ntwo' },
    { name: 'Ali', note: '' },
  ]
  await page.getByLabel('JSON input', { exact: true }).fill(JSON.stringify(rows))
  await page.getByLabel('Delimiter').selectOption(';')
  await page.getByRole('button', { name: 'Convert JSON to CSV' }).click()
  await expect(page.getByLabel('CSV output')).toHaveValue(
    'name;note\n"Can; ""Ozan"" 🌍";"one\ntwo"\nAli;',
  )
  await expect(page.getByRole('status').filter({ hasText: '2 rows' })).toContainText('2 columns')
  await page.getByRole('button', { name: 'Copy output' }).click()
  expect(await page.evaluate(() => navigator.clipboard.readText())).toContain('Ozan')
  const downloading = page.waitForEvent('download')
  await page.getByRole('button', { name: 'Download', exact: true }).click()
  const file = await downloading
  expect(file.suggestedFilename()).toBe('data.csv')
  expect(await readFile((await file.path())!, 'utf8')).toContain('\r\n')
  await page.getByRole('button', { name: 'Swap direction' }).click()
  await page.getByRole('button', { name: 'Convert CSV to JSON' }).click()
  expect(JSON.parse(await page.getByLabel('JSON output', { exact: true }).inputValue())).toEqual(
    rows,
  )
  await page.getByRole('button', { name: 'Clear', exact: true }).click()
  await expect(page.getByLabel('CSV input')).toHaveValue('')
  await page.getByLabel('CSV input').fill('a;b\n"unterminated')
  await page.getByRole('button', { name: 'Convert CSV to JSON' }).click()
  await expect(page.getByRole('alert')).toContainText('not closed')
})

test('crop numeric and keyboard controls preserve pixels and hand off to compression', async ({
  page,
}) => {
  await page.goto('/tools/image-cropper')
  await page.locator('input[type=file]').setInputFiles(await image(page))
  await expect(page.getByAltText('Input preview')).toBeVisible()
  await page.getByLabel('Crop width', { exact: true }).fill('30')
  await page.getByLabel('Crop height', { exact: true }).fill('20')
  await page.getByLabel('Crop X', { exact: true }).fill('10')
  await page.getByLabel('Crop Y', { exact: true }).fill('5')
  await page.getByRole('group', { name: 'Selected crop region' }).focus()
  await page.keyboard.press('ArrowRight')
  await expect(page.getByLabel('Crop X', { exact: true })).toHaveValue('11')
  await page.keyboard.press('Shift+ArrowDown')
  await expect(page.getByLabel('Crop height', { exact: true })).toHaveValue('21')
  await page.getByRole('button', { name: 'Crop image', exact: true }).click()
  await expect(page.getByAltText('Output preview')).toBeVisible()
  expect(await dimensions(page)).toEqual([30, 21])
  const pixel = await page.getByAltText('Output preview').evaluate((img: HTMLImageElement) => {
    const canvas = document.createElement('canvas')
    canvas.width = img.naturalWidth
    canvas.height = img.naturalHeight
    const ctx = canvas.getContext('2d')!
    ctx.drawImage(img, 0, 0)
    return Array.from(ctx.getImageData(0, 0, 1, 1).data)
  })
  expect(pixel).toEqual([255, 0, 0, 255])
  await expect(page.getByRole('region', { name: 'File output' })).toContainText(
    '80 × 40 → 30 × 21 px',
  )
  await page.getByRole('button', { name: 'Save & open Image Compressor', exact: true }).click()
  await expect(page).toHaveURL(/image-compressor\?file=/)
  await expect(page.getByAltText('Input preview')).toBeVisible()
  await page.goto('/workspace')
  await page.reload()
  await expect(page.locator('.workspace-file')).toHaveCount(1)
  await expect(page.locator('.workspace-file')).toContainText('sample-cropped.png')
})

test('crop pointer move/resize, aspect reset, transparency, JPEG and malformed images', async ({
  page,
}) => {
  await page.goto('/tools/image-cropper')
  await page.locator('input[type=file]').setInputFiles(await image(page))
  await page.getByLabel('Aspect ratio').selectOption('1:1')
  await expect(page.getByLabel('Crop width', { exact: true })).toHaveValue('40')
  await expect(page.getByLabel('Crop height', { exact: true })).toHaveValue('40')
  const selection = page.getByRole('group', { name: 'Selected crop region' })
  const box = (await selection.boundingBox())!
  await page.mouse.move(box.x + 10, box.y + 10)
  await page.mouse.down()
  await page.mouse.move(box.x + 50, box.y + 10)
  await page.mouse.up()
  expect(Number(await page.getByLabel('Crop X', { exact: true }).inputValue())).toBeGreaterThan(20)
  const handle = (await page.locator('.crop-handle').boundingBox())!
  await page.mouse.move(handle.x + handle.width / 2, handle.y + handle.height / 2)
  await page.mouse.down()
  await page.mouse.move(handle.x - 50, handle.y - 30)
  await page.mouse.up()
  expect(Number(await page.getByLabel('Crop width', { exact: true }).inputValue())).toBeLessThan(40)
  await page.getByRole('button', { name: 'Reset crop' }).click()
  await expect(page.getByLabel('Crop width', { exact: true })).toHaveValue('40')
  await page.getByLabel('Crop X', { exact: true }).fill('40')
  await page.getByLabel('Output format').selectOption('image/jpeg')
  await page.getByLabel('JPEG background').fill('#00ff00')
  await page.getByRole('button', { name: 'Crop image', exact: true }).click()
  await expect(page.getByAltText('Output preview')).toBeVisible()
  expect(await dimensions(page)).toEqual([40, 40])
  const green = await page.getByAltText('Output preview').evaluate((img: HTMLImageElement) => {
    const c = document.createElement('canvas')
    c.width = 40
    c.height = 40
    const ctx = c.getContext('2d')!
    ctx.drawImage(img, 0, 0)
    return ctx.getImageData(20, 20, 1, 1).data[1]
  })
  expect(green).toBeGreaterThan(245)
  await page
    .locator('input[type=file]')
    .setInputFiles({ name: 'broken.png', mimeType: 'image/png', buffer: Buffer.from('broken') })
  await expect(page.getByRole('alert')).toContainText('damaged')
  await expect(page.getByAltText('Output preview')).not.toBeVisible()
})

test('PDF rendering is lazy, produces real page images and reuses them in the cropper', async ({
  page,
  baseURL,
}) => {
  const requests: string[] = [],
    errors: string[] = []
  page.on('request', (r) => requests.push(r.url()))
  page.on('pageerror', (e) => errors.push(e.message))
  await page.goto('/')
  await page.evaluate(async () => {
    await navigator.serviceWorker.ready
  })
  expect(requests.filter((url) => /pdfRenderer-|pdf\.worker\.min-/.test(url))).toEqual([])
  await page.goto('/tools/pdf-to-images')
  expect(requests.filter((url) => /pdfRenderer-|pdf\.worker\.min-/.test(url))).toEqual([])
  await page.locator('input[type=file]').setInputFiles(await pdf())
  await page.getByLabel('Resolution').selectOption('2')
  await page.getByRole('button', { name: 'Render images', exact: true }).click()
  await expect(page.getByRole('region', { name: 'File output' })).toHaveCount(2)
  expect(await dimensions(page, 0)).toEqual([200, 300])
  expect(await dimensions(page, 1)).toEqual([400, 300])
  const first = page.getByRole('region', { name: 'File output' }).first()
  await expect(first).toContainText('document-page-1.png')
  const downloading = page.waitForEvent('download')
  await first.getByRole('button', { name: 'Download', exact: true }).click()
  expect((await readFile((await (await downloading).path())!)).subarray(0, 8).toString('hex')).toBe(
    '89504e470d0a1a0a',
  )
  const red = await page
    .getByAltText('Output preview')
    .first()
    .evaluate((img: HTMLImageElement) => {
      const c = document.createElement('canvas')
      c.width = img.naturalWidth
      c.height = img.naturalHeight
      const ctx = c.getContext('2d')!
      ctx.drawImage(img, 0, 0)
      return Array.from(ctx.getImageData(1, 1, 1, 1).data)
    })
  expect(red).toEqual([255, 0, 0, 255])
  await first.getByRole('button', { name: 'Save & open Image Cropper', exact: true }).click()
  await expect(page.getByAltText('Input preview')).toBeVisible()
  await expect(page.getByLabel('Crop width', { exact: true })).toHaveValue('200')
  expect(
    requests.filter((url) => !url.startsWith(baseURL + '/') && !/^(blob:|data:)/.test(url)),
  ).toEqual([])
  expect(errors).toEqual([])
})

test('PDF custom ranges/JPEG, invalid PDF, duplicate selections, size limits and cancellation', async ({
  page,
}) => {
  await page.goto('/tools/pdf-to-images')
  await page.locator('input[type=file]').setInputFiles(await pdf())
  await page.getByLabel('Page selection').selectOption('custom')
  await page.getByLabel('Page range').fill('2')
  await page.getByLabel('Output format').selectOption('image/jpeg')
  await page.getByRole('button', { name: 'Render images' }).click()
  await expect(page.getByAltText('Output preview')).toBeVisible()
  expect(await dimensions(page)).toEqual([200, 150])
  await expect(page.getByRole('region', { name: 'File output' })).toContainText(
    'document-page-2.jpg',
  )
  await page.getByLabel('Page range').fill('1,1')
  await page.getByRole('button', { name: 'Render images' }).click()
  await expect(page.getByRole('alert')).toContainText('more than once')
  await page.locator('input[type=file]').setInputFiles(await pdf([9000]))
  await page.getByLabel('Page selection').selectOption('all')
  await page.getByRole('button', { name: 'Render images' }).click()
  await expect(page.getByRole('alert')).toContainText('8192')
  await page
    .locator('input[type=file]')
    .setInputFiles({ name: 'invalid.pdf', mimeType: 'application/pdf', buffer: Buffer.from('bad') })
  await page.getByRole('button', { name: 'Render images' }).click()
  await expect(page.getByRole('alert')).toContainText('not a valid PDF')
  await page.locator('input[type=file]').setInputFiles(await pdf(Array(20).fill(1000)))
  await page.getByRole('button', { name: 'Render images' }).click()
  await page.getByRole('button', { name: 'Cancel processing' }).click()
  await expect(page.getByRole('region', { name: 'File output' })).toHaveCount(0)
  await expect(page.getByRole('button', { name: 'Render images' })).toBeEnabled()
})

test('new tools appear in catalog, search, palette and favorites', async ({ page }) => {
  await page.goto('/tools')
  await expect(page.locator('.tool-card')).toHaveCount(35)
  for (const [id, name, query] of [
    ['pdf-to-images', 'PDF → Images', 'raster'],
    ['image-cropper', 'Image Cropper', 'crop'],
    ['json-csv', 'JSON ↔ CSV Converter', 'csv'],
  ]) {
    await page.getByLabel('Search all tools').fill(query)
    await expect(page.locator('.tool-card')).toHaveCount(1)
    await page.getByRole('button', { name: `Add ${name} to favorites` }).click()
    await page.keyboard.press('Control+k')
    await page.getByRole('combobox', { name: 'Search tools, files and actions' }).fill(query)
    await page.keyboard.press('Enter')
    await expect(page).toHaveURL(`/tools/${id}`)
    await page.goto('/tools')
  }
  await page.goto('/favorites')
  await expect(page.locator('.tool-card')).toHaveCount(3)
})

for (const theme of ['light', 'dark'] as const)
  test(`v3.2 accessibility and responsive loaded controls in ${theme}`, async ({ page }) => {
    test.setTimeout(90_000)
    await page.emulateMedia({ colorScheme: theme, reducedMotion: 'reduce' })
    for (const route of ['json-csv', 'image-cropper', 'pdf-to-images']) {
      await page.goto('/tools/' + route)
      if (route === 'image-cropper') {
        await page.locator('input[type=file]').setInputFiles(await image(page))
        await expect(page.getByAltText('Input preview')).toBeVisible()
        await page.getByRole('button', { name: 'Crop image', exact: true }).click()
        await expect(page.getByAltText('Output preview')).toBeVisible()
      }
      if (route === 'pdf-to-images') {
        await page.locator('input[type=file]').setInputFiles(await pdf([100]))
        await page.getByRole('button', { name: 'Render images' }).click()
        await expect(page.getByAltText('Output preview')).toBeVisible()
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
    }
  })
