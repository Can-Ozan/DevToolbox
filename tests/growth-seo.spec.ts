import { test, expect, type Page } from '@playwright/test'
import { readFile } from 'node:fs/promises'
import { categories, tools } from '../src/registry/tools'

async function expectMetadata(page: Page, path: string, title: string, description: string) {
  await expect(page).toHaveTitle(title)
  const canonical = new URL(path.replace(/^\//, ''), `${test.info().project.use.baseURL}/`).href
  const values = [
    ['meta[name="description"]', description],
    ['meta[property="og:title"]', title],
    ['meta[property="og:description"]', description],
    ['meta[property="og:url"]', canonical],
    ['meta[name="twitter:title"]', title],
    ['meta[name="twitter:description"]', description],
  ]
  for (const [selector, value] of values) {
    await expect(page.locator(selector)).toHaveCount(1)
    await expect(page.locator(selector)).toHaveAttribute('content', value)
  }
  await expect(page.locator('link[rel="canonical"]')).toHaveCount(1)
  await expect(page.locator('link[rel="canonical"]')).toHaveAttribute('href', canonical)
}

test('route metadata identifies trailing-slash aliases and stays current after navigation', async ({
  page,
}) => {
  const routes = [
    ['/', 'Dashboard'],
    ['/tools', 'All Tools'],
    ['/workspace', 'Workspace'],
    ['/category/developer', 'Developer'],
  ]
  for (const [path, name] of routes) {
    await page.goto(path === '/' ? path : `${path}/`)
    await expectMetadata(
      page,
      path,
      `${name} | DevToolbox`,
      path === '/'
        ? '37 local-first developer tools in one private browser workspace. No backend, no uploads.'
        : `${name} in DevToolbox — a private, local-first developer workspace.`,
    )
  }
  for (const id of ['json', 'base64', 'package-json']) {
    const tool = tools.find((item) => item.id === id)!
    await page.goto(`${tool.path}/?input=private#result`)
    await expect(page.locator('main h1')).toHaveText(tool.name)
    await expectMetadata(
      page,
      tool.path,
      `${tool.name} — Free Local Developer Tool | DevToolbox`,
      `${tool.description} Processed locally in your browser with no upload required.`,
    )
  }
  await page.getByRole('link', { name: 'Go to Workspace', exact: true }).click()
  await expectMetadata(
    page,
    '/workspace',
    'Workspace | DevToolbox',
    'Workspace in DevToolbox — a private, local-first developer workspace.',
  )
  await page.goBack()
  await expect(page).toHaveTitle('Package.json Analyzer — Free Local Developer Tool | DevToolbox')
  await page.goForward()
  await expect(page).toHaveTitle('Workspace | DevToolbox')
})

test('sitemap matches public registry routes and robots points to the Pages sitemap', async ({
  page,
  request,
}) => {
  const response = await request.get('/sitemap.xml')
  expect(response.ok()).toBe(true)
  const result = await page.evaluate(
    (xml) => {
      const doc = new DOMParser().parseFromString(xml, 'application/xml')
      return {
        error: doc.querySelector('parsererror')?.textContent ?? null,
        namespace: doc.documentElement.namespaceURI,
        urls: [...doc.querySelectorAll('loc')].map((node) => node.textContent),
      }
    },
    await response.text(),
  )
  expect(result.error).toBeNull()
  expect(result.namespace).toBe('http://www.sitemaps.org/schemas/sitemap/0.9')
  const expected = [
    '/',
    '/tools',
    '/workspace',
    ...categories
      .filter((category) => tools.some((tool) => tool.category === category))
      .map((category) => `/category/${category.toLowerCase()}`),
    ...tools.map((tool) => tool.path),
  ].map((path) => `https://can-ozan.github.io/DevToolbox${path}`)
  expect(result.urls.sort()).toEqual(expected.sort())
  expect(new Set(result.urls).size).toBe(result.urls.length)
  const robots = await request.get('/robots.txt')
  expect(robots.ok()).toBe(true)
  expect(await robots.text()).toContain(
    'Sitemap: https://can-ozan.github.io/DevToolbox/sitemap.xml',
  )

  // Inspect the initial HTML independently of the client-side metadata effect.
  const initial = await page.evaluate(
    (html) => {
      const doc = new DOMParser().parseFromString(html, 'text/html')
      return Object.fromEntries(
        [
          'link[rel="canonical"]',
          'meta[name="description"]',
          'meta[property="og:description"]',
          'meta[name="twitter:description"]',
        ].map((selector) => [
          selector,
          [...doc.querySelectorAll(selector)].map(
            (element) => element.getAttribute('content') ?? element.getAttribute('href'),
          ),
        ]),
      )
    },
    await readFile('index.html', 'utf8'),
  )
  expect(initial['link[rel="canonical"]']).toEqual(['https://can-ozan.github.io/DevToolbox/'])
  for (const selector of [
    'meta[name="description"]',
    'meta[property="og:description"]',
    'meta[name="twitter:description"]',
  ]) {
    expect(initial[selector]).toEqual([expect.stringContaining('37')])
  }
})

test('Settings support links have accessible names and safe external targets', async ({ page }) => {
  await page.goto('/settings')
  for (const [name, path] of [
    ['View on GitHub', ''],
    ['Report a bug', '/issues/new'],
    ['Request a tool', '/issues/new'],
    ['Star DevToolbox', ''],
  ]) {
    const link = page.getByRole('link', { name, exact: true })
    await expect(link).toHaveAttribute('href', `https://github.com/Can-Ozan/DevToolbox${path}`)
    await expect(link).toHaveAttribute('target', '_blank')
    await expect(link).toHaveAttribute('rel', /\bnoreferrer\b/)
    await link.focus()
    await expect(link).toBeFocused()
  }
})
