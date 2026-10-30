import { ArrowUpRight, Star } from 'lucide-react'
import { Link } from 'react-router-dom'
import type { ToolDefinition } from '../registry/tools'
import { preferences, usePreferences } from '../storage/preferences'
import { useTranslation } from 'react-i18next'
import { currentLanguage, getToolText, getCategoryLabel } from '../i18n/toolLabels'

export function FavoriteButton({ tool }: { tool: ToolDefinition }) {
  const { t } = useTranslation()
  const name = getToolText(tool, currentLanguage()).name
  const active = usePreferences().favorites.includes(tool.id)
  return (
    <button
      type="button"
      className={`favorite-button ${active ? 'is-favorite' : ''}`}
      aria-label={t(active ? 'discovery.removeFavorite' : 'discovery.addFavorite', { name })}
      aria-pressed={active}
      title={t(active ? 'discovery.removeFavoriteTitle' : 'discovery.addFavoriteTitle')}
      onClick={() => preferences.toggleFavorite(tool.id)}
    >
      <Star size={17} fill={active ? 'currentColor' : 'none'} />
    </button>
  )
}
export function ToolCard({ tool }: { tool: ToolDefinition }) {
  const { t } = useTranslation()
  const text = getToolText(tool, currentLanguage())
  const Icon = tool.icon
  return (
    <article className="tool-card">
      <FavoriteButton tool={tool} />
      <Link className="tool-card-link" to={tool.path}>
        <div className="card-title">
          <span className={`tool-icon ${tool.color}`}>
            <Icon size={20} strokeWidth={1.7} />
          </span>
          <h3>{text.name}</h3>
        </div>
        <p>{text.description}</p>
        <div className="card-bottom">
          <span className="category-tag">{getCategoryLabel(tool.category, currentLanguage())}</span>
          {tool.workspaceCompatible && (
            <span className="capability-label">{t('discovery.fileWorkflow')}</span>
          )}
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
