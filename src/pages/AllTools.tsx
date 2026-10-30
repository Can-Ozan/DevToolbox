import { useTranslation } from 'react-i18next'
import { currentLanguage, getCategoryLabel } from '../i18n/toolLabels'
import { useState } from 'react'
import { Search, SlidersHorizontal } from 'lucide-react'
import { useParams } from 'react-router-dom'
import { categories, searchTools, tools } from '../registry/tools'
import { ToolGrid } from '../components/ToolCard'
import NotFound from './NotFound'
import { usePreferences } from '../storage/preferences'
import { sortTools, type ToolSort } from '../registry/discovery'
import { PageHeader } from '../components/ToolLayout'

export default function AllTools() {
  const { t } = useTranslation()
  const language = currentLanguage()
  const { category: routeCategory } = useParams()
  const [query, setQuery] = useState('')
  const [filter, setFilter] = useState('')
  const [sort, setSort] = useState<ToolSort>('recommended')
  const prefs = usePreferences()
  const category = categories.find((item) => item.toLowerCase() === routeCategory)
  if (routeCategory && !category) return <NotFound />
  const results = sortTools(searchTools(query, category ?? filter, language), sort, prefs, language)
  return (
    <div className="catalog-page page-enter">
      <PageHeader
        eyebrow={t('discovery.library')}
        title={category ? getCategoryLabel(category, language) : t('common.allTools')}
        description={t('discovery.catalogDescription')}
        actions={
          <span className="count-pill">{t('shell.localTools', { count: tools.length })}</span>
        }
      />
      <div className="catalog-toolbar">
        <div className="input-with-icon">
          <Search size={18} />
          <input
            aria-label={t('discovery.searchAll')}
            placeholder={t('discovery.searchPlaceholder')}
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
        </div>
        <span className="catalog-count" role="status">
          <SlidersHorizontal size={16} />
          {t('discovery.tools', { count: results.length })}
        </span>
        <label className="catalog-sort">
          {t('discovery.sort')}
          <select value={sort} onChange={(event) => setSort(event.target.value as ToolSort)}>
            <option value="recommended">{t('discovery.recommended')}</option>
            <option value="name">{t('discovery.alphabetical')}</option>
            <option value="usage">{t('discovery.mostUsed')}</option>
            <option value="recent">{t('discovery.recentlyUsed')}</option>
            <option value="favorites">{t('discovery.favoritesFirst')}</option>
          </select>
        </label>
      </div>
      {!category && (
        <div className="filter-tabs" aria-label={t('discovery.filter')}>
          <button
            className={!filter ? 'active' : ''}
            aria-pressed={!filter}
            onClick={() => setFilter('')}
          >
            {t('common.allTools')}
          </button>
          {categories
            .filter((item) => tools.some((tool) => tool.category === item))
            .map((item) => (
              <button
                key={item}
                className={filter === item ? 'active' : ''}
                aria-pressed={filter === item}
                onClick={() => setFilter(item)}
              >
                {getCategoryLabel(item, language)}
              </button>
            ))}
        </div>
      )}
      <ToolGrid items={results} />
      {!results.length && (
        <div className="empty-state">
          <Search size={30} />
          <h2>{t('discovery.noTools')}</h2>
          <p>{t('discovery.noToolsHelp')}</p>
          <button
            className="button button-secondary"
            onClick={() => {
              setQuery('')
              setFilter('')
            }}
          >
            {t('discovery.clearFilters')}
          </button>
        </div>
      )}
    </div>
  )
}
