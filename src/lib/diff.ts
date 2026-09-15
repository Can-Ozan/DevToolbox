import { diffLines } from 'diff'
export function compareText(original: string, modified: string) {
  if (
    original.length + modified.length > 200000 ||
    original.split('\n').length + modified.split('\n').length > 4000
  )
    throw new Error(
      'Compare up to 200,000 total characters and 4,000 total lines. Split larger texts into smaller sections.',
    )
  const changes = diffLines(original, modified, { timeout: 750, maxEditLength: 2000 })
  if (!changes) throw new Error('These texts have too many differences. Compare smaller sections.')
  return changes
}
