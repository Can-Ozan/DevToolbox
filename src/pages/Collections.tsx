import { Clock3, Star, ArrowRight } from 'lucide-react'
import { Link } from 'react-router-dom'
import { tools } from '../registry/tools'
import { usePreferences } from '../storage/preferences'
import { ToolGrid } from '../components/ToolCard'
import { PageHeader } from '../components/ToolLayout'

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
      <PageHeader
        eyebrow="YOUR COLLECTION"
        title={isFavorites ? 'Your favorites' : 'Recently used'}
        description={
          isFavorites
            ? 'Your trusted tools, right where you need them.'
            : 'Pick up where you left off. Your last 10 unique tools live here.'
        }
        actions={<span className="count-pill">{items.length} tools</span>}
      />
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
