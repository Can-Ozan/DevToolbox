import { test, expect } from '@playwright/test'
import AxeBuilder from '@axe-core/playwright'

const widths = [320, 375, 480, 768, 1024, 1280, 1440, 1920]
const pageRoutes = [
  '/',
  '/tools',
  '/workspace',
  '/favorites',
  '/recent',
  '/settings',
  '/category/developer',
]

for (const theme of ['dark', 'light'] as const) {
  test(`v4 surfaces, editor columns and mobile controls fit in ${theme}`, async ({ page }) => {
    // All 37 tools and seven global/category surfaces at eight viewport widths.
    test.setTimeout(240_000)
    await page.emulateMedia({ colorScheme: theme, reducedMotion: 'reduce' })
    const errors: string[] = []
    page.on('pageerror', (error) => errors.push(error.message))
    await page.goto('/tools')
    await expect(page.locator('.tool-card-link')).toHaveCount(37)
    const toolRoutes = await page
      .locator('.tool-card-link')
      .evaluateAll((links) => links.map((link) => link.getAttribute('href')!))
    const routes = [...pageRoutes, ...toolRoutes]
    for (const width of widths) {
      await page.setViewportSize({ width, height: 900 })
      for (const route of routes) {
        await test.step(`${width}px ${route}`, async () => {
          await page.goto(route)
          await expect(page.locator('main h1')).toBeVisible()
          await expect(page.getByText('Opening your tool…')).not.toBeVisible()
          await expect(page.locator('html')).toHaveAttribute('data-theme', theme)
          const layout = await page.evaluate(() => {
            const controls = Array.from(
              document.querySelectorAll<HTMLElement>('main button, .topbar button'),
            ).filter((element) => element.getClientRects().length > 0)
            return {
              overflow: document.documentElement.scrollWidth > innerWidth,
              clippedControls: controls
                .filter((element) => {
                  const box = element.getBoundingClientRect()
                  return box.left < -1 || box.right > innerWidth + 1
                })
                .map((element) => element.textContent || element.getAttribute('aria-label')),
              smallTargets:
                innerWidth <= 768
                  ? controls
                      .filter((element) => {
                        const box = element.getBoundingClientRect()
                        return box.height < 43.5 || box.width < 43.5
                      })
                      .map((element) => element.textContent || element.getAttribute('aria-label'))
                  : [],
              columns: Array.from(document.querySelectorAll('.editor-grid')).map((grid) => {
                const [first, second] = Array.from(grid.children).map((child) =>
                  child.getBoundingClientRect(),
                )
                return (
                  !second ||
                  (innerWidth <= 768
                    ? second.top >= first.bottom - 1
                    : second.left >= first.right - 1)
                )
              }),
            }
          })
          expect(layout).toEqual({
            overflow: false,
            clippedControls: [],
            smallTargets: [],
            columns: layout.columns.map(() => true),
          })
        })
      }
    }
    expect(errors).toEqual([])
  })
}

test('v4 compact sidebar, mobile search and tool controls stay keyboard accessible', async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.setViewportSize({ width: 1440, height: 1000 })
  await page.goto('/')
  await page.getByRole('button', { name: 'Collapse sidebar', exact: true }).click()
  await expect(page.getByRole('button', { name: 'Expand sidebar', exact: true })).toBeVisible()
  const collapsed = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21aa'])
    .analyze()
  expect(collapsed.violations).toEqual([])
  await page.getByRole('button', { name: 'Expand sidebar', exact: true }).click()
  await page.setViewportSize({ width: 320, height: 568 })
  const search = page.getByRole('button', { name: 'Open search', exact: true })
  await search.focus()
  await page.keyboard.press('Enter')
  const input = page.getByRole('combobox', { name: 'Search tools, files and actions' })
  await expect(input).toBeFocused()
  await input.fill('prettier')
  await page.keyboard.press('Enter')
  await expect(page).toHaveURL('/tools/code-formatter')
  await expect(page.locator('body')).not.toHaveCSS('overflow', 'hidden')
  await page.getByRole('button', { name: 'CSS', exact: true }).focus()
  await page.keyboard.press('Enter')
  await expect(page.getByRole('button', { name: 'CSS', exact: true })).toHaveAttribute(
    'aria-pressed',
    'true',
  )
  await page.getByLabel('Code input').fill('a{color:red}')
  await page.getByRole('button', { name: 'Format code', exact: true }).press('Enter')
  await expect(page.getByLabel('Formatted code')).toHaveValue(/color: red;/)
  const formatted = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21aa'])
    .analyze()
  expect(formatted.violations).toEqual([])
  await expect(page.locator('.button').first()).toHaveCSS('transition-duration', '0s')
})
