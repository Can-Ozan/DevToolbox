import { test, expect, type Page } from '@playwright/test'
import AxeBuilder from '@axe-core/playwright'
const key = 'devtoolbox.preferences.v1'
async function image(page: Page) {
  const encoded = await page.evaluate(() => {
    const canvas = document.createElement('canvas')
    canvas.width = 80
    canvas.height = 40
    const ctx = canvas.getContext('2d')!
    ctx.fillStyle = '#7760d7'
    ctx.fillRect(0, 0, 80, 40)
    return canvas.toDataURL().split(',')[1]
  })
  return { name: 'project.png', mimeType: 'image/png', buffer: Buffer.from(encoded, 'base64') }
}
async function seedFiles(page: Page) {
  await page.goto('/workspace')
  await page.locator('input[type=file]').setInputFiles([
    await image(page),
    {
      name: 'notes.txt',
      mimeType: 'text/plain',
      buffer: Buffer.from('private-content-should-not-be-searchable'),
    },
    {
      name: 'project.pdf',
      mimeType: 'application/pdf',
      buffer: Buffer.from('%PDF-test metadata'),
    },
    { name: 'archive.bin', mimeType: 'application/octet-stream', buffer: Buffer.from('binary') },
  ])
  await expect(page.locator('.workspace-file')).toHaveCount(4)
}

test('local counts, featured fallback, dashboard actions and catalog sorting', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByRole('heading', { name: 'Featured tools', exact: true })).toBeVisible()
  await expect(page.getByRole('region', { name: 'Quick actions' }).getByRole('link')).toHaveCount(6)
  for (const id of ['json', 'json', 'base64', 'uuid']) {
    await page.goto(`/tools/${id}`)
    await expect(page.locator('main h1')).toBeVisible()
  }
  const prefs = await page.evaluate((key) => JSON.parse(localStorage.getItem(key)!), key)
  expect(prefs.toolUsage).toEqual({ json: 2, base64: 1, uuid: 1 })
  await page.goto('/')
  await expect(page.getByRole('heading', { name: 'Most used', exact: true })).toBeVisible()
  await page.goto('/tools')
  await page.getByLabel('Sort tools').selectOption('usage')
  await expect(page.locator('.tool-card').first()).toContainText('JSON Formatter')
  await page.getByLabel('Sort tools').selectOption('recent')
  await expect(page.locator('.tool-card').first()).toContainText('UUID Generator')
  await page.getByRole('button', { name: 'Add UUID Generator to favorites' }).click()
  await expect(
    page
      .getByRole('navigation', { name: 'Pinned tools' })
      .getByRole('link', { name: 'UUID Generator' }),
  ).toBeVisible()
  await page.getByLabel('Sort tools').selectOption('favorites')
  await expect(page.locator('.tool-card').first()).toContainText('UUID Generator')
  await page.getByLabel('Sort tools').selectOption('name')
  await expect(page.locator('.tool-card').first()).toContainText('Base64')
  await page.goto('/settings')
  await page.getByRole('button', { name: 'Clear usage counts' }).click()
  await page.getByRole('button', { name: 'Confirm clear' }).click()
  await page.goto('/')
  await expect(page.getByRole('heading', { name: 'Featured tools', exact: true })).toBeVisible()
})

test('universal palette searches metadata, groups results and performs keyboard actions', async ({
  page,
}) => {
  await seedFiles(page)
  await page.keyboard.press('Control+k')
  const input = page.getByRole('combobox', { name: 'Search tools, files and actions' })
  await input.fill('pdf')
  await expect(page.getByRole('group', { name: 'Tools', exact: true })).toBeVisible()
  await expect(
    page.getByRole('group', { name: 'Files', exact: true }).getByRole('option'),
  ).toContainText('project.pdf')
  await expect(
    page.getByRole('group', { name: 'Actions', exact: true }).getByRole('option'),
  ).toContainText('Open Workspace')
  await input.fill('private-content-should-not-be-searchable')
  await expect(page.getByRole('option')).toHaveCount(0)
  await input.fill('notes.txt')
  await page.keyboard.press('ArrowDown')
  await page.keyboard.press('Enter')
  await expect(page).toHaveURL(/\/workspace\?file=/)
  await expect(page.locator('.workspace-file').filter({ hasText: 'notes.txt' })).toBeFocused()
  await expect(page.locator('body')).not.toHaveCSS('overflow', 'hidden')
  await page.keyboard.press('Meta+k')
  await input.fill('toggle theme')
  const oldTheme = await page.locator('html').getAttribute('data-theme')
  await page.keyboard.press('Enter')
  await expect(page.locator('html')).not.toHaveAttribute('data-theme', oldTheme!)
  await page.keyboard.press('Control+k')
  await input.fill('open settings')
  await page.keyboard.press('ArrowUp')
  await page.keyboard.press('Enter')
  await expect(page).toHaveURL('/settings')
})

test('Workspace views, type filters, keyboard overflow, downloads and empty state', async ({
  page,
  context,
}) => {
  await context.grantPermissions(['clipboard-read', 'clipboard-write'])
  await page.goto('/workspace')
  await expect(page.getByRole('heading', { name: 'Your Workspace is empty.' })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Import files', exact: true })).toBeVisible()
  await expect(page.getByRole('link', { name: 'Explore file tools' })).toBeVisible()
  await seedFiles(page)
  await expect(page.getByRole('region', { name: 'Browser storage' })).toContainText('4 files')
  await expect(page.getByRole('region', { name: 'Browser storage' })).toContainText('approximate')
  await page.getByRole('button', { name: 'List', exact: true }).click()
  await page.reload()
  await expect(page.getByRole('button', { name: 'List', exact: true })).toHaveAttribute(
    'aria-pressed',
    'true',
  )
  for (const type of ['Images', 'PDFs', 'Text', 'Other']) {
    await page.getByRole('button', { name: type, exact: true }).click()
    await expect(page.locator('.workspace-file')).toHaveCount(1)
  }
  await page.getByRole('button', { name: 'All', exact: true }).click()
  await page.getByRole('button', { name: 'Grid', exact: true }).click()
  // Grid thumbnails are decoded only when their cards enter the viewport.
  await page
    .locator('.workspace-file')
    .filter({ has: page.getByRole('heading', { name: 'project.png', exact: true }) })
    .scrollIntoViewIfNeeded()
  await expect(page.locator('.file-thumbnail img')).toBeVisible()
  const more = page.getByRole('button', { name: 'More actions for notes.txt', exact: true })
  await more.focus()
  await page.keyboard.press('Enter')
  await expect(page.getByRole('menuitem', { name: 'Download notes.txt' })).toBeFocused()
  await page.keyboard.press('ArrowDown')
  await expect(page.getByRole('menuitem', { name: 'Pin notes.txt' })).toBeFocused()
  await page.keyboard.press('Escape')
  await expect(more).toBeFocused()
  await more.click()
  await page.keyboard.press('Tab')
  await expect(page.getByRole('menu')).not.toBeVisible()
  await expect(page.getByRole('button', { name: 'Preview notes.txt', exact: true })).toBeFocused()
  await more.click()
  await page.getByRole('menuitem', { name: 'Copy filename notes.txt' }).click()
  await expect.poll(() => page.evaluate(() => navigator.clipboard.readText())).toBe('notes.txt')
  await more.click()
  const downloading = page.waitForEvent('download')
  await page.getByRole('menuitem', { name: 'Download notes.txt' }).click()
  expect((await downloading).suggestedFilename()).toBe('notes.txt')
  await more.click()
  await page.getByRole('menuitem', { name: 'Pin notes.txt' }).click()
  await expect(page.locator('.workspace-file').first()).toContainText('★ notes.txt')
  await page.goto('/')
  await expect(
    page.getByRole('region', { name: 'Continue working' }).locator('article'),
  ).toHaveCount(3)
  await expect(page.locator('.workspace-stats')).toContainText('4')
  await page.goto('/settings')
  await page.getByRole('button', { name: 'Clear Workspace', exact: true }).click()
  await page.keyboard.press('Escape')
  await expect(page.getByRole('button', { name: 'Clear Workspace', exact: true })).toBeFocused()
  await page.getByRole('button', { name: 'Clear Workspace', exact: true }).click()
  await page.getByRole('button', { name: 'Confirm clear' }).click()
  await page.goto('/workspace')
  await expect(page.locator('.workspace-file')).toHaveCount(0)
})

test('explicit save-and-open workflow, related tools and defaults are consumed', async ({
  page,
}) => {
  await page.goto('/settings')
  await page.getByLabel('JSON indentation').selectOption('4')
  await page.getByLabel('HEX letter case').selectOption('lower')
  await page.getByLabel('Default JPEG quality').fill('65')
  await page.getByLabel('Default JPEG background').fill('#00ff00')
  await page.goto('/tools/json')
  await expect(page.getByLabel('Indentation')).toHaveValue('4')
  await expect(page.getByRole('region', { name: 'Related tools' }).getByRole('link')).toHaveCount(3)
  await page.goto('/tools/color')
  await expect(page.getByRole('textbox', { name: 'HEX', exact: true })).toHaveValue('#7760d7')
  await page.goto('/tools/image-converter')
  await page.locator('input[type=file]').setInputFiles(await image(page))
  await page.getByLabel('Output format').selectOption('image/jpeg')
  await expect(page.getByLabel('Quality', { exact: true })).toHaveValue('65')
  await expect(page.getByLabel('JPEG background', { exact: true })).toHaveValue('#00ff00')
  await page.getByRole('button', { name: 'Convert image', exact: true }).click()
  await expect(page.getByRole('heading', { name: 'Completed' })).toBeVisible()
  await expect(page.getByRole('region', { name: 'File output' })).toContainText('80 × 40 px')
  await expect(
    page.getByRole('button', { name: 'Save & open Image Compressor', exact: true }),
  ).toBeVisible()
  await page.getByRole('button', { name: 'Save & open Image Compressor', exact: true }).click()
  await expect(page).toHaveURL(/\/tools\/image-compressor\?file=/)
  await expect(page.getByAltText('Input preview')).toBeVisible()
  await page.getByRole('button', { name: 'Compress image', exact: true }).click()
  await expect(page.locator('.result-stats')).toContainText('Difference')
  await page.getByRole('button', { name: 'Save to Workspace', exact: true }).click()
  await page.getByRole('link', { name: 'Use in Image Resizer', exact: true }).click()
  await expect(page.getByAltText('Input preview')).toBeVisible()
  await page.goto('/workspace')
  await expect(page.locator('.workspace-file')).toHaveCount(2)
})

for (const theme of ['light', 'dark'] as const) {
  test(`v3.1 surfaces and menus accessible in ${theme}`, async ({ page }) => {
    test.setTimeout(90_000)
    await page.emulateMedia({ colorScheme: theme, reducedMotion: 'reduce' })
    await seedFiles(page)
    async function check() {
      const result = await new AxeBuilder({ page })
        .withTags(['wcag2a', 'wcag2aa', 'wcag21aa'])
        .analyze()
      expect(
        result.violations.map((v) => ({ id: v.id, nodes: v.nodes.map((n) => n.target) })),
      ).toEqual([])
    }
    await check()
    await page.getByRole('button', { name: 'More actions for notes.txt' }).click()
    await check()
    await page.keyboard.press('Escape')
    await page.keyboard.press('Control+k')
    await page.getByRole('combobox', { name: 'Search tools, files and actions' }).fill('pdf')
    await check()
    await page.keyboard.press('Escape')
    await page.getByRole('button', { name: 'List', exact: true }).click()
    await check()
    await page.goto('/')
    await check()
    await page.goto('/settings')
    await check()
    await page.goto('/tools/image-converter')
    await page.locator('input[type=file]').setInputFiles(await image(page))
    await page.getByRole('button', { name: 'Convert image', exact: true }).click()
    await expect(page.getByAltText('Output preview')).toBeVisible()
    await check()
  })
}

test('v3.1 responsive surfaces, menus and local-only loaded workflows', async ({
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
    if (!request.url().startsWith(baseURL + '/') && !/^(blob:|data:)/.test(request.url()))
      external.push(request.url())
  })
  await seedFiles(page)
  for (const width of [320, 375, 768, 1024, 1440, 1920]) {
    await page.setViewportSize({ width, height: 900 })
    for (const route of ['/', '/workspace', '/tools', '/settings', '/tools/image-converter']) {
      await page.goto(route)
      await expect(page.locator('main h1')).toBeVisible()
      if (route === '/tools/image-converter') {
        await page.locator('input[type=file]').setInputFiles(await image(page))
        await page.getByRole('button', { name: 'Convert image', exact: true }).click()
        await expect(page.getByAltText('Output preview')).toBeVisible()
      }
      expect(
        await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth),
        `${route} at ${width}`,
      ).toBe(true)
      if (route === '/workspace') {
        await page.getByRole('button', { name: 'More actions for notes.txt' }).click()
        const bounds = await page.getByRole('menu').boundingBox()
        expect(
          bounds &&
            bounds.x >= 0 &&
            bounds.x + bounds.width <= width &&
            bounds.y >= 0 &&
            bounds.y + bounds.height <= 900,
        ).toBe(true)
        await page.keyboard.press('Escape')
      }
    }
    await page.keyboard.press('Control+k')
    await page.getByRole('combobox', { name: 'Search tools, files and actions' }).fill('project')
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
    await page.keyboard.press('Escape')
  }
  expect(errors).toEqual([])
  expect(external).toEqual([])
})

test('drop feedback rejects unsupported files without replacing a usable input', async ({
  page,
}) => {
  await page.goto('/tools/image-converter')
  await page.locator('input[type=file]').setInputFiles(await image(page))
  await expect(page.getByAltText('Input preview')).toBeVisible()
  const transfer = await page.evaluateHandle(() => {
    const data = new DataTransfer()
    data.items.add(new File(['<svg/>'], 'unsafe.svg', { type: 'image/svg+xml' }))
    return data
  })
  const picker = page.getByRole('region', { name: 'Input source' })
  await picker.dispatchEvent('dragover', { dataTransfer: transfer })
  await expect(picker).toHaveClass(/drop-invalid/)
  await expect(picker.getByRole('alert')).toContainText('not supported')
  await picker.dispatchEvent('drop', { dataTransfer: transfer })
  await transfer.dispose()
  await expect(page.getByAltText('Input preview')).toBeVisible()
  await expect(picker.getByRole('alert')).toContainText('Unsupported')
  await page.getByRole('button', { name: 'Convert image', exact: true }).click()
  await expect(page.getByRole('heading', { name: 'Completed' })).toBeVisible()
  expect(
    await page.evaluate(
      async () =>
        new Promise<number>((resolve, reject) => {
          const request = indexedDB.open('devtoolbox.workspace', 1)
          request.onerror = () => reject(request.error)
          request.onsuccess = () => {
            const db = request.result
            const count = db.transaction('files').objectStore('files').count()
            count.onsuccess = () => {
              resolve(count.result)
              db.close()
            }
            count.onerror = () => {
              reject(count.error)
              db.close()
            }
          }
        }),
    ),
  ).toBe(0)
})
