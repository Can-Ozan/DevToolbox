import { expect, test } from '@playwright/test'
import AxeBuilder from '@axe-core/playwright'
import { PDFDocument } from 'pdf-lib'

const controls = [
  ['json', 'JSON biçimlendir'],
  ['base64', 'Kodla'],
  ['uuid', 'UUID üret'],
  ['jwt', 'Belirteci çöz'],
  ['url', 'Kodlama modu'],
  ['timestamp', 'Zaman damgasını dönüştür'],
  ['hash', 'Özetleri üret'],
  ['regex', 'Düzenli ifade'],
  ['password', 'Parola üret'],
  ['color', 'Renk seç'],
  ['lorem', 'Metin üret'],
  ['diff', 'Özgün metin'],
  ['json-yaml', "JSON'u YAML'a dönüştür"],
  ['markdown', 'Markdown girdisi'],
  ['cron', 'Yaygın hazır ayarlar'],
  ['qr', 'QR girdisi'],
  ['case', 'Metin girdisi'],
  ['number-base', 'İkilik · taban 2'],
  ['contrast', 'Ön plan rengi'],
  ['url-parser', 'Ayrıştırılacak URL'],
  ['json-csv', "JSON'u CSV'ye dönüştür"],
  ['xml', 'XML biçimlendir'],
  ['code-formatter', 'Kodu biçimlendir'],
] as const

test('files image and PDF controls, processing and outputs survive language changes', async ({
  page,
  context,
}) => {
  test.setTimeout(120_000)
  await page.goto('/settings')
  await page.locator('#app-language').selectOption('tr')
  const png = await page.evaluate(() => {
    const canvas = document.createElement('canvas')
    canvas.width = 80
    canvas.height = 40
    return canvas.toDataURL().split(',')[1]
  })
  const image = { name: '世界.png', mimeType: 'image/png', buffer: Buffer.from(png, 'base64') }
  const pdf = await PDFDocument.create()
  pdf.addPage([80, 40])
  pdf.addPage([80, 40])
  const pdfFile = {
    name: '世界.pdf',
    mimeType: 'application/pdf',
    buffer: Buffer.from(await pdf.save()),
  }
  for (const [id, button] of [
    ['image-converter', 'Görseli dönüştür'],
    ['image-compressor', 'Görseli sıkıştır'],
    ['image-resizer', 'Görseli yeniden boyutlandır'],
    ['image-rotate', 'Döndürmeyi / çevirmeyi uygula'],
    ['image-cropper', 'Görseli kırp'],
    ['image-metadata', 'Görsel meta verileri'],
    ['pdf-merger', 'PDF birleştir'],
    ['pdf-splitter', 'Sayfaları çıkar'],
    ['pdf-reorder', 'Sayfaları sırala'],
    ['images-to-pdf', 'PDF oluştur'],
    ['pdf-to-images', 'Görselleri oluştur'],
  ]) {
    await page.goto(`/tools/${id}`)
    const isPdf = id.startsWith('pdf-')
    await page.locator('input[type=file]').setInputFiles(isPdf ? pdfFile : image)
    await expect(
      page.getByRole(id === 'image-metadata' ? 'heading' : 'button', { name: button, exact: true }),
    ).toBeVisible()
    for (const width of [320, 375, 768, 1440]) {
      await page.setViewportSize({ width, height: 900 })
      expect(
        await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth),
        id,
      ).toBe(true)
    }
  }
  await page.goto('/tools/image-cropper')
  await page.locator('input[type=file]').setInputFiles(image)
  await page.getByRole('button', { name: 'Görseli kırp', exact: true }).click()
  const output = page.locator('.file-output img')
  await expect(output).toBeVisible()
  const source = await output.getAttribute('src')
  const settings = await context.newPage()
  await settings.goto('/settings')
  for (const lang of ['de', 'es']) {
    await settings.locator('#app-language').selectOption(lang)
    await expect(page.locator('html')).toHaveAttribute('lang', lang)
    await expect(output).toHaveAttribute('src', source!)
    expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([])
  }
  await page.goto('/tools/pdf-to-images')
  await page.locator('input[type=file]').setInputFiles(pdfFile)
  await page.getByRole('button', { name: 'Renderizar imágenes', exact: true }).click()
  await expect(page.locator('.pdf-image-results .file-output')).toHaveCount(2)
  await expect(page.locator('.pdf-image-results')).toContainText('2 imágenes')
})

test('files locale switch during image encoding preserves the active job', async ({
  page,
  context,
}) => {
  await page.addInitScript(() => {
    const encode = HTMLCanvasElement.prototype.toBlob
    HTMLCanvasElement.prototype.toBlob = function (...args) {
      Object.assign(window, {
        encodingCalls: Number(Reflect.get(window, 'encodingCalls') ?? 0) + 1,
        finishEncoding: encode.bind(this, ...args),
      })
    }
  })
  await page.goto('/tools/image-converter')
  const bytes = await page.evaluate(() => {
    const canvas = document.createElement('canvas')
    canvas.width = 80
    canvas.height = 40
    return canvas.toDataURL().split(',')[1]
  })
  await page.locator('input[type=file]').setInputFiles({
    name: 'keep.png',
    mimeType: 'image/png',
    buffer: Buffer.from(bytes, 'base64'),
  })
  await page.getByRole('button', { name: 'Convert image', exact: true }).click()
  await expect.poll(() => page.evaluate(() => Reflect.get(window, 'encodingCalls'))).toBe(1)
  const settings = await context.newPage()
  await settings.goto('/settings')
  await settings.locator('#app-language').selectOption('de')
  await expect(
    page.getByRole('button', { name: 'Verarbeitung abbrechen', exact: true }),
  ).toBeVisible()
  expect(await page.evaluate(() => Reflect.get(window, 'encodingCalls'))).toBe(1)
  await page.evaluate(() => Reflect.get(window, 'finishEncoding')())
  const output = page.locator('.file-output img')
  await expect(output).toBeVisible()
  expect(
    await output.evaluate((img: HTMLImageElement) => [img.naturalWidth, img.naturalHeight]),
  ).toEqual([80, 40])
})

test('text tools expose localized controls across all 23 developer tools', async ({ page }) => {
  test.setTimeout(90_000)
  await page.goto('/settings')
  await page.locator('#app-language').selectOption('tr')
  for (const [id, label] of controls) {
    await page.goto(`/tools/${id}`)
    await expect(page.locator('html')).toHaveAttribute('lang', 'tr')
    await expect(
      page
        .getByRole('button', { name: label, exact: true })
        .or(page.getByRole('combobox', { name: label, exact: true }))
        .or(page.getByLabel(label, { exact: true })),
    ).toBeVisible()
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
  }
})

test('text JSON errors, Unicode, copy and downloads survive language switching', async ({
  page,
  context,
  browserName,
}) => {
  if (browserName === 'chromium')
    await context.grantPermissions(['clipboard-read', 'clipboard-write'])
  await page.goto('/tools/json')
  await page.getByLabel('JSON input', { exact: true }).fill('{"untouched":"İstanbul 世界"}')
  await page.getByRole('button', { name: 'Format JSON', exact: true }).click()
  const before = await page.getByLabel('JSON output', { exact: true }).inputValue()
  const settings = await context.newPage()
  await settings.goto('/settings')
  for (const [language, input, output, format] of [
    ['tr', 'JSON girdisi', 'JSON çıktısı', 'JSON biçimlendir'],
    ['de', 'JSON-Eingabe', 'JSON-Ausgabe', 'JSON formatieren'],
    ['es', 'Entrada JSON', 'Salida JSON', 'Formatear JSON'],
  ]) {
    await settings.locator('#app-language').selectOption(language)
    await expect(page.getByLabel(output, { exact: true })).toHaveValue(before)
    await expect(page.getByLabel(input, { exact: true })).toHaveValue(
      '{"untouched":"İstanbul 世界"}',
    )
    await expect(page.getByRole('button', { name: format, exact: true })).toBeVisible()
  }
  await page.bringToFront()
  const download = page.waitForEvent('download')
  await page.getByRole('button', { name: 'Descargar', exact: true }).click()
  expect((await download).suggestedFilename()).toBe('formatted.json')
  await page.getByRole('button', { name: 'Copiar salida', exact: true }).click()
  await expect(page.locator('.toast')).toContainText('Copiado')
  if (browserName === 'chromium')
    expect(
      (await page.evaluate(() => navigator.clipboard.readText())).replaceAll('\r\n', '\n'),
    ).toBe(before)
  await page.getByLabel('Entrada JSON', { exact: true }).fill('')
  await page.getByRole('button', { name: 'Formatear JSON', exact: true }).click()
  await expect(page.getByRole('alert')).toContainText('Pega JSON')
  await settings.locator('#app-language').selectOption('tr')
  await expect(page.getByRole('alert')).toContainText('JSON yapıştırın')
  await page.getByLabel('JSON girdisi', { exact: true }).fill('{bad')
  await page.getByRole('button', { name: 'JSON biçimlendir', exact: true }).click()
  await expect(page.getByRole('alert')).toBeVisible()
})

test('text worker errors and results stay live without restarting on locale change', async ({
  page,
  context,
}) => {
  await page.goto('/tools/code-formatter')
  await page.getByRole('button', { name: 'Format code', exact: true }).click()
  await expect(page.getByRole('alert')).toContainText('Enter code')
  const settings = await context.newPage()
  await settings.goto('/settings')
  await settings.locator('#app-language').selectOption('es')
  await expect(page.getByRole('alert')).toContainText('Introduce código')
  await page.getByLabel('Entrada de código', { exact: true }).fill('<p>世界</p>')
  await page.getByRole('button', { name: 'Formatear código', exact: true }).click()
  await expect(page.getByLabel('Código formateado', { exact: true })).toHaveValue('<p>世界</p>\n')
  await page.goto('/tools/regex')
  await page.getByLabel('Expresión regular', { exact: true }).fill('a')
  await page.getByLabel('Indicadores', { exact: true }).fill('gg')
  await expect(page.getByRole('alert')).toContainText('una vez')
})

test('inspection tools localize controls while preserving file and package data', async ({
  page,
}) => {
  await page.goto('/settings')
  await page.locator('#app-language').selectOption('tr')

  await page.goto('/tools/file-inspector')
  await page.locator('input[type=file]').setInputFiles({
    name: 'project.json',
    mimeType: 'application/json',
    buffer: Buffer.from('{"name":"世界","dependencies":{"react":"latest"}}'),
  })
  await expect(page.getByText('project.json', { exact: true })).toBeVisible()
  const inspection = page.getByRole('region', { name: 'Dosya incelemesi', exact: true })
  await expect(
    inspection.locator('dt').filter({ hasText: 'Bildirilen MIME' }).locator('..').locator('dd'),
  ).toHaveText('application/json')
  await expect(page.getByText('Uyumlu bir araçla devam et')).toBeVisible()
  await expect(
    page
      .getByRole('region', { name: 'Önerilen araçlar', exact: true })
      .locator('.inspection-recommendation')
      .first()
      .getByText(/kabul eder/),
  ).toBeVisible()
  await expect(
    page
      .getByRole('region', { name: 'Önerilen araçlar', exact: true })
      .locator('.inspection-recommendation')
      .first()
      .getByRole('button'),
  ).toHaveAccessibleName('JSON Formatter aç')

  await page.goto('/tools/package-json')
  await page
    .getByLabel('package.json girdisi', { exact: true })
    .fill('{"name":"{{shell.settings}} 世界","dependencies":{"react":"latest"}}')
  await page.getByRole('button', { name: 'package.json analiz et', exact: true }).click()
  await expect(page.getByRole('heading', { name: 'Özet', exact: true })).toBeVisible()
  await expect(page.getByRole('region', { name: 'Project summary', exact: true })).toContainText(
    '{{shell.settings}} 世界',
  )
  await expect(page.getByRole('region', { name: 'Tanılar', exact: true })).toContainText('geniş')
  await expect(page.getByRole('heading', { name: /Tanılar/ })).toBeVisible()

  await page.goto('/tools/zip')
  await page.getByRole('button', { name: 'ZIP çıkar', exact: true }).click()
  await page.locator('input[type=file]').setInputFiles({
    name: 'not-an-archive.zip',
    mimeType: 'application/zip',
    buffer: Buffer.from('not a ZIP'),
  })
  await page.getByRole('button', { name: 'ZIP incele', exact: true }).click()
  await expect(page.getByRole('alert')).toContainText(
    'Bir hata oluştu. Girdinizi kontrol edip yeniden deneyin.',
  )
  await expect(page.getByText('not-an-archive.zip', { exact: true })).toBeVisible()
})

for (const theme of ['light', 'dark'] as const) {
  test(`text controls and Markdown accessibility in ${theme}`, async ({ page }) => {
    test.setTimeout(120_000)
    await page.emulateMedia({ colorScheme: theme })
    for (const language of ['tr', 'de', 'es']) {
      await page.goto('/settings')
      await page.locator('#app-language').selectOption(language)
      for (const id of ['json', 'markdown', 'cron', 'contrast', 'xml', 'code-formatter']) {
        await page.goto(`/tools/${id}`)
        for (const width of [320, 375, 768, 1440]) {
          await page.setViewportSize({ width, height: 900 })
          expect(
            await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth),
            `${language}/${id}/${width}`,
          ).toBe(true)
        }
        if (id === 'markdown') {
          await page.getByRole('textbox').fill('- [x] My visible task\n- [ ] 世界 untouched')
          await expect(
            page.getByRole('checkbox', { name: 'My visible task', exact: true }),
          ).toBeChecked()
          await expect(
            page.getByRole('checkbox', { name: '世界 untouched', exact: true }),
          ).not.toBeChecked()
          expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([])
        }
      }
    }
  })
}
