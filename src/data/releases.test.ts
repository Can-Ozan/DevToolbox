import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { ReleaseSections } from '../components/ReleaseNotes'
import { getReleaseByVersion, isRelease, releases, releaseSections } from './releases'
import { version } from '../../package.json'

describe('bundled releases', () => {
  it('looks up exact versions and includes the published package version', () => {
    expect(getReleaseByVersion('4.1.0')).toBe(releases[0])
    expect(getReleaseByVersion('unknown')).toBeUndefined()
    expect(getReleaseByVersion('4.1')).toBeUndefined()
    expect(getReleaseByVersion(version)).toBeDefined()
    expect(releases.every(isRelease)).toBe(true)
    expect(new Set(releases.map((release) => release.version)).size).toBe(releases.length)
  })

  it('omits empty sections from both the data and rendered notes', () => {
    const release = { ...releases[0], features: [], improvements: [] }
    expect(releaseSections(release).map((section) => section.title)).toEqual(['Fixes'])
    const html = renderToStaticMarkup(createElement(ReleaseSections, { release }))
    expect(html).toContain('<h3>Fixes</h3>')
    expect(html).not.toContain('<h3>New</h3>')
    expect(html).not.toContain('<h3>Improvements</h3>')
    expect(
      renderToStaticMarkup(
        createElement(ReleaseSections, {
          release: { ...release, fixes: [] },
        }),
      ),
    ).not.toContain('<section>')
  })

  it('limits each preview section to three entries while retaining the full notes', () => {
    const release = {
      ...releases[0],
      features: ['f1', 'f2', 'f3', 'f4'],
      fixes: ['x1', 'x2', 'x3', 'x4'],
    }
    const preview = renderToStaticMarkup(createElement(ReleaseSections, { release, limit: 3 }))
    expect(preview.match(/<li>/g)).toHaveLength(9)
    expect(preview).not.toMatch(/f4|x4|Sitemap and robots support/)
    const full = renderToStaticMarkup(createElement(ReleaseSections, { release }))
    expect(full.match(/<li>/g)).toHaveLength(12)
    expect(full).toContain('Sitemap and robots support')
  })

  it('escapes note content rather than inserting HTML', () => {
    const html = renderToStaticMarkup(
      createElement(ReleaseSections, {
        release: { ...releases[0], features: ['<img src=x onerror=alert(1)>'] },
      }),
    )
    expect(html).not.toContain('<img')
    expect(html).toContain('&lt;img')
  })

  it('rejects malformed worker responses', () => {
    for (const value of [
      null,
      {},
      { ...releases[0], version: '' },
      { ...releases[0], date: 'invalid' },
      { ...releases[0], title: '' },
      { ...releases[0], fixes: [''] },
      { ...releases[0], features: [42] },
    ]) {
      expect(isRelease(value)).toBe(false)
    }
  })
})
