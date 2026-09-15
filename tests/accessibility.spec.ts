import AxeBuilder from '@axe-core/playwright'
import { test, expect } from '@playwright/test'

for (const theme of ['light', 'dark'] as const) {
  test(`accessible pages in ${theme} theme`, async ({ page }) => {
    await page.emulateMedia({ colorScheme: theme, reducedMotion: 'reduce' })
    for (const route of [
      '/',
      '/tools',
      '/tools/json',
      '/tools/password',
      '/tools/color',
      '/settings',
    ]) {
      await page.goto(route)
      await expect(page.locator('main h1')).toBeVisible()
      await expect(page.getByText('Opening your tool…')).not.toBeVisible()
      const results = await new AxeBuilder({ page })
        .withTags(['wcag2a', 'wcag2aa', 'wcag21aa'])
        .analyze()
      expect(
        results.violations.map((v) => ({
          id: v.id,
          description: v.description,
          nodes: v.nodes.map((n) => ({ target: n.target, summary: n.failureSummary })),
        })),
        `${route} in ${theme}`,
      ).toEqual([])
    }
  })
}
test('accessible command palette and mobile navigation with focus containment', async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.goto('/')
  await page.getByRole('button', { name: 'Open search', exact: true }).click()
  await expect(page.getByRole('combobox')).toBeFocused()
  const palette = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21aa'])
    .analyze()
  expect(palette.violations).toEqual([])
  await page.keyboard.press('Escape')
  await expect(page.getByRole('button', { name: 'Open search', exact: true })).toBeFocused()
  await page.setViewportSize({ width: 375, height: 812 })
  await page.getByRole('button', { name: 'Open navigation' }).click()
  const drawer = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21aa'])
    .analyze()
  expect(drawer.violations).toEqual([])
  for (let i = 0; i < 18; i++) {
    await page.keyboard.press('Tab')
    expect(await page.evaluate(() => !!document.activeElement?.closest('dialog'))).toBe(true)
  }
})
