import { test, expect } from '@playwright/test'

test('dashboard, favorites, recent tools, theme and keyboard search persist', async ({ page }) => {
  await page.goto('/')
  await expect(
    page.getByRole('heading', { name: /Good (morning|afternoon|evening)/ }),
  ).toBeVisible()
  await page.getByRole('button', { name: 'Add JSON Formatter to favorites' }).click()
  await page.keyboard.press('Control+k')
  await page.getByRole('combobox', { name: 'Search tools, files and actions' }).fill('token')
  await expect(page.getByRole('option')).toHaveCount(1)
  await page.keyboard.press('Enter')
  await expect(page).toHaveURL('/tools/jwt')
  await expect(
    page.getByText('Decoding a JWT does not verify its signature or authenticity.'),
  ).toBeVisible()
  await page.goto('/settings')
  await page.getByRole('button', { name: 'Dark', exact: true }).click()
  await page.reload()
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark')
  await page.goto('/favorites')
  await expect(page.getByRole('heading', { name: 'JSON Formatter', exact: true })).toBeVisible()
  await page.goto('/recent')
  await expect(page.getByRole('heading', { name: 'JWT Decoder', exact: true })).toBeVisible()
  await page.keyboard.press('Meta+k')
  await expect(page.getByRole('dialog')).toBeVisible()
  await page.getByRole('combobox', { name: 'Search tools, files and actions' }).fill('base64')
  await expect(page.getByRole('option', { name: /Base64 Encoder \/ Decoder/ })).toBeVisible()
  await page.keyboard.press('Enter')
  await expect(page).toHaveURL('/tools/base64')
  await page.keyboard.press('Control+k')
  await page.keyboard.press('Escape')
  await expect(page.getByRole('dialog')).not.toBeVisible()
})

test('JSON validation, formatting, minification, copy and download', async ({ page, context }) => {
  await context.grantPermissions(['clipboard-read', 'clipboard-write'])
  await page.goto('/tools/json')
  await page.getByRole('textbox', { name: 'JSON input' }).fill('{broken')
  await page.getByRole('button', { name: 'Validate', exact: true }).click()
  await expect(page.getByRole('alert')).toBeVisible()
  await page.getByRole('textbox', { name: 'JSON input' }).fill('{"a":1,"name":"世界"}')
  await page.getByRole('button', { name: 'Format JSON' }).click()
  await expect(page.getByRole('textbox', { name: 'JSON output' })).toHaveValue(
    '{\n  "a": 1,\n  "name": "世界"\n}',
  )
  await page.getByRole('button', { name: 'Minify', exact: true }).click()
  await expect(page.getByRole('textbox', { name: 'JSON output' })).toHaveValue(
    '{"a":1,"name":"世界"}',
  )
  await page.getByRole('button', { name: 'Copy output' }).click()
  expect(await page.evaluate(() => navigator.clipboard.readText())).toBe('{"a":1,"name":"世界"}')
  const download = page.waitForEvent('download')
  await page.getByRole('button', { name: 'Download' }).click()
  expect((await download).suggestedFilename()).toBe('formatted.json')
})

test('Unicode Base64 and URL transforms handle malformed input', async ({ page }) => {
  await page.goto('/tools/base64')
  await page.getByRole('textbox', { name: 'Input', exact: true }).fill('Hello 世界 👋')
  await page.getByRole('button', { name: 'Encode', exact: true }).click()
  await page.getByRole('button', { name: 'Swap', exact: true }).click()
  await page.getByRole('button', { name: 'Decode', exact: true }).click()
  await expect(page.getByRole('textbox', { name: 'Output', exact: true })).toHaveValue(
    'Hello 世界 👋',
  )
  await page.getByRole('textbox', { name: 'Input', exact: true }).fill('%%%')
  await page.getByRole('button', { name: 'Decode', exact: true }).click()
  await expect(page.getByRole('alert')).toBeVisible()
  await page.goto('/tools/url')
  await page
    .getByRole('textbox', { name: 'Input', exact: true })
    .fill('https://example.com/?q=hello world&x=世界')
  await page.getByRole('button', { name: 'Encode', exact: true }).click()
  await expect(page.getByRole('textbox', { name: 'Output', exact: true })).toHaveValue(
    encodeURIComponent('https://example.com/?q=hello world&x=世界'),
  )
  await page.getByLabel('Encoding mode').selectOption('url')
  await expect(page.getByRole('textbox', { name: 'Input', exact: true })).toHaveValue(
    'https://example.com/?q=hello world&x=世界',
  )
  await page.getByRole('textbox', { name: 'Input', exact: true }).fill('%E0%A4')
  await page.getByRole('button', { name: 'Decode', exact: true }).click()
  await expect(page.getByRole('alert')).toBeVisible()
})

test('UUID and password generation use the requested settings', async ({ page }) => {
  await page.goto('/tools/uuid')
  await page.getByLabel('How many UUIDs?').selectOption('100')
  await page.getByRole('button', { name: 'Generate UUIDs' }).click()
  await expect(page.locator('.result-row')).toHaveCount(100)
  const uuids = await page.locator('.result-row code').allTextContents()
  expect(new Set(uuids).size).toBe(100)
  expect(
    uuids.every((value) =>
      /^[a-f\d]{8}-[a-f\d]{4}-4[a-f\d]{3}-[89ab][a-f\d]{3}-[a-f\d]{12}$/.test(value),
    ),
  ).toBe(true)
  await page.goto('/tools/password')
  await page.getByLabel('Password length', { exact: true }).fill('32')
  await page.getByRole('button', { name: 'Generate password', exact: true }).click()
  expect((await page.getByLabel('Generated password').textContent())?.length).toBe(32)
  for (const name of ['Uppercase', 'Lowercase', 'Numbers', 'Symbols'])
    await page.getByRole('checkbox', { name: new RegExp(name) }).uncheck()
  await page.getByRole('button', { name: 'Generate password', exact: true }).click()
  await expect(page.getByRole('alert')).toContainText('Select at least one')
})

test('JWT, timestamps and native hash outputs', async ({ page }) => {
  await page.goto('/tools/jwt')
  await page
    .getByLabel('JWT token')
    .fill('eyJhbGciOiJub25lIn0.eyJzdWIiOiIxMjMiLCJleHAiOjE3MDAwMDAwMDB9.')
  await page.getByRole('button', { name: 'Decode token' }).click()
  await expect(page.locator('.code-output').nth(1)).toContainText('"sub": "123"')
  await expect(page.getByRole('heading', { name: 'Signature · not verified' })).toBeVisible()
  await page.getByLabel('JWT token').fill('invalid')
  await page.getByRole('button', { name: 'Decode token' }).click()
  await expect(page.getByRole('alert')).toBeVisible()
  await page.goto('/tools/timestamp')
  await page.getByLabel('Unix timestamp', { exact: true }).fill('0')
  await page.getByRole('button', { name: 'Convert timestamp' }).click()
  await expect(page.locator('dd').filter({ hasText: '1970-01-01T00:00:00.000Z' })).toBeVisible()
  await page.getByLabel('Local date and time').fill('2024-01-01T12:00')
  await page.getByRole('button', { name: 'Convert date' }).click()
  await expect(page.locator('.data-table')).toContainText('2024')
  await page.goto('/tools/hash')
  await page.getByLabel('Text to hash').fill('abc')
  await page.getByRole('button', { name: 'Generate hashes' }).click()
  await expect(page.locator('.code-output')).toHaveCount(4)
  await expect(page.locator('.code-output').nth(1)).toHaveText(
    'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad',
  )
})

test('regex matches, invalid syntax and expensive patterns', async ({ page }) => {
  await page.goto('/tools/regex')
  await page.getByRole('button', { name: 'Load sample' }).click()
  await expect(page.locator('.matches-table tbody tr')).toHaveCount(2)
  await expect(page.locator('.match-preview mark')).toHaveCount(2)
  await page.getByLabel('Regular expression', { exact: true }).fill('(')
  await expect(page.getByRole('alert')).toBeVisible()
  await page.getByLabel('Test text').fill('a'.repeat(500) + '!')
  await page.getByLabel('Regular expression', { exact: true }).fill('(a+)+$')
  await expect(page.getByRole('alert')).toContainText('took too long', { timeout: 6000 })
  await page.getByRole('button', { name: 'Load sample' }).click()
  await expect(page.locator('.match-preview mark')).toHaveCount(2)
})

test('colors, exact lorem quantities and both diff modes', async ({ page }) => {
  await page.goto('/tools/color')
  await page.getByRole('textbox', { name: 'HEX', exact: true }).fill('#ff0000')
  await expect(page.getByRole('textbox', { name: 'RGB', exact: true })).toHaveValue(
    'rgb(255, 0, 0)',
  )
  await page.getByRole('textbox', { name: 'HSL', exact: true }).fill('hsl(120, 100%, 50%)')
  await expect(page.getByRole('textbox', { name: 'HEX', exact: true })).toHaveValue('#00FF00')
  await page.getByRole('textbox', { name: 'RGB', exact: true }).fill('rgb(999, 0, 0)')
  await expect(page.getByRole('alert')).toBeVisible()
  await page.goto('/tools/lorem')
  await page.getByLabel('Generate by').selectOption('words')
  await page.getByLabel('Quantity', { exact: true }).fill('23')
  await page.getByRole('button', { name: 'Generate text' }).click()
  expect((await page.getByLabel('Generated text').inputValue()).split(/\s+/)).toHaveLength(23)
  await page.goto('/tools/diff')
  await page.getByRole('button', { name: 'Load sample' }).click()
  await expect(page.locator('.diff-line.added')).toHaveCount(2)
  await expect(page.locator('.diff-line.removed')).toHaveCount(1)
  await page.getByLabel('Diff view').selectOption('unified')
  await expect(page.locator('.diff-line.added')).toHaveCount(2)
})

test('search, filters, reset confirmation, corruption recovery and 404', async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem('devtoolbox.preferences.v1', '{broken'))
  await page.goto('/tools')
  await expect(page.locator('.tool-card')).toHaveCount(35)
  await page.getByRole('button', { name: 'Converters', exact: true }).click()
  await expect(page.locator('.tool-card')).toHaveCount(6)
  await page.getByRole('button', { name: 'All tools', exact: true }).click()
  await page.getByLabel('Search all tools').fill('token')
  await expect(page.locator('.tool-card')).toHaveCount(1)
  await page.goto('/settings')
  await page.getByRole('button', { name: 'Reset all preferences' }).click()
  await expect(page.getByRole('dialog')).toBeVisible()
  await page.getByRole('button', { name: 'Cancel', exact: true }).click()
  await expect(page.getByRole('dialog')).not.toBeVisible()
  await page.getByRole('button', { name: 'Reset all preferences' }).click()
  await page.getByRole('button', { name: 'Confirm reset' }).click()
  await expect(page.getByRole('dialog')).not.toBeVisible()
  await page.goto('/missing-page')
  await expect(page.getByRole('heading', { name: 'This page isn’t in the toolbox.' })).toBeVisible()
})

test('all routes stay local and have no browser errors', async ({ page, baseURL }) => {
  const errors: string[] = []
  const external: string[] = []
  page.on('pageerror', (error) => errors.push(error.message))
  page.on('console', (message) => {
    if (message.type() === 'error') errors.push(message.text())
  })
  page.on('request', (request) => {
    if (
      !request.url().startsWith(`${baseURL}/`) &&
      !request.url().startsWith('blob:') &&
      !request.url().startsWith('data:')
    )
      external.push(request.url())
  })
  for (const route of [
    '/',
    '/tools',
    '/tools/json',
    '/tools/base64',
    '/tools/uuid',
    '/tools/jwt',
    '/tools/url',
    '/tools/timestamp',
    '/tools/hash',
    '/tools/regex',
    '/tools/password',
    '/tools/color',
    '/tools/lorem',
    '/tools/diff',
    '/favorites',
    '/recent',
    '/settings',
  ]) {
    await page.goto(route)
    await expect(page.locator('main h1')).toBeVisible()
    await expect(page.getByText('Opening your tool…')).not.toBeVisible()
  }
  expect(errors).toEqual([])
  expect(external).toEqual([])
})

test('responsive pages have no horizontal overflow at all requested sizes', async ({ page }) => {
  test.setTimeout(60_000)
  for (const width of [320, 375, 768, 1024, 1440, 1920]) {
    await page.setViewportSize({ width, height: 1000 })
    for (const route of [
      '/',
      '/tools',
      '/tools/json',
      '/tools/uuid',
      '/tools/jwt',
      '/tools/url',
      '/tools/timestamp',
      '/tools/hash',
      '/tools/regex',
      '/tools/password',
      '/tools/color',
      '/tools/lorem',
      '/tools/diff',
      '/settings',
    ]) {
      await page.goto(route)
      await expect(page.locator('main h1')).toBeVisible()
      await expect(page.getByText('Opening your tool…')).not.toBeVisible()
      expect(
        await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth),
        `${route} overflows at ${width}px`,
      ).toBe(true)
    }
  }
  await page.setViewportSize({ width: 375, height: 812 })
  await page.goto('/')
  await page.getByRole('button', { name: 'Open navigation' }).click()
  await page
    .getByRole('dialog', { name: 'Navigation', exact: true })
    .getByRole('link', { name: 'Settings' })
    .click()
  await expect(page).toHaveURL('/settings')
  await expect(page.getByRole('dialog')).not.toBeVisible()
})
