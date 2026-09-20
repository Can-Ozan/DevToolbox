import { test, expect, type Page } from '@playwright/test'
import AxeBuilder from '@axe-core/playwright'
import { readFile } from 'node:fs/promises'
import { PDFDocument } from 'pdf-lib'

const newTools = [
  'image-converter',
  'image-compressor',
  'image-resizer',
  'image-rotate',
  'image-metadata',
  'pdf-merger',
  'pdf-splitter',
  'pdf-reorder',
  'images-to-pdf',
]

async function png(page: Page, name = 'sample.png') {
  const data = await page.evaluate(() => {
    const canvas = document.createElement('canvas')
    canvas.width = 80
    canvas.height = 40
    const context = canvas.getContext('2d')!
    context.fillStyle = '#ff0000'
    context.fillRect(0, 0, 40, 40)
    return canvas.toDataURL('image/png').split(',')[1]
  })
  return { name, mimeType: 'image/png', buffer: Buffer.from(data, 'base64') }
}
async function pdf(name = 'sample.pdf', widths = [100, 200, 300]) {
  const document = await PDFDocument.create()
  widths.forEach((width) => document.addPage([width, 400]))
  return { name, mimeType: 'application/pdf', buffer: Buffer.from(await document.save()) }
}
async function outputDownload(page: Page) {
  const pending = page.waitForEvent('download')
  await page
    .getByRole('region', { name: 'File output' })
    .getByRole('button', { name: 'Download', exact: true })
    .click()
  const download = await pending
  const path = await download.path()
  if (!path) throw new Error('Download was not saved')
  return { name: download.suggestedFilename(), bytes: await readFile(path) }
}
async function upload(
  page: Page,
  file: Awaited<ReturnType<typeof png>> | Awaited<ReturnType<typeof png>>[],
) {
  await page.locator('input[type=file]').setInputFiles(file)
}
async function outputDimensions(page: Page) {
  return page
    .getByAltText('Output preview')
    .evaluate((image: HTMLImageElement) => [image.naturalWidth, image.naturalHeight])
}

test('image conversion, real JPEG alpha background, persistent Workspace reuse and compression download', async ({
  page,
}) => {
  await page.goto('/tools/image-converter')
  await upload(page, await png(page))
  await page.getByLabel('Output format').selectOption('image/jpeg')
  await page.getByLabel('JPEG background').fill('#00ff00')
  await page.getByLabel('Quality', { exact: true }).fill('100')
  await page.getByRole('button', { name: 'Convert image', exact: true }).click()
  await expect(page.getByAltText('Output preview')).toBeVisible()
  expect(await outputDimensions(page)).toEqual([80, 40])
  const jpeg = await outputDownload(page)
  expect(jpeg.bytes.subarray(0, 2).toString('hex')).toBe('ffd8')
  const rgb = await page.getByAltText('Output preview').evaluate((image: HTMLImageElement) => {
    const canvas = document.createElement('canvas')
    canvas.width = 80
    canvas.height = 40
    const context = canvas.getContext('2d')!
    context.drawImage(image, 0, 0)
    return Array.from(context.getImageData(70, 20, 1, 1).data)
  })
  expect(rgb[1]).toBeGreaterThan(245)
  expect(rgb[0]).toBeLessThan(10)
  await page.getByRole('button', { name: 'Save to Workspace', exact: true }).click()
  await expect(page.getByText('Saved as sample-converted.jpg.')).toBeVisible()
  await page.goto('/workspace')
  await page.reload()
  await expect(page.locator('.workspace-file')).toHaveCount(1)
  await page.goto('/tools/image-compressor')
  await page.getByRole('button', { name: 'Choose from Workspace' }).click()
  await page.getByRole('button', { name: /Use sample-converted.jpg/ }).click()
  await page.getByRole('button', { name: 'Compress image', exact: true }).click()
  await expect(page.getByRole('region', { name: 'File output' })).toContainText('Original')
  const compressed = await outputDownload(page)
  expect(compressed.name).toBe('sample-converted-compressed.jpg')
  expect(compressed.bytes.subarray(0, 2).toString('hex')).toBe('ffd8')
  await page.getByRole('button', { name: 'Save to Workspace', exact: true }).click()
  await page.getByRole('link', { name: 'Use in Image Resizer', exact: true }).click()
  await expect(page.getByAltText('Input preview')).toBeVisible()
})

test('PNG, JPEG and WebP conversions preserve dimensions and valid output signatures', async ({
  page,
}) => {
  await page.goto('/tools/image-converter')
  let file = await png(page)
  for (const format of [
    'image/webp',
    'image/png',
    'image/jpeg',
    'image/webp',
    'image/jpeg',
    'image/png',
  ]) {
    await upload(page, file)
    await page.getByLabel('Output format').selectOption(format)
    await page.getByRole('button', { name: 'Convert image', exact: true }).click()
    await expect(page.getByAltText('Output preview')).toBeVisible()
    expect(await outputDimensions(page)).toEqual([80, 40])
    const result = await outputDownload(page)
    if (format === 'image/png')
      expect(result.bytes.subarray(0, 8).toString('hex')).toBe('89504e470d0a1a0a')
    if (format === 'image/webp') expect(result.bytes.subarray(8, 12).toString()).toBe('WEBP')
    file = { name: result.name, mimeType: format, buffer: result.bytes }
  }
})

test('image resize, aspect ratio, percentage, presets, rotation, metadata and malformed input', async ({
  page,
}) => {
  await page.goto('/tools/image-resizer')
  const file = await png(page)
  await upload(page, file)
  await page.getByLabel('Width', { exact: true }).fill('40')
  await expect(page.getByLabel('Height', { exact: true })).toHaveValue('20')
  await page.getByLabel('Percentage', { exact: true }).fill('25')
  await page.getByRole('button', { name: 'Resize image', exact: true }).click()
  await expect(page.getByAltText('Output preview')).toBeVisible()
  expect(await outputDimensions(page)).toEqual([20, 10])
  await page.getByLabel('Common presets').selectOption('320')
  await expect(page.getByLabel('Height', { exact: true })).toHaveValue('160')
  await page.getByLabel('Width', { exact: true }).fill('999999')
  await page.getByRole('button', { name: 'Resize image', exact: true }).click()
  await expect(page.getByRole('alert')).toContainText('8192')
  await page.goto('/tools/image-rotate')
  await upload(page, file)
  await page.getByRole('combobox', { name: 'Rotation', exact: true }).selectOption('90')
  await page.getByLabel('Flip horizontal').check()
  await page.getByRole('button', { name: 'Apply rotation / flip' }).click()
  await expect(page.getByAltText('Output preview')).toBeVisible()
  expect(await outputDimensions(page)).toEqual([40, 80])
  await page.goto('/tools/image-metadata')
  await upload(page, file)
  await expect(page.locator('.file-metadata')).toContainText('80 px')
  await expect(page.locator('.file-metadata')).toContainText('2.000:1')
  await upload(page, { name: 'broken.png', mimeType: 'image/png', buffer: Buffer.from('broken') })
  await expect(page.getByRole('alert')).toBeVisible()
  await upload(page, {
    name: 'unsafe.svg',
    mimeType: 'image/svg+xml',
    buffer: Buffer.from('<svg/>'),
  })
  await expect(page.getByRole('region', { name: 'Input source' }).getByRole('alert')).toContainText(
    'Unsupported',
  )
})

test('Workspace imports, duplicates, pins, previews, filtering, deletion, and confirmed clear', async ({
  page,
  context,
}) => {
  await context.grantPermissions(['clipboard-read', 'clipboard-write'])
  await page.goto('/workspace')
  const image = await png(page)
  await upload(page, [image, image, await pdf()])
  await expect(page.locator('.workspace-file')).toHaveCount(3)
  await expect(page.getByRole('heading', { name: 'sample-2.png', exact: true })).toBeVisible()
  await page.getByRole('button', { name: 'More actions for sample.png', exact: true }).click()
  await page.getByRole('menuitem', { name: 'Pin sample.png', exact: true }).click()
  await page.reload()
  await expect(page.locator('.workspace-file').first()).toContainText('★ sample.png')
  await page.getByRole('button', { name: 'More actions for sample.png', exact: true }).click()
  await page.getByRole('menuitem', { name: 'Copy filename sample.png', exact: true }).click()
  await expect.poll(() => page.evaluate(() => navigator.clipboard.readText())).toBe('sample.png')
  await page.getByRole('button', { name: 'Preview sample.png', exact: true }).click()
  await expect(page.getByAltText('Preview of sample.png')).toBeVisible()
  await page.keyboard.press('Escape')
  await expect(page.getByRole('button', { name: 'Preview sample.png', exact: true })).toBeFocused()
  await page.goto('/tools/pdf-splitter')
  await page.getByRole('button', { name: 'Choose from Workspace' }).click()
  await expect(page.getByRole('button', { name: /Use sample.pdf/ })).toBeVisible()
  await expect(page.getByRole('button', { name: /Use sample.*png/ })).toHaveCount(0)
  await page.keyboard.press('Escape')
  await page.goto('/workspace')
  await page.getByRole('button', { name: 'More actions for sample-2.png', exact: true }).click()
  await page.getByRole('menuitem', { name: 'Delete sample-2.png', exact: true }).click()
  await expect(page.locator('.workspace-file')).toHaveCount(2)
  await page.getByRole('button', { name: 'Clear Workspace', exact: true }).click()
  await page.getByRole('button', { name: 'Cancel', exact: true }).click()
  await expect(page.locator('.workspace-file')).toHaveCount(2)
  await page.getByRole('button', { name: 'Clear Workspace', exact: true }).click()
  await page.getByRole('button', { name: 'Confirm clear' }).click()
  await page.reload()
  await expect(page.locator('.workspace-file')).toHaveCount(0)
})

test('Workspace drag/drop and corrupted metadata or missing blobs show recoverable errors', async ({
  page,
}) => {
  await page.goto('/workspace')
  const file = await png(page)
  const transfer = await page.evaluateHandle(
    ({ bytes, name }) => {
      const data = new DataTransfer()
      data.items.add(new File([new Uint8Array(bytes)], name, { type: 'image/png' }))
      return data
    },
    { bytes: [...file.buffer], name: file.name },
  )
  await page.locator('.file-picker').dispatchEvent('drop', { dataTransfer: transfer })
  await transfer.dispose()
  await expect(page.locator('.workspace-file')).toHaveCount(1)
  await page.evaluate(async () => {
    await new Promise<void>((resolve) => {
      const request = indexedDB.open('devtoolbox.workspace', 1)
      request.onsuccess = () => {
        const db = request.result
        const tx = db.transaction('blobs', 'readwrite')
        tx.objectStore('blobs').clear()
        tx.oncomplete = () => {
          db.close()
          resolve()
        }
      }
    })
  })
  await page.getByRole('button', { name: 'Preview sample.png', exact: true }).click()
  await expect(page.getByRole('alert')).toContainText('missing or damaged')
  await page.evaluate(async () => {
    await new Promise<void>((resolve) => {
      const request = indexedDB.open('devtoolbox.workspace', 1)
      request.onsuccess = () => {
        const db = request.result
        const tx = db.transaction('files', 'readwrite')
        tx.objectStore('files').put({ id: 'corrupt', name: 'bad' })
        tx.oncomplete = () => {
          db.close()
          resolve()
        }
      }
    })
  })
  await page.reload()
  await expect(page.getByText(/damaged metadata record/)).toBeVisible()
})

test('IndexedDB unavailable keeps device processing and downloads usable', async ({ page }) => {
  await page.addInitScript(() => {
    Object.defineProperty(window, 'indexedDB', {
      get() {
        throw new DOMException('Blocked', 'SecurityError')
      },
    })
  })
  await page.goto('/workspace')
  await expect(page.getByRole('alert')).toContainText('storage is unavailable')
  await page.goto('/tools/image-converter')
  await upload(page, await png(page))
  await page.getByRole('button', { name: 'Convert image', exact: true }).click()
  await page.getByRole('button', { name: 'Save to Workspace', exact: true }).click()
  await expect(page.getByRole('alert')).toContainText('storage is unavailable')
  expect((await outputDownload(page)).name).toBe('sample-converted.png')
})

test('quota failure preserves unsaved output and rolls back database entries', async ({ page }) => {
  await page.addInitScript(() => {
    const add = IDBObjectStore.prototype.add
    IDBObjectStore.prototype.add = function (...args: Parameters<typeof add>) {
      if (this.name === 'blobs') throw new DOMException('Full', 'QuotaExceededError')
      return add.apply(this, args)
    }
  })
  await page.goto('/tools/image-converter')
  await upload(page, await png(page))
  await page.getByRole('button', { name: 'Convert image', exact: true }).click()
  await page.getByRole('button', { name: 'Save to Workspace', exact: true }).click()
  await expect(page.getByRole('alert')).toContainText('Nothing was saved')
  expect((await outputDownload(page)).bytes.length).toBeGreaterThan(0)
  await page.goto('/workspace')
  await expect(page.locator('.workspace-file')).toHaveCount(0)
})

test('PDF merge drag reorder, split, numeric reorder, and invalid inputs', async ({ page }) => {
  await page.goto('/tools/pdf-merger')
  await upload(page, [await pdf('first.pdf', [100, 200]), await pdf('second.pdf', [300])])
  await page
    .locator('.file-order-list li')
    .nth(1)
    .dragTo(page.locator('.file-order-list li').nth(0))
  await expect(page.locator('.file-order-list li').first()).toContainText('second.pdf')
  await page.getByRole('button', { name: 'Merge PDFs', exact: true }).click()
  const merged = await outputDownload(page)
  expect((await PDFDocument.load(merged.bytes)).getPages().map((p) => p.getWidth())).toEqual([
    300, 100, 200,
  ])
  await page.getByRole('button', { name: 'Save to Workspace', exact: true }).click()
  await page.getByRole('link', { name: 'Use in PDF Splitter', exact: true }).click()
  await expect(page.getByText('3 pages in input PDF.')).toBeVisible()
  await page.getByLabel('Page range').fill('1,3')
  await page.getByRole('button', { name: 'Extract pages', exact: true }).click()
  const extracted = await outputDownload(page)
  expect((await PDFDocument.load(extracted.bytes)).getPageCount()).toBe(2)
  await page.getByLabel('Page range').fill('1-999')
  await page.getByRole('button', { name: 'Extract pages', exact: true }).click()
  await expect(page.getByRole('alert')).toContainText('between 1 and 3')
  await page.goto('/tools/pdf-reorder')
  await upload(page, await pdf())
  await expect(page.getByText('3 pages in input PDF.')).toBeVisible()
  await page.getByLabel('Page order').fill('3,1')
  await page.getByRole('button', { name: 'Reorder pages', exact: true }).click()
  expect(
    (await PDFDocument.load((await outputDownload(page)).bytes))
      .getPages()
      .map((p) => p.getWidth()),
  ).toEqual([300, 100])
  await upload(page, {
    name: 'broken.pdf',
    mimeType: 'application/pdf',
    buffer: Buffer.from('broken'),
  })
  await expect(page.getByRole('alert')).toContainText('not a valid PDF')
})

test('images to PDF supports reordering, fit, orientation and reuse in the splitter', async ({
  page,
}) => {
  await page.goto('/tools/images-to-pdf')
  await upload(page, [await png(page, 'first.png'), await png(page, 'second.png')])
  await page.getByRole('button', { name: 'Move second.png up' }).click()
  await expect(page.locator('.file-order-list li').first()).toContainText('second.png')
  await page.getByLabel('Page orientation').selectOption('landscape')
  await page.getByLabel('Fit mode').selectOption('cover')
  await page.getByRole('button', { name: 'Create PDF', exact: true }).click()
  const result = await PDFDocument.load((await outputDownload(page)).bytes)
  expect(result.getPageCount()).toBe(2)
  expect(result.getPage(0).getWidth()).toBeGreaterThan(result.getPage(0).getHeight())
  await page.getByRole('button', { name: 'Save to Workspace', exact: true }).click()
  await page.getByRole('link', { name: 'Use in PDF Splitter', exact: true }).click()
  await expect(page.getByText('2 pages in input PDF.')).toBeVisible()
})

test('new registry tools integrate with favorites, recent tools and command navigation', async ({
  page,
}) => {
  for (const tool of newTools) {
    await page.goto(`/tools/${tool}`)
    await page.locator('.tool-page-heading .favorite-button').click()
  }
  await page.goto('/favorites')
  await expect(page.locator('.tool-card')).toHaveCount(9)
  await page.goto('/recent')
  await expect(page.locator('.tool-card')).toHaveCount(9)
  await page.keyboard.press('Control+k')
  await page
    .getByRole('combobox', { name: 'Search tools, files and actions' })
    .fill('image compressor')
  await page.keyboard.press('Enter')
  await expect(page).toHaveURL('/tools/image-compressor')
  await page.keyboard.press('Control+k')
  await page.getByRole('combobox', { name: 'Search tools, files and actions' }).fill('workspace')
  await page.keyboard.press('Enter')
  await expect(page).toHaveURL('/workspace')
})

test('file tools remain local, error-free and responsive at all requested widths with loaded files', async ({
  page,
  baseURL,
}) => {
  test.setTimeout(120_000)
  const errors: string[] = []
  const external: string[] = []
  page.on('pageerror', (error) => errors.push(error.message))
  page.on('console', (message) => {
    if (message.type() === 'error') errors.push(message.text())
  })
  page.on('request', (request) => {
    if (!request.url().startsWith(`${baseURL}/`) && !/^(blob:|data:)/.test(request.url()))
      external.push(request.url())
  })
  await page.goto('/workspace')
  const image = await png(page, `${'long-image-name-'.repeat(7)}.png`)
  const pdfInput = await pdf()
  await upload(page, [image, pdfInput])
  for (const width of [320, 375, 768, 1024, 1440, 1920]) {
    await page.setViewportSize({ width, height: 1000 })
    for (const id of ['workspace', ...newTools]) {
      await page.goto(id === 'workspace' ? '/workspace' : `/tools/${id}`)
      await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
      if (id !== 'workspace') {
        await upload(page, id.startsWith('pdf-') ? pdfInput : image)
        if (id.startsWith('image-')) await expect(page.getByAltText('Input preview')).toBeVisible()
      }
      expect(
        await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth),
        `${id} at ${width}px`,
      ).toBe(true)
    }
  }
  expect(errors).toEqual([])
  expect(external).toEqual([])
})

for (const theme of ['light', 'dark'] as const) {
  test(`Workspace and loaded file tools are accessible in ${theme}`, async ({ page }) => {
    test.setTimeout(120_000)
    await page.emulateMedia({ colorScheme: theme, reducedMotion: 'reduce' })
    await page.goto('/workspace')
    const image = await png(page)
    const pdfInput = await pdf()
    await upload(page, [image, pdfInput])
    for (const id of ['workspace', ...newTools]) {
      await page.goto(id === 'workspace' ? '/workspace' : `/tools/${id}`)
      if (id !== 'workspace') await upload(page, id.startsWith('pdf-') ? pdfInput : image)
      if (id.startsWith('image-')) await expect(page.getByAltText('Input preview')).toBeVisible()
      if (id === 'pdf-splitter' || id === 'pdf-reorder')
        await expect(page.getByText('3 pages in input PDF.')).toBeVisible()
      const report = await new AxeBuilder({ page })
        .withTags(['wcag2a', 'wcag2aa', 'wcag21aa'])
        .analyze()
      expect(
        report.violations.map((v) => ({
          id: v.id,
          nodes: v.nodes.map((n) => ({ target: n.target, summary: n.failureSummary })),
        })),
        id,
      ).toEqual([])
    }
    await page.getByRole('button', { name: 'Choose from Workspace' }).click()
    const report = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21aa'])
      .analyze()
    expect(report.violations).toEqual([])
    for (let i = 0; i < 8; i++) {
      await page.keyboard.press('Tab')
      expect(await page.evaluate(() => !!document.activeElement?.closest('dialog'))).toBe(true)
    }
    await page.keyboard.press('Escape')
    await expect(page.getByRole('button', { name: 'Choose from Workspace' })).toBeFocused()
  })
}
