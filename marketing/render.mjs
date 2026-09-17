/* Run from the repository root: node marketing/render.mjs */
/* global document */
import { readFile } from 'node:fs/promises'
import { fileURLToPath, URL } from 'node:url'
import { chromium } from '@playwright/test'

const directory = new URL('./', import.meta.url)
const html = await readFile(new URL('linkedin.html', directory), 'utf8')

const browser = await chromium.launch({ args: ['--disable-lcd-text'] })
try {
  for (const [width, height, name] of [
    [1200, 627, 'devtoolbox-linkedin-1200x627.png'],
    [1080, 1080, 'devtoolbox-linkedin-1080x1080.png'],
  ]) {
    const page = await browser.newPage({ viewport: { width, height }, deviceScaleFactor: 1 })
    const errors = []
    page.on('pageerror', (error) => errors.push(error.message))
    await page.setContent(html)
    await page.evaluate(() => document.fonts.ready)
    const overflow = await page.evaluate(() => ({
      width: document.documentElement.scrollWidth,
      height: document.documentElement.scrollHeight,
    }))
    if (overflow.width !== width || overflow.height !== height || errors.length) {
      throw new Error(`Render failed: ${JSON.stringify({ width, height, overflow, errors })}`)
    }
    await page.screenshot({ path: fileURLToPath(new URL(name, directory)) })
    await page.close()
  }
} finally {
  await browser.close()
}
