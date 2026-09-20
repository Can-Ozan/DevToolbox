import { test, expect } from '@playwright/test'
import { createServer } from 'node:http'
import { readFile } from 'node:fs/promises'
import { resolve, sep, extname } from 'node:path'

test('manifest, icons, offline reload and Workspace remain local', async ({
  page,
  context,
  baseURL,
}) => {
  await page.goto('/settings')
  const manifestUrl = await page.locator('link[rel="manifest"]').getAttribute('href')
  expect(manifestUrl).toBe('/manifest.webmanifest')
  const manifest = await (await page.request.get(manifestUrl!)).json()
  expect(manifest).toMatchObject({
    name: 'DevToolbox',
    start_url: '/',
    scope: '/',
    display: 'standalone',
  })
  for (const icon of manifest.icons) expect((await page.request.get(icon.src)).ok()).toBe(true)
  await page.evaluate(async () => {
    await navigator.serviceWorker.ready
  })
  await expect.poll(() => page.evaluate(() => !!navigator.serviceWorker.controller)).toBe(true)
  await expect(page.getByText('App shell ready for offline use.')).toBeVisible()
  const keysBefore = await page.evaluate(async () =>
    (
      await Promise.all(
        (await caches.keys()).map(async (key) =>
          (await (await caches.open(key)).keys()).map((r) => r.url),
        ),
      )
    ).flat(),
  )
  expect(keysBefore.some((url) => /pdfRenderer-|pdf\.worker\.min-|pdf-assets\//.test(url))).toBe(
    false,
  )
  await page.goto('/workspace')
  await page.locator('input[type=file]').setInputFiles({
    name: 'private-workspace-note.txt',
    mimeType: 'text/plain',
    buffer: Buffer.from('UNIQUE_PRIVATE_WORKSPACE_VALUE'),
  })
  await expect(page.locator('.workspace-file')).toHaveCount(1)
  await context.setOffline(true)
  await page.reload()
  await expect(page.locator('.workspace-file')).toContainText('private-workspace-note.txt')
  await page.goto('/tools/json-csv')
  await page
    .getByLabel('JSON input', { exact: true })
    .fill('[{"private":"UNIQUE_PRIVATE_TOOL_VALUE"}]')
  await page.getByRole('button', { name: 'Convert JSON to CSV' }).click()
  await expect(page.getByLabel('CSV output')).toContainText('UNIQUE_PRIVATE_TOOL_VALUE')
  const cache = await page.evaluate(async () => {
    const entries: { url: string; text: string }[] = []
    for (const name of await caches.keys()) {
      const cache = await caches.open(name)
      for (const request of await cache.keys()) {
        const response = await cache.match(request)
        entries.push({
          url: request.url,
          text:
            response?.headers.get('content-type')?.includes('text') ||
            response?.headers.get('content-type')?.includes('javascript')
              ? await response.text()
              : '',
        })
      }
    }
    return entries
  })
  expect(cache.every((entry) => entry.url.startsWith(baseURL! + '/'))).toBe(true)
  expect(JSON.stringify(cache)).not.toMatch(/UNIQUE_PRIVATE_|private-workspace-note/)
  await context.setOffline(false)
})

test('install action is hidden when unsupported and responds to the native prompt lifecycle', async ({
  browser,
  baseURL,
}) => {
  const unsupported = await browser.newContext()
  await unsupported.addInitScript(() =>
    Object.defineProperty(window, 'isSecureContext', { value: false }),
  )
  const page = await unsupported.newPage()
  await page.goto(baseURL + '/settings')
  await expect(page.getByRole('button', { name: 'Install DevToolbox' })).toHaveCount(0)
  await expect(page.getByRole('heading', { name: 'Settings' })).toBeVisible()
  await unsupported.close()
  const context = await browser.newContext()
  const supported = await context.newPage()
  await supported.goto(baseURL + '/settings')
  await supported.evaluate(() => {
    const event = new Event('beforeinstallprompt', { cancelable: true })
    Object.assign(window, { prompted: false })
    Object.assign(event, {
      prompt: async () => {
        Object.assign(window, { prompted: true })
      },
      userChoice: Promise.resolve({ outcome: 'accepted' }),
    })
    window.dispatchEvent(event)
  })
  await supported.getByRole('button', { name: 'Install DevToolbox' }).click()
  expect(await supported.evaluate(() => Reflect.get(window, 'prompted'))).toBe(true)
  await supported.evaluate(() => window.dispatchEvent(new Event('appinstalled')))
  await expect(supported.getByRole('button', { name: 'Install DevToolbox' })).toHaveCount(0)
  await context.close()
})

test('service worker updates require consent and preserve unsaved work across tabs', async ({
  browser,
}) => {
  test.setTimeout(60_000)
  // Serve a distinct SW revision without touching the build used by other tests.
  let revision = 1
  const root = resolve('dist')
  const server = createServer(async (request, response) => {
    const path = resolve(root, '.' + new URL(request.url!, 'http://localhost').pathname)
    if (!path.startsWith(root + sep) && path !== root) {
      response.writeHead(403)
      response.end()
      return
    }
    let file = path === root ? resolve(root, 'index.html') : path
    let data: Buffer
    try {
      data = await readFile(file)
    } catch {
      file = resolve(root, 'index.html')
      data = await readFile(file)
    }
    const mime: Record<string, string> = {
      '.js': 'text/javascript',
      '.html': 'text/html',
      '.css': 'text/css',
      '.svg': 'image/svg+xml',
      '.png': 'image/png',
      '.webmanifest': 'application/manifest+json',
    }
    response.writeHead(200, {
      'Content-Type': mime[extname(file)] ?? 'application/octet-stream',
      'Cache-Control': 'no-store',
    })
    response.end(
      file.endsWith('sw.js')
        ? Buffer.concat([data, Buffer.from(`\n// Test revision ${revision}\n`)])
        : data,
    )
  })
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve))
  const address = server.address()
  if (!address || typeof address === 'string') throw new Error('Test server failed')
  const url = `http://127.0.0.1:${address.port}`
  const context = await browser.newContext()
  try {
    const first = await context.newPage()
    await first.goto(url + '/tools/json')
    await first.evaluate(async () => {
      await navigator.serviceWorker.ready
    })
    await expect.poll(() => first.evaluate(() => !!navigator.serviceWorker.controller)).toBe(true)
    const second = await context.newPage()
    await second.goto(url + '/tools/json')
    await second.getByLabel('JSON input', { exact: true }).fill('{"unsaved":"keep me"}')
    revision = 2
    await first.evaluate(async () => {
      await (await navigator.serviceWorker.ready).update()
    })
    await expect(first.getByRole('button', { name: 'Update app', exact: true })).toBeVisible()
    await expect(second.getByRole('button', { name: 'Update app', exact: true })).toBeVisible()
    await first.getByRole('button', { name: 'Update app', exact: true }).click()
    await expect(first.getByRole('dialog', { name: 'Reload to update?' })).toContainText('unsaved')
    await first.getByRole('button', { name: 'Cancel', exact: true }).click()
    await expect(second.getByLabel('JSON input', { exact: true })).toHaveValue(
      '{"unsaved":"keep me"}',
    )
    await first.getByRole('button', { name: 'Update app', exact: true }).click()
    await Promise.all([
      first.waitForEvent('load'),
      first.getByRole('button', { name: 'Reload and update' }).click(),
    ])
    await expect(first.getByLabel('JSON input', { exact: true })).toBeVisible()
    await expect(second.getByLabel('JSON input', { exact: true })).toHaveValue(
      '{"unsaved":"keep me"}',
    )
    await second.getByRole('button', { name: 'Update app', exact: true }).click()
    await Promise.all([
      second.waitForEvent('load'),
      second.getByRole('button', { name: 'Reload and update' }).click(),
    ])
    await expect(second.getByLabel('JSON input', { exact: true })).toHaveValue('')
  } finally {
    await context.close()
    await new Promise<void>((resolve) => server.close(() => resolve()))
  }
})
