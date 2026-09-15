import { useState } from 'react'
import { Search, SlidersHorizontal } from 'lucide-react'
import { useParams } from 'react-router-dom'
import { categories, searchTools } from '../registry/tools'
import { ToolGrid } from '../components/ToolCard'
import NotFound from './NotFound'

export default function AllTools() {
  const { category: routeCategory } = useParams()
  const [query, setQuery] = useState('')
  const [filter, setFilter] = useState('')
  const category = categories.find((item) => item.toLowerCase() === routeCategory)
  if (routeCategory && !category) return <NotFound />
  const results = searchTools(query, category ?? filter)
  return (
    <div className="page-enter">
      <div className="eyebrow">YOUR WORKBENCH</div>
      <h1>
        {category ?? 'All tools'}
        <span className="heading-dot">.</span>
      </h1>
      <p className="page-description">
        The right tool for the little things that take too much time.
      </p>
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
        <span>
          <SlidersHorizontal size={16} />
          {results.length} tools
        </span>
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
          {categories.map((item) => (
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
