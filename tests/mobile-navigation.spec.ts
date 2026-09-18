import { test, expect } from '@playwright/test'

for (const theme of ['light', 'dark'] as const) {
  test(`mobile drawer keeps navigation and privacy reachable in ${theme}`, async ({ page }) => {
    test.setTimeout(90_000)
    const errors: string[] = []
    page.on('pageerror', (error) => errors.push(error.message))
    page.on('console', (message) => {
      if (message.type() === 'error') errors.push(message.text())
    })
    await page.emulateMedia({ colorScheme: theme, reducedMotion: 'reduce' })

    for (const [width, height] of [
      [320, 568],
      [360, 800],
      [375, 667],
      [390, 844],
      [412, 915],
      [568, 320],
      [768, 1024],
    ]) {
      await test.step(`${width} × ${height}`, async () => {
        // At tablet widths the sidebar replaces the opener. Also verify an open
        // mobile drawer remains usable when the viewport grows to tablet size.
        const openingViewport = { width: Math.min(width, 375), height }
        await page.setViewportSize(openingViewport)
        await page.goto('/')
        await expect(page.locator('html')).toHaveAttribute('data-theme', theme)
        const opener = page.getByRole('button', { name: 'Open navigation', exact: true })
        const drawer = page.getByRole('dialog', { name: 'Navigation', exact: true })
        await opener.click()
        await page.setViewportSize({ width, height })
        await expect(drawer).toBeVisible()
        await expect(page.locator('body')).toHaveCSS('overflow', 'hidden')

        const bounds = await drawer.evaluate((element) => {
          const rect = element.getBoundingClientRect()
          const nav = element.querySelector('.sidebar-scroll')!.getBoundingClientRect()
          const privacy = element.querySelector('.local-card')!.getBoundingClientRect()
          return {
            insideViewport:
              rect.top >= 0 &&
              rect.left >= 0 &&
              rect.right <= innerWidth &&
              rect.bottom <= innerHeight,
            noOverlap: nav.bottom <= privacy.top,
            noOverflow:
              element.scrollWidth <= element.clientWidth &&
              document.documentElement.scrollWidth <= innerWidth,
          }
        })
        expect(bounds).toEqual({ insideViewport: true, noOverlap: true, noOverflow: true })
        await expect(drawer.locator('.local-card')).toHaveCSS('display', 'block')
        const mainLinks = drawer
          .getByRole('navigation', { name: 'Workspace', exact: true })
          .getByRole('link')
        expect(
          await mainLinks.evaluateAll((links) => links.map((link) => link.getAttribute('href'))),
        ).toEqual(['/', '/tools', '/workspace', '/favorites', '/recent'])
        expect(
          await drawer
            .getByRole('navigation', { name: 'Tool categories' })
            .getByRole('link')
            .count(),
        ).toBeGreaterThan(0)

        for (const link of await drawer.locator('nav a').all()) {
          await link.scrollIntoViewIfNeeded()
          expect(
            await link.evaluate((element) => {
              const rect = element.getBoundingClientRect()
              const viewport = element.closest('.navigation-content')!.getBoundingClientRect()
              return (
                // Chromium rounds scroll offsets to whole CSS pixels.
                rect.top >= viewport.top - 1 &&
                rect.bottom <= viewport.bottom + 1 &&
                element.contains(
                  document.elementFromPoint(rect.x + rect.width / 2, rect.y + rect.height / 2),
                )
              )
            }),
            (await link.textContent()) ?? 'Navigation link',
          ).toBe(true)
        }
        const privacy = drawer.locator('.local-card')
        await privacy.scrollIntoViewIfNeeded()
        await expect(privacy).toBeInViewport({ ratio: 1 })
        if (height <= 800) {
          expect(
            await drawer.locator('.navigation-content').evaluate((element) => element.scrollTop),
          ).toBeGreaterThan(0)
        }
        await drawer.getByRole('link', { name: 'Settings', exact: true }).click()
        await expect(page).toHaveURL('/settings')
        await expect(drawer).not.toBeVisible()
        await expect(page.locator('body')).not.toHaveCSS('overflow', 'hidden')

        await page.setViewportSize(openingViewport)
        await opener.click()
        await drawer.getByRole('button', { name: 'Close navigation', exact: true }).click()
        await expect(drawer).not.toBeVisible()
        await expect(page.locator('body')).not.toHaveCSS('overflow', 'hidden')
        await expect(opener).toBeFocused()
        await opener.click()
        await page.keyboard.press('Escape')
        await expect(drawer).not.toBeVisible()
        await expect(page.locator('body')).not.toHaveCSS('overflow', 'hidden')
        await expect(opener).toBeFocused()
      })
    }
    expect(errors).toEqual([])
  })
}
