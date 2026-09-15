import { chromium } from '@playwright/test'
import { mkdir } from 'node:fs/promises'
await mkdir('artifacts', { recursive: true })
const browser = await chromium.launch()
const page = await browser.newPage({
  viewport: { width: 1440, height: 1100 },
  colorScheme: 'light',
  reducedMotion: 'reduce',
})
await page.goto('http://127.0.0.1:5173')
await page.screenshot({ path: 'artifacts/dashboard-light.png', fullPage: true })
await page.getByRole('button', { name: 'Toggle light and dark theme' }).click()
await page.screenshot({ path: 'artifacts/dashboard-dark.png', fullPage: true })
await page.goto('http://127.0.0.1:5173/tools/json')
await page.getByRole('button', { name: 'Load sample' }).click()
await page.getByRole('button', { name: 'Format JSON' }).click()
await page.screenshot({ path: 'artifacts/json-dark.png', fullPage: true })
await page.setViewportSize({ width: 375, height: 812 })
await page.goto('http://127.0.0.1:5173')
await page.getByRole('button', { name: 'Toggle light and dark theme' }).click()
await page.screenshot({ path: 'artifacts/dashboard-mobile.png', fullPage: true })
await browser.close()
