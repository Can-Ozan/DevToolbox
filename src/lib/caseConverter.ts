export function convertCases(input: string) {
  const words =
    input
      .replace(/(\p{Lu}+)(\p{Lu}\p{Ll})/gu, '$1 $2')
      .replace(/([\p{Ll}\p{N}])(\p{Lu})/gu, '$1 $2')
      .match(/[\p{L}\p{N}][\p{L}\p{N}\p{M}]*/gu) ?? []
  const lower = words.map((word) => word.toLowerCase())
  const capitalize = (word: string) => {
    const [first = '', ...rest] = [...word]
    return first.toUpperCase() + rest.join('')
  }
  return {
    lowercase: input.toLowerCase(),
    UPPERCASE: input.toUpperCase(),
    'Title Case': lower.map(capitalize).join(' '),
    'Sentence case': input
      .toLowerCase()
      .replace(
        /(^\s*|[.!?]\s+)(\p{L})/gu,
        (_, prefix: string, letter: string) => prefix + letter.toUpperCase(),
      ),
    camelCase: lower.map((word, i) => (i ? capitalize(word) : word)).join(''),
    PascalCase: lower.map(capitalize).join(''),
    snake_case: lower.join('_'),
    'kebab-case': lower.join('-'),
    CONSTANT_CASE: lower.join('_').toUpperCase(),
    'dot.case': lower.join('.'),
  }
}
