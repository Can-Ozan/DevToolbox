import { useTranslation } from 'react-i18next'
import { Clock3, Star, ArrowRight } from 'lucide-react'
import { Link } from 'react-router-dom'
import { tools } from '../registry/tools'
import { usePreferences } from '../storage/preferences'
import { ToolGrid } from '../components/ToolCard'
import { PageHeader } from '../components/ToolLayout'

export default function Collections({ kind }: { kind: 'favorites' | 'recent' }) {
  const { t } = useTranslation()
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
        eyebrow={t('discovery.collection')}
        title={t(isFavorites ? 'discovery.favorites' : 'discovery.recentlyUsed')}
        description={
          isFavorites ? t('discovery.favoritesDescription') : t('discovery.recentDescription')
        }
        actions={
          <span className="count-pill">{t('discovery.tools', { count: items.length })}</span>
        }
      />
      <div className="collection-content">
        {items.length ? (
          <ToolGrid items={items} />
        ) : (
          <div className="empty-state">
            <span className="empty-icon">
              <Icon size={30} />
            </span>
            <h2>{t(isFavorites ? 'discovery.favoritesEmpty' : 'discovery.nextTool')}</h2>
            <p>{isFavorites ? t('discovery.starHelp') : t('discovery.recentHelp')}</p>
            <Link className="button button-primary" to="/tools">
              {t('discovery.exploreAll')} <ArrowRight size={16} />
            </Link>
          </div>
        )}
      </div>
    </div>
  )
}
