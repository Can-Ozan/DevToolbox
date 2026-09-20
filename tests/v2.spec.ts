import { test, expect } from '@playwright/test'
import AxeBuilder from '@axe-core/playwright'
import { readFile } from 'node:fs/promises'

const newTools = [
  'json-yaml',
  'markdown',
  'cron',
  'qr',
  'case',
  'number-base',
  'contrast',
  'url-parser',
]

test('JSON/YAML round-trip, parsing errors, copy and download', async ({ page, context }) => {
  await context.grantPermissions(['clipboard-read', 'clipboard-write'])
  await page.goto('/tools/json-yaml')
  const original = { message: '👋 世界', nested: { items: [null, true, 42] } }
  await page.getByLabel('JSON input', { exact: true }).fill(JSON.stringify(original))
  await page.getByRole('button', { name: 'Convert JSON to YAML' }).click()
  expect(await page.getByLabel('YAML output').inputValue()).toContain('message:')
  const download = page.waitForEvent('download')
  await page.getByRole('button', { name: 'Download', exact: true }).click()
  expect((await download).suggestedFilename()).toBe('converted.yaml')
  await page.getByRole('button', { name: 'Swap direction' }).click()
  await page.getByRole('button', { name: 'Convert YAML to JSON' }).click()
  expect(JSON.parse(await page.getByLabel('JSON output').inputValue())).toEqual(original)
  await page.getByRole('button', { name: 'Copy output' }).click()
  expect(JSON.parse(await page.evaluate(() => navigator.clipboard.readText()))).toEqual(original)
  await page.getByLabel('YAML input').fill('a: [broken')
  await page.getByRole('button', { name: 'Convert YAML to JSON' }).click()
  await expect(page.getByRole('alert')).toBeVisible()
})

test('Markdown renders GFM safely without remote image requests', async ({ page, baseURL }) => {
  const external: string[] = []
  page.on('request', (request) => {
    if (!request.url().startsWith(`${baseURL}/`) && !request.url().startsWith('data:'))
      external.push(request.url())
  })
  await page.goto('/tools/markdown')
  await page.getByRole('button', { name: 'Load sample' }).click()
  await expect(page.locator('.markdown-preview table')).toBeVisible()
  await expect(page.locator('.markdown-preview input[type=checkbox]')).toHaveCount(2)
  await expect(page.locator('.markdown-preview pre')).toContainText('const hello')
  const pixel =
    'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jRZkAAAAASUVORK5CYII='
  await page
    .getByLabel('Markdown input')
    .fill(
      `# Safe\n\n<script>window.__unsafe=true</script>\n\n<img src=x onerror="window.__unsafe=true">\n\n[bad](javascript:alert(1))\n\n![remote](https://example.com/tracker.png)\n\n![embedded](${pixel})`,
    )
  await expect(page.locator('.markdown-preview script')).toHaveCount(0)
  await expect(page.locator('.markdown-preview [onerror]')).toHaveCount(0)
  await expect(page.locator('.markdown-preview a[href^="javascript:"]')).toHaveCount(0)
  await expect(page.getByAltText('embedded')).toHaveAttribute('src', pixel)
  await expect(page.getByText(/Image blocked: remote/)).toBeVisible()
  expect(await page.evaluate(() => Reflect.get(window, '__unsafe'))).toBeUndefined()
  expect(external).toEqual([])
  const download = page.waitForEvent('download')
  await page.getByRole('button', { name: 'Download', exact: true }).click()
  expect((await download).suggestedFilename()).toBe('document.md')
})

test('cron presets, custom interval and invalid field handling', async ({ page }) => {
  await page.goto('/tools/cron')
  await page.getByLabel('Common presets').selectOption('*/5 * * * *')
  await expect(page.getByLabel('Cron expression', { exact: true })).toHaveText('*/5 * * * *')
  await page.getByLabel('Minute value', { exact: true }).fill('15')
  await expect(page.getByText('Every 15 minutes', { exact: true })).toBeVisible()
  await page.getByLabel('Minute value', { exact: true }).fill('0')
  await expect(page.getByRole('alert')).toBeVisible()
  await page.getByRole('button', { name: 'Reset', exact: true }).click()
  await expect(page.getByLabel('Cron expression', { exact: true })).toHaveText('0 9 * * *')
})

test('QR preview produces a correctly sized PNG and handles invalid input', async ({ page }) => {
  await page.goto('/tools/qr')
  await page.getByLabel('Image size').selectOption('512')
  await page.getByLabel('QR input').fill('DevToolbox 👋 世界')
  await expect(page.getByAltText('Generated QR code')).toBeVisible()
  const download = page.waitForEvent('download')
  await page.getByRole('button', { name: 'Download PNG' }).click()
  const file = await download
  expect(file.suggestedFilename()).toBe('qrcode.png')
  const filePath = await file.path()
  if (!filePath) throw new Error('QR download was not saved')
  const png = await readFile(filePath)
  expect(png.subarray(0, 8).toString('hex')).toBe('89504e470d0a1a0a')
  expect(png.readUInt32BE(16)).toBe(512)
  expect(png.readUInt32BE(20)).toBe(512)
  await page.getByLabel('Input type').selectOption('url')
  await expect(page.getByRole('alert')).toBeVisible()
  await page.getByLabel('QR input').fill('https://example.com')
  await expect(page.getByAltText('Generated QR code')).toBeVisible()
  await page.getByRole('button', { name: 'Clear', exact: true }).click()
  await expect(page.getByAltText('Generated QR code')).toHaveCount(0)
})

test('case conversion and large-number precision work in the interface', async ({ page }) => {
  await page.goto('/tools/case')
  await page.getByLabel('Text input').fill('helloWorld')
  await expect(page.locator('.code-output').filter({ hasText: /^hello_world$/ })).toBeVisible()
  await expect(page.locator('.code-output').filter({ hasText: /^hello-world$/ })).toBeVisible()
  await page.goto('/tools/number-base')
  const original = '123456789012345678901234567890'
  await page.getByLabel('Decimal · base 10').fill(original)
  const binary = await page.getByLabel('Binary · base 2').inputValue()
  await page.getByLabel('Binary · base 2').fill(binary + '0')
  await expect(page.getByLabel('Decimal · base 10')).toHaveValue((BigInt(original) * 2n).toString())
  await page.getByLabel('Binary · base 2').fill('102')
  await expect(page.getByRole('alert')).toBeVisible()
  await expect(page.getByLabel('Decimal · base 10')).toHaveValue('')
})

test('contrast thresholds and parsed URLs protect credential passwords', async ({
  page,
  context,
}) => {
  await context.grantPermissions(['clipboard-read', 'clipboard-write'])
  await page.goto('/tools/contrast')
  await page.getByLabel('Foreground color').fill('#000')
  await page.getByLabel('Background color').fill('#fff')
  await expect(page.getByLabel('Contrast ratio', { exact: true })).toHaveText('21.00:1')
  await expect(page.getByText('Pass', { exact: true })).toHaveCount(4)
  await page.getByLabel('Foreground color').fill('#fff')
  await expect(page.getByText('Fail', { exact: true })).toHaveCount(4)
  await page.goto('/tools/url-parser')
  await page
    .getByLabel('URL to parse')
    .fill('https://alice:topsecret@example.com:8080/p?tag=one&tag=two&token=topsecret#intro')
  await expect(page.locator('.matches-table tbody tr')).toHaveCount(3)
  await page.getByRole('button', { name: 'Copy parsed JSON' }).click()
  const output = await page.evaluate(() => navigator.clipboard.readText())
  expect(output).not.toContain('topsecret')
  expect(JSON.parse(output)).toMatchObject({
    port: '8080',
    fragment: '#intro',
    passwordPresent: true,
  })
  await page.getByLabel('URL to parse').fill('not a url')
  await expect(page.getByRole('alert')).toBeVisible()
})

test('new registry entries integrate with favorites, history and command search', async ({
  page,
}) => {
  for (const tool of newTools) {
    await page.goto(`/tools/${tool}`)
    await expect(page.locator('main h1')).toBeVisible()
    await page.locator('.tool-page-heading .favorite-button').click()
  }
  await page.goto('/favorites')
  await expect(page.locator('.tool-card')).toHaveCount(8)
  await page.goto('/recent')
  await expect(page.locator('.tool-card')).toHaveCount(8)
  await page.keyboard.press('Control+k')
  await page.getByRole('combobox', { name: 'Search tools, files and actions' }).fill('yaml')
  await page.keyboard.press('Enter')
  await expect(page).toHaveURL('/tools/json-yaml')
})

test('new pages are responsive and free of console errors or automatic external requests', async ({
  page,
  baseURL,
}) => {
  const errors: string[] = []
  const external: string[] = []
  page.on('pageerror', (error) => errors.push(error.message))
  page.on('console', (message) => {
    if (message.type() === 'error') errors.push(message.text())
  })
  page.on('request', (request) => {
    if (!request.url().startsWith(`${baseURL}/`) && !request.url().startsWith('data:'))
      external.push(request.url())
  })
  for (const width of [320, 375, 768, 1024, 1440, 1920]) {
    await page.setViewportSize({ width, height: 900 })
    for (const tool of newTools) {
      await page.goto(`/tools/${tool}`)
      await expect(page.getByText('Opening your tool…')).not.toBeVisible()
      await expect(page.locator('main h1')).toBeVisible()
      if (tool === 'url-parser')
        await page
          .getByLabel('URL to parse')
          .fill('https://example.com:8080/docs?long_parameter_name=some-long-value#fragment')
      if (tool === 'case') await page.getByLabel('Text input').fill('HTTPServer_with-long-value')
      expect(
        await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth),
        `${tool} at ${width}px`,
      ).toBe(true)
    }
  }
  expect(errors).toEqual([])
  expect(external).toEqual([])
})

for (const theme of ['light', 'dark'] as const) {
  test(`new pages accessibility in ${theme} theme`, async ({ page }) => {
    await page.emulateMedia({ colorScheme: theme, reducedMotion: 'reduce' })
    for (const tool of newTools) {
      await page.goto(`/tools/${tool}`)
      await expect(page.getByText('Opening your tool…')).not.toBeVisible()
      const report = await new AxeBuilder({ page })
        .withTags(['wcag2a', 'wcag2aa', 'wcag21aa'])
        .analyze()
      expect(
        report.violations.map((v) => ({
          id: v.id,
          nodes: v.nodes.map((n) => ({ target: n.target, summary: n.failureSummary })),
        })),
        tool,
      ).toEqual([])
    }
  })
}
