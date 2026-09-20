import { FILE_LIMITS } from '../workspace/workspaceUtils'

export function parsePageSelection(value: string, count: number, ranges = true) {
  if (!Number.isInteger(count) || count < 1 || count > FILE_LIMITS.pdfPages)
    throw new Error(`PDFs are limited to ${FILE_LIMITS.pdfPages} pages.`)
  if (!value.trim() || value.length > 5000)
    throw new Error('Enter page numbers, for example 1-3,5 or 1,3,2.')
  const pages: number[] = []
  for (const part of value.split(',')) {
    const match = part.trim().match(ranges ? /^(\d+)(?:\s*-\s*(\d+))?$/ : /^(\d+)$/)
    if (!match)
      throw new Error(
        ranges
          ? 'Use comma-separated pages or ascending ranges, such as 1-3,5.'
          : 'Use comma-separated page numbers, such as 1,3,2. Omit pages to remove them.',
      )
    const first = Number(match[1])
    const last = Number(match[2] ?? first)
    if (first < 1 || last < first || last > count)
      throw new Error(`Page numbers must be between 1 and ${count}; ranges must be ascending.`)
    for (let page = first; page <= last; page++) {
      if (pages.includes(page - 1))
        throw new Error(`Page ${page} appears more than once. Remove duplicate pages.`)
      pages.push(page - 1)
    }
  }
  return pages
}
