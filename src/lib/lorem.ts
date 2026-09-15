const sentences = [
  'Lorem ipsum dolor sit amet, consectetur adipiscing elit.',
  'Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.',
  'Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat.',
  'Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur.',
  'Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum.',
  'Praesent commodo cursus magna, vel scelerisque nisl consectetur et.',
  'Donec ullamcorper nulla non metus auctor fringilla.',
  'Aenean eu leo quam, pellentesque ornare sem lacinia quam venenatis vestibulum.',
]
export type LoremUnit = 'paragraphs' | 'sentences' | 'words'
export function generateLorem(unit: LoremUnit, count: number) {
  const max = unit === 'paragraphs' ? 100 : unit === 'sentences' ? 500 : 10000
  if (!Number.isInteger(count) || count < 1 || count > max)
    throw new Error(`Choose between 1 and ${max.toLocaleString()} ${unit}.`)
  if (unit === 'sentences')
    return Array.from({ length: count }, (_, i) => sentences[i % sentences.length]).join(' ')
  if (unit === 'paragraphs')
    return Array.from({ length: count }, (_, i) =>
      Array.from({ length: 5 }, (_, j) => sentences[(i * 3 + j) % sentences.length]).join(' '),
    ).join('\n\n')
  const words = sentences.join(' ').replace(/[.,]/g, '').toLowerCase().split(/\s+/)
  const result = Array.from({ length: count }, (_, i) => words[i % words.length]).join(' ')
  return result[0].toUpperCase() + result.slice(1) + '.'
}
