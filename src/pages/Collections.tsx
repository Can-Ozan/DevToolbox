import { Clock3, Star, ArrowRight } from 'lucide-react'
import { Link } from 'react-router-dom'
import { tools } from '../registry/tools'
import { usePreferences } from '../storage/preferences'
import { ToolGrid } from '../components/ToolCard'

export default function Collections({ kind }: { kind: 'favorites' | 'recent' }) {
  const settings = usePreferences()
  const items = settings[kind].flatMap((id) => {
    const tool = tools.find((item) => item.id === id)
    return tool ? [tool] : []
  })
  const isFavorites = kind === 'favorites'
  const Icon = isFavorites ? Star : Clock3
  return (
    <div className="page-enter">
      <div className="eyebrow">YOUR WORKSPACE</div>
      <h1>
        {isFavorites ? 'Your favorites' : 'Recently used'}
        <span className="heading-dot">.</span>
      </h1>
      <p className="page-description">
        {isFavorites
          ? 'Your trusted tools, right where you need them.'
          : 'Pick up where you left off. Your last 10 unique tools live here.'}
      </p>
      <div className="collection-content">
        {items.length ? (
          <ToolGrid items={items} />
        ) : (
          <div className="empty-state">
            <span className="empty-icon">
              <Icon size={30} />
            </span>
            <h2>{isFavorites ? 'Make this space yours' : 'Your next tool is waiting'}</h2>
            <p>
              {isFavorites
                ? 'Star any tool to keep it in your personal collection.'
                : 'Open a tool and it will appear here automatically.'}
            </p>
            <Link className="button button-primary" to="/tools">
              Explore all tools <ArrowRight size={16} />
            </Link>
          </div>
        )}
      </div>
    </div>
  )
}
