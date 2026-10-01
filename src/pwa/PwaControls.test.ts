import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { beforeEach, expect, it, vi } from 'vitest'
import { releases, type Release } from '../data/releases'
import { PwaUpdateNotice } from './PwaControls'

const state = vi.hoisted(() => ({
  update: true,
  release: undefined as Release | undefined,
  error: '',
  busy: false,
}))
vi.mock('./pwaStore', () => ({ usePwa: () => state, updateApp: vi.fn(), installApp: vi.fn() }))
vi.mock('../lib/fileActivity', () => ({ useFileActivity: () => state.busy }))

beforeEach(() => {
  Object.assign(state, { update: true, release: releases[0], busy: false, error: '' })
})

it('renders the incoming version, named heading and compact sections with full changes access', () => {
  const html = renderToStaticMarkup(createElement(PwaUpdateNotice))
  expect(html).toContain('DevToolbox v4.1.0 is ready')
  expect(html).toContain('aria-labelledby="pwa-update-heading"')
  expect(html).toContain('View all changes')
  expect(html).toContain('Update now')
  expect(html).toContain('Later')
})
it('omits View all changes when all sections fit and omits empty sections', () => {
  state.release = { ...releases[0], improvements: [], fixes: [] }
  const html = renderToStaticMarkup(createElement(PwaUpdateNotice))
  expect(html).not.toContain('View all changes')
  expect(html).not.toContain('>Improvements<')
  expect(html).not.toContain('>Fixes<')
})
it('keeps a safe update fallback without claiming the current release is incoming', () => {
  state.release = undefined
  const html = renderToStaticMarkup(createElement(PwaUpdateNotice))
  expect(html).toContain('Update now')
  expect(html).not.toContain('v4.1.0')
  expect(html).toContain('Release details are unavailable')
})
it('does not render without a pending update', () => {
  state.update = false
  expect(renderToStaticMarkup(createElement(PwaUpdateNotice))).toBe('')
})
it('prevents reloading while file processing is active', () => {
  state.busy = true
  const html = renderToStaticMarkup(createElement(PwaUpdateNotice))
  expect(html).toMatch(/<button[^>]*disabled=""[^>]*>Update now<\/button>/)
  expect(html).toContain('Finish or cancel processing')
})
