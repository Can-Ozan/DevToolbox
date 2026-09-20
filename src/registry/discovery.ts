import { tools, type ToolDefinition } from './tools'
import type { Preferences } from '../storage/preferences'
import { acceptsFile } from '../workspace/workspaceUtils'

export type ToolSort = 'recommended' | 'name' | 'usage' | 'recent' | 'favorites'
export function sortTools(
  items: ToolDefinition[],
  sort: ToolSort,
  preferences: Pick<Preferences, 'toolUsage' | 'recent' | 'favorites'>,
) {
  const rank = (id: string) => {
    const index = preferences.recent.indexOf(id)
    return index < 0 ? Number.MAX_SAFE_INTEGER : index
  }
  return [...items].sort((a, b) => {
    if (sort === 'name') return a.name.localeCompare(b.name)
    if (sort === 'usage')
      return (preferences.toolUsage[b.id] ?? 0) - (preferences.toolUsage[a.id] ?? 0)
    if (sort === 'recent') return rank(a.id) - rank(b.id)
    if (sort === 'favorites')
      return (
        Number(preferences.favorites.includes(b.id)) - Number(preferences.favorites.includes(a.id))
      )
    return 0
  })
}
export const featuredIds = [
  'json',
  'image-converter',
  'image-compressor',
  'pdf-merger',
  'qr',
  'json-yaml',
]
export function dashboardDiscovery(
  preferences: Pick<Preferences, 'toolUsage' | 'recent' | 'favorites'>,
) {
  const used = sortTools(
    tools.filter((tool) => preferences.toolUsage[tool.id] > 0),
    'usage',
    preferences,
  )
  return used.length >= 3
    ? { title: 'Most used', items: used.slice(0, 6) }
    : {
        title: 'Featured tools',
        items: featuredIds.flatMap((id) => tools.filter((tool) => tool.id === id)),
      }
}
export function compatibleTools(mimeType: string) {
  return tools.filter(
    (tool) =>
      tool.workspaceCompatible &&
      tool.acceptsFileTypes?.length &&
      acceptsFile(mimeType, tool.acceptsFileTypes),
  )
}
export function nextTools(sourceId: string | undefined, mimeType: string) {
  const source = tools.find((tool) => tool.id === sourceId)
  if (!source?.producesFileTypes || !acceptsFile(mimeType, source.producesFileTypes)) return []
  return compatibleTools(mimeType).filter((tool) => tool.id !== sourceId)
}
export function relatedTools(tool: ToolDefinition) {
  const explicit: Record<string, string[]> = { json: ['json-yaml', 'base64', 'url-parser'] }
  const ids = explicit[tool.id]
  if (ids) return ids.flatMap((id) => tools.filter((candidate) => candidate.id === id))
  const compatible = new Set(
    tool.producesFileTypes?.flatMap((type) => compatibleTools(type).map((item) => item.id)) ?? [],
  )
  return tools
    .filter(
      (candidate) =>
        candidate.id !== tool.id &&
        (candidate.category === tool.category || compatible.has(candidate.id)),
    )
    .sort((a, b) => Number(compatible.has(b.id)) - Number(compatible.has(a.id)))
    .slice(0, 4)
}
