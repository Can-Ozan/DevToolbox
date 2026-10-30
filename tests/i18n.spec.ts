import { test, expect } from '@playwright/test'
import AxeBuilder from '@axe-core/playwright'
import { readFile } from 'node:fs/promises'

test('workspace preserves names, selections, menus and backups across language changes', async ({
  page,
  context,
}) => {
  test.setTimeout(90_000)
  const name = '<img onerror=alert(1)> {{shell.settings}}'
  await page.goto('/workspace')
  await page.getByLabel('Import files', { exact: true }).setInputFiles([
    {
      name: '<img onerror=alert(1)>.json',
      mimeType: 'application/json',
      buffer: Buffer.from('{"unchanged":"世界"}'),
    },
    { name: 'second.txt', mimeType: 'text/plain', buffer: Buffer.from('keep bytes') },
  ])
  await expect(page.locator('.workspace-file')).toHaveCount(2)
  await page.getByRole('button', { name: 'New collection', exact: true }).click()
  await page.getByLabel('Collection name', { exact: true }).fill(name)
  await page.getByRole('button', { name: 'Save collection', exact: true }).click()
  await expect(page.getByRole('dialog')).toHaveCount(0)
  const collection = page.locator('section[aria-label="Workspace collections"] select')
  const id = await collection.inputValue()
  await collection.selectOption('')
  await page.getByRole('button', { name: 'Select files', exact: true }).click()
  await page.getByRole('button', { name: 'Select all visible', exact: true }).click()
  const settings = await context.newPage()
  await settings.goto('/settings')
  await settings.locator('#app-language').selectOption('de')
  await expect(page.locator('html')).toHaveAttribute('lang', 'de')
  await expect(page.locator('.workspace-select input:checked')).toHaveCount(2)
  await page
    .getByRole('button', { name: 'Ausgewählte in Sammlung verschieben', exact: true })
    .click()
  await page.getByLabel('Zielsammlung', { exact: true }).selectOption(id)
  await page.getByRole('button', { name: 'Sammlung anwenden', exact: true }).click()
  await expect(page.getByRole('dialog')).toHaveCount(0)
  await page.reload()
  await page.getByLabel('Sammlung', { exact: true }).selectOption(id)
  await expect(page.locator('.workspace-file')).toHaveCount(2)
  await page.getByRole('button', { name: 'Sammlung umbenennen', exact: true }).click()
  await page.getByLabel('Sammlungsname', { exact: true }).fill(name + ' API')
  await page.getByRole('button', { name: 'Sammlung speichern', exact: true }).click()
  await expect(page.getByRole('dialog')).toHaveCount(0)
  await page.getByRole('button', { name: 'Liste', exact: true }).click()
  await expect(page.locator('.workspace-file').first()).toContainText(name + ' API')
  expect(await page.locator('main img[onerror]').count()).toBe(0)
  const menu = page.locator('.workspace-file .overflow-actions > button').first()
  await menu.click()
  await page.keyboard.press('ArrowDown')
  const focused = await page.getByRole('menuitem').nth(1).elementHandle()
  await settings.locator('#app-language').selectOption('tr')
  await expect(page.locator('html')).toHaveAttribute('lang', 'tr')
  expect(await focused!.evaluate((el) => document.activeElement === el)).toBe(true)
  await page.keyboard.press('Escape')
  await expect(menu).toBeFocused()
  await page.getByRole('button', { name: 'Çalışma alanını dışa aktar', exact: true }).click()
  const output = page.getByRole('region', { name: 'Dosya çıktısı', exact: true })
  const downloading = page.waitForEvent('download')
  await output.getByRole('button', { name: 'İndir', exact: true }).click()
  const buffer = await readFile((await (await downloading).path())!)
  await page.getByRole('button', { name: 'Koleksiyonu sil', exact: true }).click()
  await page.getByRole('button', { name: 'Koleksiyon silmeyi onayla', exact: true }).click()
  await expect(page.locator('.workspace-file')).toHaveCount(2)
  await page.getByRole('button', { name: 'Çalışma alanını temizle', exact: true }).click()
  await page.getByRole('button', { name: 'Temizlemeyi onayla', exact: true }).click()
  await expect(page.locator('.workspace-file')).toHaveCount(0)
  await settings.locator('#app-language').selectOption('es')
  await page.getByRole('button', { name: 'Importar copia de Workspace', exact: true }).click()
  await page
    .getByLabel('Archivo de copia de Workspace', { exact: true })
    .setInputFiles({ name: 'backup.zip', mimeType: 'application/zip', buffer })
  await page.getByRole('button', { name: 'Confirmar importación', exact: true }).click()
  await expect(page.locator('.workspace-file')).toHaveCount(2)
  await page.reload()
  await expect(page.locator('.workspace-file').first()).toContainText(name + ' API')
  await page
    .getByRole('button', { name: 'Vista previa _img onerror=alert(1)_.json', exact: true })
    .click()
  await expect(page.getByRole('dialog')).toContainText('{"unchanged":"世界"}')
  await page.keyboard.press('Escape')
  await page
    .locator('.workspace-file')
    .filter({ hasText: '_img onerror=alert(1)_.json' })
    .getByRole('button', { name: 'Usar en otra herramienta', exact: true })
    .click()
  await page
    .getByRole('dialog')
    .getByRole('link', { name: 'Formateador JSON', exact: true })
    .click()
  await expect(page).toHaveURL(/\/tools\/json\?file=/)
  await expect(page.getByLabel('Entrada JSON', { exact: true })).toHaveValue('{"unchanged":"世界"}')
})

for (const theme of ['light', 'dark'] as const) {
  test(`workspace translated controls and dialogs fit all languages in ${theme}`, async ({
    page,
    context,
  }) => {
    test.setTimeout(90_000)
    await page.emulateMedia({ colorScheme: theme })
    await page.goto('/workspace')
    await page.getByLabel('Import files', { exact: true }).setInputFiles({
      name: 'long-unchanged-file.json',
      mimeType: 'application/json',
      buffer: Buffer.from('{}'),
    })
    await expect(page.locator('.workspace-file')).toHaveCount(1)
    const settings = await context.newPage()
    await settings.goto('/settings')
    for (const [language, create, field] of [
      ['en', 'New collection', 'Collection name'],
      ['tr', 'Yeni koleksiyon', 'Koleksiyon adı'],
      ['de', 'Neue Sammlung', 'Sammlungsname'],
      ['es', 'Nueva colección', 'Nombre de la colección'],
    ]) {
      await settings.locator('#app-language').selectOption(language)
      await expect(page.locator('html')).toHaveAttribute('lang', language)
      for (const width of [320, 375, 768, 1440]) {
        await page.setViewportSize({ width, height: 900 })
        expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
          true,
        )
        const clipped = await page.locator('main button').evaluateAll((items) =>
          items
            .filter((el) => {
              const r = el.getBoundingClientRect()
              return r.width && (r.right > innerWidth + 1 || r.left < -1)
            })
            .map((el) => el.textContent),
        )
        expect(clipped).toEqual([])
      }
      await page.setViewportSize({ width: 320, height: 800 })
      const trigger = page.getByRole('button', { name: create, exact: true })
      await trigger.click()
      await page.getByLabel(field, { exact: true }).fill('Untouched project')
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
        true,
      )
      expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([])
      await page.keyboard.press('Escape')
      await expect(trigger).toBeFocused()
      expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([])
    }
  })
}

test('discovery retains English shortcuts and matches translated tools and actions', async ({
  page,
}) => {
  await page.goto('/settings')
  await page.locator('#app-language').selectOption('tr')
  await page.keyboard.press('Control+k')
  const search = page.getByRole('combobox', { name: 'Araç, dosya ve işlem ara', exact: true })
  await search.fill('json')
  await search.press('Enter')
  await expect(page).toHaveURL(/\/tools\/json$/)
  await expect(
    page.getByRole('heading', { name: 'JSON Biçimlendirici', exact: true }),
  ).toBeVisible()
  for (const [query, path] of [
    ['workspace', 'workspace'],
    ['ayarlar', 'settings'],
    ['parola', 'tools/password'],
    ['npm', 'tools/package-json'],
  ]) {
    await page.keyboard.press('Control+k')
    await search.fill(query)
    await search.press('Enter')
    await expect(page).toHaveURL(new RegExp(`/${path}$`))
  }
  await page.goto('/tools')
  await page.getByRole('textbox', { name: 'Tüm araçlarda ara', exact: true }).fill('parola')
  await expect(page.locator('.tool-card')).toHaveCount(1)
  await expect(page.locator('.tool-card')).toContainText('Parola Oluşturucu')
  await page.goto('/')
  await expect(
    page.getByRole('heading', { name: 'Daha az uğraş. Daha akıcı çalışma.', exact: true }),
  ).toBeVisible()
})

test('discovery category controls keep their DOM identity and focus across language changes', async ({
  page,
  context,
}) => {
  await page.goto('/')
  const settings = await context.newPage()
  await settings.goto('/settings')
  for (const [path, selector, language] of [
    ['/', '.category-grid a', 'de'],
    ['/tools', '.filter-tabs button:nth-child(2)', 'es'],
  ]) {
    await page.goto(path)
    const control = await page.locator(selector).first().elementHandle()
    await control!.focus()
    await settings.locator('#app-language').selectOption(language)
    await expect(page.locator('html')).toHaveAttribute('lang', language)
    expect(await control!.evaluate((element) => element.isConnected)).toBe(true)
    expect(await control!.evaluate((element) => document.activeElement === element)).toBe(true)
  }
})

test('shell translates Settings, drawer and confirmation while keeping canonical metadata', async ({
  page,
  context,
}) => {
  await page.setViewportSize({ width: 375, height: 800 })
  await page.goto('/settings')
  const metadata = await page.evaluate(() => ({
    title: document.title,
    canonical: document.querySelector<HTMLLinkElement>('link[rel="canonical"]')!.href,
    description: document.querySelector<HTMLMetaElement>('meta[name="description"]')!.content,
  }))
  await page.locator('#app-language').selectOption('de')
  await expect(page.getByRole('heading', { name: 'Einstellungen', exact: true })).toBeVisible()
  await page.getByRole('button', { name: 'Navigation öffnen', exact: true }).click()
  const drawer = page.getByRole('dialog', { name: /^(Navigation|Navegación)$/ })
  await expect(drawer.getByRole('link', { name: 'Alle Tools', exact: false })).toBeVisible()
  const settings = await context.newPage()
  await settings.goto('/settings')
  await settings.locator('#app-language').selectOption('es')
  await expect(drawer).toBeVisible()
  await expect(drawer.getByRole('link', { name: 'Ajustes', exact: true })).toBeVisible()
  await page.keyboard.press('Escape')
  await expect(drawer).not.toBeVisible()
  await expect(page.locator('body')).not.toHaveCSS('overflow', 'hidden')
  await page
    .getByRole('button', { name: 'Restablecer todas las preferencias', exact: true })
    .click()
  const confirm = page.getByRole('dialog', {
    name: '¿Restablecer todas las preferencias?',
    exact: true,
  })
  // The existing native dialog initially focuses its first available action (Close).
  await expect(confirm.getByRole('button', { name: 'Cerrar diálogo', exact: true })).toBeFocused()
  await page.keyboard.press('Shift+Tab')
  await expect(
    confirm.getByRole('button', { name: 'Confirmar restablecimiento', exact: true }),
  ).toBeFocused()
  await page.keyboard.press('Tab')
  await page.keyboard.press('Tab')
  await expect(confirm.getByRole('button', { name: 'Cancelar', exact: true })).toBeFocused()
  expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([])
  await page.keyboard.press('Escape')
  await expect(confirm).not.toBeVisible()
  expect(
    await page.evaluate(() => ({
      title: document.title,
      canonical: document.querySelector<HTMLLinkElement>('link[rel="canonical"]')!.href,
      description: document.querySelector<HTMLMetaElement>('meta[name="description"]')!.content,
    })),
  ).toEqual(metadata)
})

test('shell language changes preserve scroll and translate shared editor controls', async ({
  page,
  context,
}) => {
  await page.setViewportSize({ width: 375, height: 667 })
  await page.goto('/tools/json')
  await page.getByRole('textbox', { name: 'JSON input', exact: true }).fill('{}')
  await page.evaluate(() => scrollTo(0, 300))
  const position = await page.evaluate(() => scrollY)
  const settings = await context.newPage()
  await settings.goto('/settings')
  await settings.locator('#app-language').selectOption('tr')
  await expect(page.locator('html')).toHaveAttribute('lang', 'tr')
  expect(await page.evaluate(() => scrollY)).toBe(position)
  await expect(page.locator('.editor-footer').first()).toContainText('2 karakter')
  await expect(page.getByRole('button', { name: 'Gezinmeyi aç', exact: true })).toBeVisible()
})

test('foundation detects, switches and persists a language using the native keyboard control', async ({
  browser,
}) => {
  const context = await browser.newContext({ locale: 'tr-TR' })
  const page = await context.newPage()
  try {
    await page.goto('/settings')
    await expect(page.locator('html')).toHaveAttribute('lang', 'tr')
    const select = page.locator('#app-language')
    await expect(select).toHaveAccessibleName('Dil')
    await select.focus()
    await select.press('Home')
    await select.press('Enter')
    await expect(page.locator('html')).toHaveAttribute('lang', 'en')
    await expect(select).toBeFocused()
    await page.reload()
    await expect(select).toHaveValue('en')
    await expect(page.locator('html')).toHaveAttribute('lang', 'en')
  } finally {
    await context.close()
  }
})

test('foundation cross-tab changes preserve unsaved input, results, route and tool usage', async ({
  page,
  context,
}) => {
  await page.goto('/tools/json')
  await page
    .getByRole('textbox', { name: 'JSON input', exact: true })
    .fill('{"untouched":"İstanbul 世界"}')
  await page.getByRole('button', { name: 'Format JSON', exact: true }).click()
  const input = await page.getByRole('textbox', { name: 'JSON input', exact: true }).inputValue()
  const output = await page.getByRole('textbox', { name: 'JSON output', exact: true }).inputValue()
  const visits = await page.evaluate(
    () => JSON.parse(localStorage.getItem('devtoolbox.preferences.v1')!).toolUsage.json,
  )
  const settings = await context.newPage()
  await settings.goto('/settings')
  for (const language of ['de', 'es', 'tr', 'en']) {
    await settings.locator('#app-language').selectOption(language)
    await expect(page.locator('html')).toHaveAttribute('lang', language)
    await expect(page.getByRole('textbox').first()).toHaveValue(input)
    await expect(page.getByRole('textbox').last()).toHaveValue(output)
    await expect(page).toHaveURL(/\/tools\/json$/)
  }
  expect(
    await page.evaluate(
      () => JSON.parse(localStorage.getItem('devtoolbox.preferences.v1')!).toolUsage.json,
    ),
  ).toBe(visits)
})

for (const theme of ['light', 'dark']) {
  test(`foundation selector accessibility and responsive layout in ${theme}`, async ({ page }) => {
    await page.addInitScript(
      (theme) =>
        localStorage.setItem('devtoolbox.preferences.v1', JSON.stringify({ version: 1, theme })),
      theme,
    )
    const errors: string[] = []
    page.on('pageerror', (error) => errors.push(error.message))
    await page.goto('/settings')
    for (const width of [320, 375, 768, 1440]) {
      await page.setViewportSize({ width, height: 900 })
      for (const language of ['tr', 'de', 'es', 'en']) {
        await page.locator('#app-language').selectOption(language)
        await expect(page.locator('html')).toHaveAttribute('lang', language)
        expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
          true,
        )
      }
    }
    expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([])
    expect(errors).toEqual([])
  })
}
