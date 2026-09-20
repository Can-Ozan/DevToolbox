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
    <article className="tool-card group">
      <div className="card-top">
        <span className={`tool-icon ${tool.color}`}>
          <Icon size={23} strokeWidth={1.7} />
        </span>
        <FavoriteButton tool={tool} />
      </div>
      <Link className="tool-card-link" to={tool.path}>
        <h3>{tool.name}</h3>
        <p>{tool.description}</p>
        {tool.workspaceCompatible && (
          <div className="capability-badges">
            <span>FILE</span>
            <span>WORKSPACE</span>
          </div>
        )}
        <div className="card-bottom">
          <span className="category-tag">{tool.category}</span>
          <ArrowUpRight size={16} />
        </div>
      </Link>
    </article>
  )
}
export function ToolGrid({ items }: { items: ToolDefinition[] }) {
  return (
    <div className="tool-grid">
      {items.map((tool) => (
        <ToolCard key={tool.id} tool={tool} />
      ))}
    </div>
  )
}
