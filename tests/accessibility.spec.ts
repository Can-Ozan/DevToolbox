import AxeBuilder from '@axe-core/playwright'
import { test, expect } from '@playwright/test'

test('stacked dialogs restore scrolling after command and history navigation', async ({ page }) => {
  for (const navigation of ['command', 'history']) {
    await page.goto('/tools/json')
    await page.getByRole('button', { name: 'Format JSON' }).waitFor()
    await page.getByRole('link', { name: 'Settings', exact: true }).click()
    await page.getByRole('button', { name: 'Reset all preferences' }).click()
    await page.keyboard.press('Control+k')
    await expect(page.locator('dialog[open]')).toHaveCount(2)
    if (navigation === 'command') {
      await page.getByRole('combobox', { name: 'Search tools, files and actions' }).fill('json')
      await page.keyboard.press('Enter')
    } else {
      await page.goBack()
      await expect(page).toHaveURL('/tools/json')
      await expect(page.locator('dialog[open]')).toHaveCount(1)
      await expect(page.locator('body')).toHaveCSS('overflow', 'hidden')
      await page.keyboard.press('Escape')
    }
    await expect(page).toHaveURL('/tools/json')
    await expect(page.locator('dialog[open]')).toHaveCount(0)
    await expect(page.locator('body')).not.toHaveCSS('overflow', 'hidden')
  }
})

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
  await expect(
    page.getByRole('combobox', { name: 'Search tools, files and actions' }),
  ).toBeFocused()
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
