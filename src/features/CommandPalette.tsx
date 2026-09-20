import { useEffect, useRef, useState } from 'react'
import {
  CornerDownLeft,
  FolderOpen,
  Search,
  Star,
  Settings2,
  History,
  Sun,
  Grid2X2,
  File,
  type LucideIcon,
} from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { searchTools } from '../registry/tools'
import { preferences, usePreferences } from '../storage/preferences'
import { Modal } from '../components/ui'
import { useWorkspace } from '../workspace/workspaceStore'
import { formatBytes } from '../workspace/workspaceUtils'

type Result = {
  id: string
  name: string
  detail: string
  icon: LucideIcon
  color: string
  group: 'Tools' | 'Files' | 'Actions'
  path?: string
  action?: () => void
}
export default function CommandPalette({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [query, setQuery] = useState('')
  const [selected, setSelected] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)
  const navigate = useNavigate()
  const { favorites } = usePreferences()
  const snapshot = useWorkspace()
  const search = query.trim().toLowerCase()
  const actions = [
    {
      id: 'workspace',
      name: 'Open Workspace',
      icon: FolderOpen,
      path: '/workspace',
      keywords: 'files vault images pdf',
    },
    {
      id: 'settings',
      name: 'Open Settings',
      icon: Settings2,
      path: '/settings',
      keywords: 'preferences appearance',
    },
    { id: 'favorites', name: 'Open Favorites', icon: Star, path: '/favorites', keywords: 'pinned' },
    {
      id: 'recent',
      name: 'Open Recent Tools',
      icon: History,
      path: '/recent',
      keywords: 'history',
    },
    { id: 'all', name: 'Open All Tools', icon: Grid2X2, path: '/tools', keywords: 'catalog' },
    {
      id: 'theme',
      name: 'Toggle theme',
      icon: Sun,
      keywords: 'light dark appearance',
      action: () =>
        preferences.setTheme(document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark'),
    },
  ]
  const results: Result[] = [
    ...searchTools(query).map((tool) => ({
      id: tool.id,
      name: tool.name,
      detail: tool.category,
      icon: tool.icon,
      color: tool.color,
      path: tool.path,
      group: 'Tools' as const,
    })),
    ...snapshot.files
      .filter((file) => `${file.name} ${file.mimeType}`.toLowerCase().includes(search))
      .slice(0, 8)
      .map((file) => ({
        id: `file-${file.id}`,
        name: file.name,
        detail: `${file.mimeType} · ${formatBytes(file.size)}`,
        icon: File,
        color: 'blue',
        path: `/workspace?file=${encodeURIComponent(file.id)}`,
        group: 'Files' as const,
      })),
    ...actions
      .filter((action) => `${action.name} ${action.keywords}`.toLowerCase().includes(search))
      .map((action) => ({
        ...action,
        id: `action-${action.id}`,
        detail: 'Action',
        color: 'purple',
        group: 'Actions' as const,
      })),
  ]
  const active = Math.min(selected, Math.max(0, results.length - 1))
  useEffect(() => {
    if (!open) return
    setQuery('')
    setSelected(0)
    const frame = requestAnimationFrame(() => inputRef.current?.focus())
    return () => cancelAnimationFrame(frame)
  }, [open])
  useEffect(() => {
    if (open) document.getElementById(`command-${active}`)?.scrollIntoView({ block: 'nearest' })
  }, [active, open, results.length])
  function choose(result: Result) {
    onClose()
    if (result.path) navigate(result.path)
    else result.action?.()
  }
  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Search tools, files and actions"
      className="command-modal"
    >
      <div className="command-input">
        <Search size={21} />
        <input
          ref={inputRef}
          aria-label="Search tools, files and actions"
          placeholder="Search tools, files, or actions…"
          role="combobox"
          aria-expanded="true"
          aria-controls="command-results"
          aria-activedescendant={results.length ? `command-${active}` : undefined}
          aria-autocomplete="list"
          value={query}
          onChange={(event) => {
            setQuery(event.target.value)
            setSelected(0)
          }}
          onKeyDown={(event) => {
            if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
              event.preventDefault()
              setSelected(
                results.length
                  ? (active + (event.key === 'ArrowDown' ? 1 : -1) + results.length) %
                      results.length
                  : 0,
              )
            }
            if (event.key === 'Enter' && results[active]) {
              event.preventDefault()
              choose(results[active])
            }
          }}
        />
        <kbd>esc</kbd>
      </div>
      <div
        className="command-results"
        id="command-results"
        role="listbox"
        aria-label="Search results"
      >
        {(['Tools', 'Files', 'Actions'] as const).map((group) => {
          const items = results
            .map((result, index) => ({ result, index }))
            .filter((item) => item.result.group === group)
          return items.length ? (
            <div role="group" aria-label={group} key={group}>
              <div className="command-group-label" aria-hidden="true">
                {group}
              </div>
              {items.map(({ result, index }) => {
                const Icon = result.icon
                return (
                  <div
                    role="option"
                    aria-selected={active === index}
                    id={`command-${index}`}
                    key={result.id}
                    className={`command-option ${active === index ? 'selected' : ''}`}
                    onMouseMove={() => setSelected(index)}
                    onClick={() => choose(result)}
                  >
                    <span className={`tool-icon small ${result.color}`}>
                      <Icon size={19} />
                    </span>
                    <div>
                      <strong>{result.name}</strong>
                      <span>{result.detail}</span>
                    </div>
                    {result.group === 'Tools' && favorites.includes(result.id) && (
                      <Star size={14} className="favorite-star" />
                    )}
                    <CornerDownLeft size={16} className="ml-auto" />
                  </div>
                )
              })}
            </div>
          ) : null
        })}
      </div>
      {!results.length && (
        <div className="empty-state compact">
          <Search size={25} />
          <h3>No results found</h3>
          <p>Try a tool, filename, or “settings”.</p>
        </div>
      )}
      {snapshot.error && (
        <p className="helper-text command-notice">
          Workspace files are unavailable. Tools and actions still work.
        </p>
      )}
      <div className="command-footer">
        <span>
          <kbd>↑</kbd>
          <kbd>↓</kbd> to navigate
        </span>
        <span>
          <kbd>↵</kbd> to open
        </span>
        <span>{results.length} results</span>
      </div>
    </Modal>
  )
}
