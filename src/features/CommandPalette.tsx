import { useEffect, useRef, useState } from 'react'
import { CornerDownLeft, FolderOpen, Search, Star } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { searchTools } from '../registry/tools'
import { usePreferences } from '../storage/preferences'
import { Modal } from '../components/ui'

export default function CommandPalette({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [query, setQuery] = useState('')
  const [selected, setSelected] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)
  const navigate = useNavigate()
  const { favorites } = usePreferences()
  const results = [
    ...searchTools(query),
    ...('workspace files local vault'.includes(query.trim().toLowerCase())
      ? [
          {
            id: 'workspace',
            name: 'Workspace',
            category: 'Navigation',
            path: '/workspace',
            icon: FolderOpen,
            color: 'purple',
          },
        ]
      : []),
  ]
  useEffect(() => {
    if (open) {
      setQuery('')
      setSelected(0)
      requestAnimationFrame(() => inputRef.current?.focus())
    }
  }, [open])
  useEffect(() => {
    if (open) document.getElementById(`command-${selected}`)?.scrollIntoView({ block: 'nearest' })
  }, [selected, open])
  function choose(path: string) {
    onClose()
    navigate(path)
  }
  return (
    <Modal open={open} onClose={onClose} title="Find your next tool" className="command-modal">
      <div className="command-input">
        <Search size={21} />
        <input
          ref={inputRef}
          aria-label="Search developer tools"
          placeholder="Search tools, categories, or keywords…"
          role="combobox"
          aria-expanded="true"
          aria-controls="command-results"
          aria-activedescendant={results.length ? `command-${selected}` : undefined}
          aria-autocomplete="list"
          value={query}
          onChange={(event) => {
            setQuery(event.target.value)
            setSelected(0)
          }}
          onKeyDown={(event) => {
            if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
              event.preventDefault()
              setSelected((value) =>
                results.length
                  ? (value + (event.key === 'ArrowDown' ? 1 : -1) + results.length) % results.length
                  : 0,
              )
            }
            if (event.key === 'Enter' && results[selected]) {
              event.preventDefault()
              choose(results[selected].path)
            }
          }}
        />
        <kbd>esc</kbd>
      </div>
      <div className="command-results" id="command-results" role="listbox" aria-label="Tools">
        {results.map((tool, index) => {
          const Icon = tool.icon
          return (
            <div
              role="option"
              aria-selected={selected === index}
              id={`command-${index}`}
              key={tool.id}
              className={`command-option ${selected === index ? 'selected' : ''}`}
              onMouseMove={() => setSelected(index)}
              onClick={() => choose(tool.path)}
            >
              <span className={`tool-icon small ${tool.color}`}>
                <Icon size={19} />
              </span>
              <div>
                <strong>{tool.name}</strong>
                <span>{tool.category}</span>
              </div>
              {favorites.includes(tool.id) && <Star size={14} className="favorite-star" />}
              <CornerDownLeft size={16} className="ml-auto" />
            </div>
          )
        })}
        {!results.length && (
          <div className="empty-state compact">
            <Search size={25} />
            <h3>No tools found</h3>
            <p>Try “token”, “color”, or “generator”.</p>
          </div>
        )}
      </div>
      <div className="command-footer">
        <span>
          <kbd>↑</kbd>
          <kbd>↓</kbd> to navigate
        </span>
        <span>
          <kbd>↵</kbd> to open
        </span>
        <span>{results.length} tools</span>
      </div>
    </Modal>
  )
}
