import type { WorkspaceCollection } from './workspaceTypes'

export const COLLECTION_LIMIT = 100
export function collectionName(value: string) {
  const name = value.trim()
  if (!name || name.length > 80 || /[\p{Cc}]/u.test(name))
    throw new Error('Collection names must contain 1–80 characters without control characters.')
  return name
}
export function validCollection(value: unknown): value is WorkspaceCollection {
  if (!value || typeof value !== 'object') return false
  const item = value as Partial<WorkspaceCollection>
  try {
    return (
      typeof item.id === 'string' &&
      !!item.id &&
      item.id.length <= 100 &&
      typeof item.name === 'string' &&
      collectionName(item.name) === item.name &&
      typeof item.createdAt === 'number' &&
      Number.isFinite(item.createdAt) &&
      item.createdAt > 0 &&
      item.createdAt < 8.64e15
    )
  } catch {
    return false
  }
}
export function validateCollections(items: unknown): asserts items is WorkspaceCollection[] {
  if (
    !Array.isArray(items) ||
    items.length > COLLECTION_LIMIT ||
    !items.every(validCollection) ||
    new Set(items.map((item) => item.id)).size !== items.length ||
    new Set(items.map((item) => item.name.toLowerCase())).size !== items.length
  )
    throw new Error(
      'Invalid collection metadata. Use up to 100 collections with unique names and IDs.',
    )
}
export function availableCollectionName(name: string, names: string[]) {
  const used = new Set(names.map((item) => item.toLowerCase()))
  let result = collectionName(name)
  for (let suffix = 2; used.has(result.toLowerCase()); suffix++)
    result = `${name.slice(0, 70)} (${suffix})`
  return result
}
