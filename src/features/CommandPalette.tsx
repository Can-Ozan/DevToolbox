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
import { useTranslation } from 'react-i18next'
import { currentLanguage, getToolText, getCategoryLabel } from '../i18n/toolLabels'

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
  const { t } = useTranslation()
  const language = currentLanguage()
  const [query, setQuery] = useState('')
  const [selected, setSelected] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)
  const navigate = useNavigate()
  const { favorites } = usePreferences()
  const snapshot = useWorkspace()
  const search = query.trim().toLocaleLowerCase(language)
  const actionLabels: Record<string, string> = {
    workspace: t('discovery.openWorkspace'),
    settings: t('discovery.openSettings'),
    favorites: t('discovery.openFavorites'),
    recent: t('discovery.openRecent'),
    all: t('discovery.openAll'),
    theme: t('discovery.toggleTheme'),
  }
  const actionShortcuts: Record<string, string> = {
    workspace: t('shell.workspace'),
    settings: t('shell.settings'),
    favorites: t('shell.favorites'),
    recent: t('shell.recent'),
    all: t('shell.allTools'),
    theme: t('discovery.toggleTheme'),
  }
  const groupLabels = {
    Tools: t('discovery.groupTools'),
    Files: t('discovery.groupFiles'),
    Actions: t('discovery.groupActions'),
  }
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
  // Exact navigation commands outrank incidental words in tool descriptions.
  const exactAction =
    search &&
    actions.some((action) =>
      [action.id, action.name, actionLabels[action.id], actionShortcuts[action.id]].some(
        (label) => label.toLocaleLowerCase(language) === search,
      ),
    )
  const groups: Result['group'][] = exactAction
    ? ['Actions', 'Tools', 'Files']
    : ['Tools', 'Files', 'Actions']
  const results: Result[] = [
    ...searchTools(query, undefined, language).map((tool) => ({
      id: tool.id,
      name: getToolText(tool, language).name,
      detail: getCategoryLabel(tool.category, language),
      icon: tool.icon,
      color: tool.color,
      path: tool.path,
      group: 'Tools' as const,
    })),
    ...snapshot.files
      .filter((file) =>
        `${file.name} ${file.mimeType}`.toLocaleLowerCase(language).includes(search),
      )
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
      .filter((action) =>
        `${action.name} ${action.keywords} ${actionLabels[action.id]} ${actionShortcuts[action.id]}`
          .toLocaleLowerCase(language)
          .includes(search),
      )
      .map((action) => ({
        ...action,
        name: actionLabels[action.id],
        id: `action-${action.id}`,
        detail: t('discovery.action'),
        color: 'purple',
        group: 'Actions' as const,
      })),
  ]
  // Use the same group order for both rendering and keyboard navigation.
  results.sort((a, b) => groups.indexOf(a.group) - groups.indexOf(b.group))
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
      title={t('discovery.commandTitle')}
      className="command-modal"
    >
      <div className="command-input">
        <Search size={21} />
        <input
          ref={inputRef}
          aria-label={t('discovery.commandTitle')}
          placeholder={t('discovery.commandPlaceholder')}
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
        aria-label={t('discovery.resultsLabel')}
      >
        {groups.map((group) => {
          const items = results
            .map((result, index) => ({ result, index }))
            .filter((item) => item.result.group === group)
          return items.length ? (
            <div role="group" aria-label={groupLabels[group]} key={group}>
              <div className="command-group-label" aria-hidden="true">
                {groupLabels[group]}
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
          <h3>{t('discovery.noResults')}</h3>
          <p>{t('discovery.noResultsHelp')}</p>
        </div>
      )}
      {snapshot.error && (
        <p className="helper-text command-notice">{t('discovery.filesUnavailable')}</p>
      )}
      <div className="command-footer">
        <span>
          <kbd>↑</kbd>
          <kbd>↓</kbd> {t('discovery.navigate')}
        </span>
        <span>
          <kbd>↵</kbd> {t('discovery.open')}
        </span>
        <span>{t('discovery.results', { count: results.length })}</span>
      </div>
    </Modal>
  )
}
