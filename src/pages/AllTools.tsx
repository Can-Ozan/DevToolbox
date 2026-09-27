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
  const { category: routeCategory } = useParams()
  const [query, setQuery] = useState('')
  const [filter, setFilter] = useState('')
  const [sort, setSort] = useState<ToolSort>('recommended')
  const prefs = usePreferences()
  const category = categories.find((item) => item.toLowerCase() === routeCategory)
  if (routeCategory && !category) return <NotFound />
  const results = sortTools(searchTools(query, category ?? filter), sort, prefs)
  return (
    <div className="catalog-page page-enter">
      <PageHeader
        eyebrow="TOOL LIBRARY"
        title={category ?? 'All tools'}
        description="Small tasks, sorted. Every tool runs right here in your browser."
        actions={<span className="count-pill">{tools.length} local tools</span>}
      />
      <div className="catalog-toolbar">
        <div className="input-with-icon">
          <Search size={18} />
          <input
            aria-label="Search all tools"
            placeholder="Search by name, keyword, or category…"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
        </div>
        <span className="catalog-count" role="status">
          <SlidersHorizontal size={16} />
          {results.length} tools
        </span>
        <label className="catalog-sort">
          Sort tools
          <select value={sort} onChange={(event) => setSort(event.target.value as ToolSort)}>
            <option value="recommended">Recommended</option>
            <option value="name">A → Z</option>
            <option value="usage">Most used</option>
            <option value="recent">Recently used</option>
            <option value="favorites">Favorites first</option>
          </select>
        </label>
      </div>
      {!category && (
        <div className="filter-tabs" aria-label="Filter tools by category">
          <button
            className={!filter ? 'active' : ''}
            aria-pressed={!filter}
            onClick={() => setFilter('')}
          >
            All tools
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
                {item}
              </button>
            ))}
        </div>
      )}
      <ToolGrid items={results} />
      {!results.length && (
        <div className="empty-state">
          <Search size={30} />
          <h2>No matching tools</h2>
          <p>Try a shorter search or choose another category.</p>
          <button
            className="button button-secondary"
            onClick={() => {
              setQuery('')
              setFilter('')
            }}
          >
            Clear filters
          </button>
        </div>
      )}
    </div>
  )
}
