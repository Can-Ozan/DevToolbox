export interface RegexMatch {
  value: string
  index: number
  groups: (string | null)[]
  namedGroups?: Record<string, string | undefined>
}
export interface RegexResult {
  matches: RegexMatch[]
  limited: boolean
  error?: string
}
export function matchRegex(pattern: string, flags: string, text: string): RegexResult {
  if (!/^[gimsuy]*$/.test(flags) || new Set(flags).size !== flags.length)
    throw new Error('Use each supported flag at most once: g, i, m, s, u, y.')
  if (text.length > 100000)
    throw new Error('Test text is limited to 100,000 characters to keep the interface responsive.')
  const regex = new RegExp(pattern, flags)
  const matches: RegexMatch[] = []
  let result: RegExpExecArray | null
  while ((result = regex.exec(text)) !== null) {
    matches.push({
      value: result[0],
      index: result.index,
      groups: result.slice(1).map((value) => value ?? null),
      namedGroups: result.groups,
    })
    if (!regex.global) break
    if (matches.length >= 1000) return { matches, limited: true }
    if (result[0] === '') {
      const code = text.codePointAt(regex.lastIndex)
      regex.lastIndex += regex.unicode && code !== undefined && code > 0xffff ? 2 : 1
    }
  }
  return { matches, limited: false }
}
