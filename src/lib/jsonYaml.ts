import { parseDocument, stringify } from 'yaml'

function jsonCompatible(
  value: unknown,
  seen = new Set<object>(),
  depth = 0,
  budget = { nodes: 0 },
): unknown {
  if (++budget.nodes > 20000 || depth > 80)
    throw new Error('This document is too large or deeply nested. Use a smaller section.')
  if (value === null || typeof value === 'string' || typeof value === 'boolean') return value
  if (typeof value === 'bigint') {
    if (value > BigInt(Number.MAX_SAFE_INTEGER) || value < BigInt(Number.MIN_SAFE_INTEGER))
      throw new Error(
        'An integer exceeds JSON’s safe numeric range. Quote it as a string to preserve its value.',
      )
    return Number(value)
  }
  if (typeof value === 'number') {
    if (!Number.isFinite(value) || (Number.isInteger(value) && !Number.isSafeInteger(value)))
      throw new Error(
        'Non-finite or unsafe integer values cannot be converted without losing information. Use strings instead.',
      )
    return value
  }
  if (typeof value !== 'object' || !value)
    throw new Error('This YAML value cannot be represented in JSON.')
  if (seen.has(value)) throw new Error('Circular YAML aliases cannot be represented in JSON.')
  seen.add(value)
  const convert = (item: unknown) => jsonCompatible(item, seen, depth + 1, budget)
  let result: unknown
  if (Array.isArray(value)) result = value.map(convert)
  else {
    const entries: [unknown, unknown][] =
      value instanceof Map ? [...value.entries()] : Object.entries(value)
    if (entries.some(([key]) => typeof key !== 'string'))
      throw new Error('JSON object keys must be strings. Quote numeric or boolean YAML keys.')
    result = Object.fromEntries(entries.map(([key, item]) => [key, convert(item)]))
  }
  seen.delete(value)
  return result
}

export function convertJsonYaml(input: string, direction: 'json-yaml' | 'yaml-json') {
  if (!input.trim()) throw new Error('Enter a document to convert.')
  if (input.length > 200000) throw new Error('Input is limited to 200,000 characters.')
  if (direction === 'json-yaml')
    return stringify(jsonCompatible(JSON.parse(input)), { lineWidth: 0 })
  const document = parseDocument(input, { schema: 'core', intAsBigInt: true, uniqueKeys: true })
  if (document.errors.length) throw new Error(document.errors[0].message)
  if (document.warnings.length) throw new Error(document.warnings[0].message)
  return JSON.stringify(
    jsonCompatible(document.toJS({ mapAsMap: true, maxAliasCount: 50 })),
    null,
    2,
  )
}
