import { afterEach, expect, it, vi } from 'vitest'
import { startPwa, supportsPwa } from './pwaStore'

afterEach(() => vi.unstubAllGlobals())
it('keeps the app usable without a browser environment', () => {
  expect(supportsPwa()).toBe(false)
  expect(() => startPwa()).not.toThrow()
})
it('does not attempt registration on insecure or unsupported environments', () => {
  vi.stubGlobal('window', { isSecureContext: false })
  vi.stubGlobal('navigator', { serviceWorker: {} })
  expect(supportsPwa()).toBe(false)
  expect(() => startPwa()).not.toThrow()
  vi.stubGlobal('window', { isSecureContext: true })
  vi.stubGlobal('navigator', {})
  expect(supportsPwa()).toBe(false)
  expect(() => startPwa()).not.toThrow()
})
