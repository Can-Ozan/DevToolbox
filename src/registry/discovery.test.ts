import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { parsePreferences, parseToolUsage, preferences } from '../storage/preferences'
import { dashboardDiscovery, featuredIds, nextTools, relatedTools, sortTools } from './discovery'
import { tools } from './tools'

beforeEach(() => {
  vi.stubGlobal('localStorage', { setItem: vi.fn() })
  preferences.reset()
})
afterEach(() => vi.unstubAllGlobals())
const empty = () => parsePreferences(null)
describe('local usage and discovery', () => {
  it('increments every visit while recent IDs stay unique, and clears usage separately', () => {
    const setItem = vi.fn()
    vi.stubGlobal('localStorage', { setItem })
    preferences.visit('json')
    preferences.visit('json')
    preferences.visit('base64')
    const saved = () => JSON.parse(setItem.mock.calls.at(-1)![1])
    expect(saved()).toMatchObject({ toolUsage: { json: 2, base64: 1 }, recent: ['base64', 'json'] })
    preferences.clearUsage()
    expect(saved()).toMatchObject({ toolUsage: {}, recent: ['base64', 'json'] })
  })
  it('migrates old preferences without losing favorites or theme', () => {
    expect(
      parsePreferences(
        JSON.stringify({ version: 1, theme: 'dark', favorites: ['json'], recent: ['json'] }),
      ),
    ).toMatchObject({
      theme: 'dark',
      favorites: ['json'],
      toolUsage: {},
      workspaceView: 'grid',
      jpegQuality: 80,
    })
  })
  it('rejects malformed usage counts and unsafe keys', () => {
    expect(
      parseToolUsage(
        JSON.parse(
          '{"json":3,"bad":-1,"huge":1e30,"fraction":1.2,"str":"2","__proto__":9,"constructor":1}',
        ),
      ),
    ).toEqual({ json: 3 })
    expect(parseToolUsage([])).toEqual({})
  })
  it('validates optional tool defaults', () => {
    expect(
      parsePreferences(
        JSON.stringify({
          version: 1,
          workspaceView: 'broken',
          jpegQuality: -30,
          jpegBackground: 'url(remote)',
          jsonIndent: '100',
        }),
      ),
    ).toMatchObject({
      workspaceView: 'grid',
      jpegQuality: 80,
      jpegBackground: '#ffffff',
      jsonIndent: '2',
    })
  })
  it('uses a named featured list before three distinct tools have been used', () => {
    expect(dashboardDiscovery(empty()).items.map((tool) => tool.id)).toEqual(featuredIds)
    expect(dashboardDiscovery({ ...empty(), toolUsage: { json: 100 } }).title).toBe(
      'Featured tools',
    )
  })
  it('orders known tools by local counts and ignores removed IDs', () => {
    const prefs = {
      ...empty(),
      toolUsage: { json: 3, 'image-converter': 10, base64: 6, removed: 1000 },
    }
    expect(dashboardDiscovery(prefs).title).toBe('Most used')
    expect(dashboardDiscovery(prefs).items.map((tool) => tool.id)).toEqual([
      'image-converter',
      'base64',
      'json',
    ])
  })
  it('sorts without mutating registry order and puts unvisited tools last', () => {
    const before = tools.map((tool) => tool.id)
    const prefs = { ...empty(), recent: ['qr', 'json'], favorites: ['pdf-merger'] }
    expect(
      sortTools(tools, 'recent', prefs)
        .slice(0, 2)
        .map((tool) => tool.id),
    ).toEqual(['qr', 'json'])
    expect(sortTools(tools, 'favorites', prefs)[0].id).toBe('pdf-merger')
    expect(tools.map((tool) => tool.id)).toEqual(before)
  })
  it('derives output handoffs only for declared formats and excludes the source tool', () => {
    expect(nextTools('pdf-merger', 'application/pdf').map((tool) => tool.id)).toEqual([
      'pdf-splitter',
      'pdf-reorder',
    ])
    expect(nextTools('pdf-merger', 'image/png')).toEqual([])
    expect(nextTools('image-converter', 'image/png').map((tool) => tool.id)).toContain(
      'images-to-pdf',
    )
    expect(nextTools('image-converter', 'image/png').map((tool) => tool.id)).not.toContain(
      'image-converter',
    )
  })
  it('bounds related tools and never links to itself', () => {
    for (const tool of tools) {
      const result = relatedTools(tool)
      expect(result.length).toBeLessThanOrEqual(4)
      expect(result.map((item) => item.id)).not.toContain(tool.id)
    }
  })
})
