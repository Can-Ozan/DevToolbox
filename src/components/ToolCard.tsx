import { ArrowUpRight, Star } from 'lucide-react'
import { Link } from 'react-router-dom'
import type { ToolDefinition } from '../registry/tools'
import { preferences, usePreferences } from '../storage/preferences'

export function FavoriteButton({ tool }: { tool: ToolDefinition }) {
  const active = usePreferences().favorites.includes(tool.id)
  return (
    <button
      type="button"
      className={`favorite-button ${active ? 'is-favorite' : ''}`}
      aria-label={`${active ? 'Remove' : 'Add'} ${tool.name} ${active ? 'from' : 'to'} favorites`}
      aria-pressed={active}
      title={active ? 'Remove favorite' : 'Add favorite'}
      onClick={() => preferences.toggleFavorite(tool.id)}
    >
      <Star size={17} fill={active ? 'currentColor' : 'none'} />
    </button>
  )
}
export function ToolCard({ tool }: { tool: ToolDefinition }) {
  const Icon = tool.icon
  return (
    <article className="tool-card">
      <FavoriteButton tool={tool} />
      <Link className="tool-card-link" to={tool.path}>
        <div className="card-title">
          <span className={`tool-icon ${tool.color}`}>
            <Icon size={20} strokeWidth={1.7} />
          </span>
          <h3>{tool.name}</h3>
        </div>
        <p>{tool.description}</p>
        <div className="card-bottom">
          <span className="category-tag">{tool.category}</span>
          {tool.workspaceCompatible && <span className="capability-label">File workflow</span>}
          <ArrowUpRight size={16} />
        </div>
      </Link>
    </article>
  )
}
export function ToolGrid({
  items,
  compact = false,
}: {
  items: ToolDefinition[]
  compact?: boolean
}) {
  return (
    <div className={`tool-grid ${compact ? 'tool-grid-compact' : ''}`}>
      {items.map((tool) => (
        <ToolCard key={tool.id} tool={tool} />
      ))}
    </div>
  )
}
