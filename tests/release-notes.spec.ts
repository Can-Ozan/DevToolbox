import { test, expect } from '@playwright/test'
import AxeBuilder from '@axe-core/playwright'
import { createServer } from 'node:http'
import { readFile, readdir } from 'node:fs/promises'
import { resolve, sep, extname } from 'node:path'

async function serveReleaseBuild() {
  // Serve a distinct SW revision without touching the build used by other tests.
  let revision = 1
  const root = resolve('dist')
  const releaseFile = (await readdir(root)).find((file) =>
    /^release-notes-[\da-f]+\.js$/.test(file),
  )!
  expect(releaseFile).toBeTruthy()
  const incomingFile = releaseFile.replace('.js', '-incoming.js')
  const server = createServer(async (request, response) => {
    const path = resolve(root, '.' + new URL(request.url!, 'http://localhost').pathname)
    if (!path.startsWith(root + sep) && path !== root) {
      response.writeHead(403)
      response.end()
      return
    }
    let file =
      path === root
        ? resolve(root, 'index.html')
        : path.endsWith(incomingFile)
          ? resolve(root, releaseFile)
          : path
    let data: Buffer
    try {
      data = await readFile(file)
    } catch {
      file = resolve(root, 'index.html')
      data = await readFile(file)
    }
    // The tab still bundles 4.1.0. Simulate a future worker with its own immutable notes
    // asset, so stale tab notes cannot accidentally satisfy the update assertions.
    if (path.endsWith(incomingFile)) data = Buffer.from(data.toString().replace('4.1.0', '99.0.0'))
    if (file.endsWith('sw.js') && revision === 2) {
      data = Buffer.from(data.toString().replaceAll(releaseFile, incomingFile))
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
  return {
    url: `http://127.0.0.1:${address.port}`,
    stageUpdate: () => {
      revision = 2
    },
    isListening: () => server.listening,
    close: async () => {
      if (server.listening) await new Promise<void>((resolve) => server.close(() => resolve()))
    },
  }
}

test('service worker updates require consent and preserve unsaved work across tabs', async ({
  browser,
}) => {
  test.setTimeout(120_000)
  const server = await serveReleaseBuild()
  const { url } = server
  const context = await browser.newContext()
  try {
    const first = await context.newPage()
    await first.goto(url + '/tools/json')
    await first.evaluate(async () => {
      await navigator.serviceWorker.ready
    })
    await expect.poll(() => first.evaluate(() => !!navigator.serviceWorker.controller)).toBe(true)
    expect(
      await first.evaluate(
        () =>
          new Promise((resolve) => {
            const channel = new MessageChannel()
            channel.port1.onmessage = (event) => {
              channel.port1.close()
              resolve(event.data.version)
            }
            navigator.serviceWorker.controller!.postMessage({ type: 'DEVTOOLBOX_RELEASE_NOTES' }, [
              channel.port2,
            ])
          }),
      ),
    ).toBe('4.1.0')
    const second = await context.newPage()
    await second.goto(url + '/tools/json')
    await second.getByLabel('JSON input', { exact: true }).fill('{"unsaved":"keep me"}')
    const postponed = await context.newPage()
    await postponed.goto(url + '/settings')
    server.stageUpdate()
    await first.evaluate(async () => {
      await (await navigator.serviceWorker.ready).update()
    })
    const notice = first.getByRole('region', { name: 'DevToolbox v99.0.0 is ready', exact: true })
    await expect(notice).toBeVisible()
    await expect(second.getByRole('button', { name: 'Update now', exact: true })).toBeVisible()
    await expect(notice.locator('li')).toHaveCount(9)
    await expect(notice.getByText('Sitemap and robots support', { exact: true })).toHaveCount(0)
    // Reading the incoming notes must work without another request, even offline.
    await context.setOffline(true)
    for (const theme of ['light', 'dark'] as const) {
      await first.emulateMedia({ colorScheme: theme })
      await expect(first.locator('html')).toHaveAttribute('data-theme', theme)
      for (const width of [320, 375, 768, 1440]) {
        await first.setViewportSize({ width, height: 800 })
        expect(await first.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
          true,
        )
        const noticeBounds = (await notice.boundingBox())!
        const mainBounds = (await first.locator('.main-shell').boundingBox())!
        expect(noticeBounds.x).toBeGreaterThanOrEqual(mainBounds.x)
        expect(noticeBounds.x + noticeBounds.width).toBeLessThanOrEqual(width)
        const sidebar = first.locator('.sidebar')
        if (await sidebar.isVisible()) {
          const sidebarBounds = (await sidebar.boundingBox())!
          expect(noticeBounds.x).toBeGreaterThanOrEqual(sidebarBounds.x + sidebarBounds.width)
        }
        for (const button of await notice.getByRole('button').all()) {
          const bounds = (await button.boundingBox())!
          expect(bounds.x).toBeGreaterThanOrEqual(noticeBounds.x)
          expect(bounds.x + bounds.width).toBeLessThanOrEqual(noticeBounds.x + noticeBounds.width)
        }
        expect((await new AxeBuilder({ page: first }).analyze()).violations).toEqual([])
        const full = notice.getByRole('button', { name: 'View all changes' })
        await full.focus()
        await first.keyboard.press('Enter')
        const dialog = first.getByRole('dialog', { name: 'Release notes', exact: true })
        await expect(dialog).toContainText('DevToolbox v99.0.0')
        await expect(dialog).toContainText('Workspace Intelligence')
        await expect(dialog.locator('time')).toHaveAttribute('datetime', '2026-09-30')
        await expect(dialog.locator('li')).toHaveCount(10)
        await expect(dialog.getByText('Sitemap and robots support', { exact: true })).toBeVisible()
        expect(await dialog.evaluate((element) => element.scrollWidth <= element.clientWidth)).toBe(
          true,
        )
        await first.keyboard.press('Escape')
        await expect(full).toBeFocused()
        expect(await first.evaluate(() => document.body.style.overflow)).not.toBe('hidden')
      }
    }
    const allChanges = notice.getByRole('button', { name: 'View all changes' })
    await allChanges.click()
    await first
      .getByRole('dialog', { name: 'Release notes', exact: true })
      .getByRole('button', { name: 'Close dialog' })
      .click()
    await expect(allChanges).toBeFocused()
    await context.setOffline(false)
    await postponed.getByRole('button', { name: 'Later', exact: true }).click()
    await expect(postponed.getByRole('button', { name: 'Update now', exact: true })).toHaveCount(0)
    expect(
      await postponed.evaluate(async () => !!(await navigator.serviceWorker.ready).waiting),
    ).toBe(true)
    await postponed.close()
    await first.getByRole('button', { name: 'Update now', exact: true }).click()
    await expect(first.getByRole('dialog', { name: 'Reload to update?' })).toContainText('unsaved')
    await first.getByRole('button', { name: 'Cancel', exact: true }).click()
    await expect(first.getByRole('button', { name: 'Update now', exact: true })).toBeFocused()
    await expect(second.getByLabel('JSON input', { exact: true })).toHaveValue(
      '{"unsaved":"keep me"}',
    )
    await first.getByRole('button', { name: 'Update now', exact: true }).click()
    await Promise.all([
      first.waitForEvent('load'),
      first.getByRole('button', { name: 'Reload and update' }).click(),
    ])
    await expect(first.getByLabel('JSON input', { exact: true })).toBeVisible()
    await expect(second.getByLabel('JSON input', { exact: true })).toHaveValue(
      '{"unsaved":"keep me"}',
    )
    await expect(second.getByRole('heading', { name: 'DevToolbox v99.0.0 is ready' })).toBeVisible()
    await second.getByRole('button', { name: 'Update now', exact: true }).click()
    await Promise.all([
      second.waitForEvent('load'),
      second.getByRole('button', { name: 'Reload and update' }).click(),
    ])
    await expect(second.getByLabel('JSON input', { exact: true })).toHaveValue('')
  } finally {
    await context.close()
    await server.close()
  }
})

for (const theme of ['light', 'dark'] as const) {
  test(`Settings release notes are offline, responsive and keyboard accessible in ${theme}`, async ({
    page,
    context,
    browserName,
  }) => {
    const server = await serveReleaseBuild()
    try {
      const external: string[] = []
      const errors: string[] = []
      page.on('request', (request) => {
        if (/^https?:/.test(request.url()) && !request.url().startsWith(server.url + '/'))
          external.push(request.url())
      })
      page.on('pageerror', (error) => errors.push(error.message))
      await page.emulateMedia({ colorScheme: theme })
      await page.goto(server.url + '/settings')
      await expect(page.locator('html')).toHaveAttribute('data-theme', theme)
      await expect(page.getByRole('heading', { name: 'What’s new' })).toBeVisible()
      await expect(page.getByRole('button', { name: 'Update now' })).toHaveCount(0)
      await page.evaluate(async () => {
        await navigator.serviceWorker.ready
      })
      await expect
        .poll(() => page.evaluate(() => navigator.serviceWorker.controller?.state))
        .toBe('activated')
      // WebKit 1.63 offline emulation rejects even literal worker responses (#42775).
      // Stop the real origin for every browser instead: reload must succeed from the
      // installed worker with no server available, never a mocked/canned response.
      // https://github.com/microsoft/playwright/issues/42775
      await server.close()
      expect(server.isListening()).toBe(false)
      if (browserName !== 'webkit') await context.setOffline(true)
      const response = await page.reload()
      expect(response?.status()).toBe(200)
      expect(response?.fromServiceWorker()).toBe(true)
      await context.setOffline(true)
      for (const width of [320, 375, 768, 1440]) {
        await page.setViewportSize({ width, height: 800 })
        const opener = page.getByRole('button', { name: 'View release notes' })
        await opener.focus()
        await page.keyboard.press('Enter')
        const dialog = page.getByRole('dialog', { name: 'Release notes', exact: true })
        await expect(dialog).toBeVisible()
        await expect(dialog).toContainText('DevToolbox v4.1.0 — Workspace Intelligence')
        await expect(dialog.locator('li')).toHaveCount(10)
        const close = dialog.getByRole('button', { name: 'Close dialog' })
        await expect(close).toBeFocused()
        await page.keyboard.press('Tab')
        await expect(close).toBeFocused()
        await page.keyboard.press('Shift+Tab')
        await expect(close).toBeFocused()
        expect(await dialog.evaluate((element) => element.scrollWidth <= element.clientWidth)).toBe(
          true,
        )
        expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
          true,
        )
        expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([])
        await page.keyboard.press('Escape')
        await expect(dialog).not.toBeVisible()
        await expect(opener).toBeFocused()
        expect(await page.evaluate(() => document.body.style.overflow)).not.toBe('hidden')
      }
      await page.getByRole('button', { name: 'View release notes' }).click()
      await page
        .getByRole('dialog', { name: 'Release notes' })
        .getByRole('button', { name: 'Close dialog' })
        .click()
      await expect(page.getByRole('button', { name: 'View release notes' })).toBeFocused()
      expect(external).toEqual([])
      expect(errors).toEqual([])
    } finally {
      await server.close()
    }
  })
}
