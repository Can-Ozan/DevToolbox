import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { PwaUpdateNotice } from '../pwa/PwaControls'
import { NavLink, Outlet, useLocation } from 'react-router-dom'
import {
  ChevronLeft,
  CodeXml,
  Grid2X2,
  History,
  House,
  Menu,
  Moon,
  PanelLeftClose,
  Search,
  Settings2,
  ShieldCheck,
  Star,
  Sun,
  FolderOpen,
  X,
} from 'lucide-react'
import { categories, categoryIcons, tools } from '../registry/tools'
import { preferences, usePreferences, useStorageAvailable } from '../storage/preferences'
import { Button, Message, Modal } from './ui'
import CommandPalette from '../features/CommandPalette'
import { currentLanguage, getToolText, getCategoryLabel } from '../i18n/toolLabels'

function Navigation({ close }: { close?: () => void }) {
  const { t } = useTranslation()
  const { favorites, collapsed } = usePreferences()
  return (
    <>
      <div className="navigation-header">
        <NavLink to="/" className="brand" aria-label={t('shell.brandDashboard')} onClick={close}>
          <span className="brand-icon">
            <CodeXml size={24} />
          </span>
          <span className="sidebar-label">
            DevToolbox<span className="version-pill">v4.1</span>
          </span>
        </NavLink>
        {close && (
          <Button
            variant="ghost"
            className="drawer-close"
            aria-label={t('shell.closeNavigation')}
            onClick={close}
          >
            <X size={20} />
          </Button>
        )}
      </div>
      <div className="navigation-content">
        <div className="sidebar-scroll">
          <div className="nav-section-label sidebar-label">{t('shell.overview')}</div>
          <nav aria-label={t('shell.workspace')}>
            <NavLink end to="/" title={t('shell.dashboard')} onClick={close}>
              <House size={18} />
              <span className="sidebar-label">{t('shell.dashboard')}</span>
            </NavLink>
            <NavLink end to="/tools" title={t('shell.allTools')} onClick={close}>
              <Grid2X2 size={18} />
              <span className="sidebar-label">{t('shell.allTools')}</span>
              <span className="nav-count sidebar-label">{tools.length}</span>
            </NavLink>
            <NavLink to="/workspace" title={t('shell.workspace')} onClick={close}>
              <FolderOpen size={18} />
              <span className="sidebar-label">{t('shell.workspace')}</span>
            </NavLink>
            <NavLink to="/favorites" title={t('shell.favorites')} onClick={close}>
              <Star size={18} />
              <span className="sidebar-label">{t('shell.favorites')}</span>
              {favorites.length > 0 && (
                <span className="nav-count sidebar-label">{favorites.length}</span>
              )}
            </NavLink>
            <NavLink to="/recent" title={t('shell.recent')} onClick={close}>
              <History size={18} />
              <span className="sidebar-label">{t('shell.recent')}</span>
            </NavLink>
          </nav>
          {favorites.some((id) => tools.some((tool) => tool.id === id)) && (
            <>
              <div className="nav-section-label sidebar-label">{t('shell.pinned')}</div>
              <nav aria-label={t('shell.pinnedTools')}>
                {favorites
                  .flatMap((id) => tools.filter((tool) => tool.id === id))
                  .slice(0, 4)
                  .map((tool) => {
                    const Icon = tool.icon
                    return (
                      <NavLink
                        key={tool.id}
                        to={tool.path}
                        title={getToolText(tool, currentLanguage()).name}
                        onClick={close}
                      >
                        <Icon size={18} />
                        <span className="sidebar-label">
                          {getToolText(tool, currentLanguage()).name}
                        </span>
                      </NavLink>
                    )
                  })}
              </nav>
            </>
          )}
          <div className="nav-section-label sidebar-label">{t('shell.categoriesHeading')}</div>
          <nav aria-label={t('shell.categories')}>
            {categories
              .filter((category) => tools.some((tool) => tool.category === category))
              .map((category) => {
                const Icon = categoryIcons[category]
                return (
                  <NavLink
                    key={category}
                    to={`/category/${category.toLowerCase()}`}
                    title={getCategoryLabel(category, currentLanguage())}
                    onClick={close}
                  >
                    <Icon size={18} />
                    <span className="sidebar-label">
                      {getCategoryLabel(category, currentLanguage())}
                    </span>
                    <span className="category-count sidebar-label">
                      {tools.filter((tool) => tool.category === category).length}
                    </span>
                  </NavLink>
                )
              })}
          </nav>
        </div>
        <div className="sidebar-bottom">
          <div className="local-card sidebar-label">
            <span className="local-symbol">
              <ShieldCheck size={18} />
            </span>
            <strong>{t('shell.private')}</strong>
            <p>{t('shell.inputsLocal')}</p>
            <span className="local-indicator">
              <i />
              {t('shell.allLocal')}
            </span>
          </div>
          <nav aria-label={t('shell.preferences')}>
            <NavLink to="/settings" title={t('shell.settings')} onClick={close}>
              <Settings2 size={18} />
              <span className="sidebar-label">{t('shell.settings')}</span>
            </NavLink>
          </nav>
          <button
            className="collapse-button"
            onClick={preferences.toggleSidebar}
            aria-label={t(collapsed ? 'shell.expandSidebar' : 'shell.collapseSidebar')}
            title={t(collapsed ? 'shell.expandSidebar' : 'shell.collapseSidebar')}
          >
            <PanelLeftClose size={17} />
            <span className="sidebar-label">{t('shell.collapseSidebar')}</span>
            <ChevronLeft size={15} className="sidebar-label ml-auto" />
          </button>
        </div>
      </div>
    </>
  )
}
export default function Layout() {
  const { t } = useTranslation()
  const [searchOpen, setSearchOpen] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)
  const { collapsed, theme } = usePreferences()
  const storageAvailable = useStorageAvailable()
  const location = useLocation()
  // React Router accepts trailing slashes; these URLs describe the same page.
  const pathname = location.pathname.replace(/\/+$/, '') || '/'
  const activeTool = tools.find((tool) => tool.path === pathname)
  const names: Record<string, string> = {
    '/': 'Dashboard',
    '/tools': 'All Tools',
    '/workspace': 'Workspace',
    '/favorites': 'Favorites',
    '/recent': 'Recent Tools',
    '/settings': 'Settings',
  }
  const category = categories.find((value) => pathname === `/category/${value.toLowerCase()}`)
  const pageName = activeTool?.name ?? names[pathname] ?? category ?? 'Page not found'
  const displayNames: Record<string, string> = {
    '/': t('shell.dashboard'),
    '/tools': t('shell.allTools'),
    '/workspace': t('shell.workspace'),
    '/favorites': t('shell.favorites'),
    '/recent': t('shell.recent'),
    '/settings': t('shell.settings'),
  }
  const displayName = activeTool
    ? getToolText(activeTool, currentLanguage()).name
    : (displayNames[pathname] ??
      (category ? getCategoryLabel(category, currentLanguage()) : t('shell.notFound')))
  useEffect(() => {
    const media = window.matchMedia('(prefers-color-scheme: dark)')
    function apply() {
      document.documentElement.dataset.theme =
        theme === 'system' ? (media.matches ? 'dark' : 'light') : theme
    }
    apply()
    media.addEventListener('change', apply)
    return () => media.removeEventListener('change', apply)
  }, [theme])
  useEffect(() => {
    const isTool = Boolean(activeTool)
    const description = activeTool
      ? `${activeTool.description} Processed locally in your browser with no upload required.`
      : pathname === '/'
        ? '37 local-first developer tools in one private browser workspace. No backend, no uploads.'
        : `${pageName} in DevToolbox — a private, local-first developer workspace.`
    const title = isTool
      ? `${pageName} — Free Local Developer Tool | DevToolbox`
      : `${pageName} | DevToolbox`
    const canonicalUrl = new URL(
      `${import.meta.env.BASE_URL}${pathname.replace(/^\/+/, '')}`,
      window.location.origin,
    ).toString()

    document.title = title

    function setMeta(selector: string, attribute: 'name' | 'property', key: string, value: string) {
      let element = document.head.querySelector<HTMLMetaElement>(selector)
      if (!element) {
        element = document.createElement('meta')
        element.setAttribute(attribute, key)
        document.head.appendChild(element)
      }
      element.content = value
    }

    setMeta('meta[name="description"]', 'name', 'description', description)
    setMeta('meta[property="og:title"]', 'property', 'og:title', title)
    setMeta('meta[property="og:description"]', 'property', 'og:description', description)
    setMeta('meta[property="og:url"]', 'property', 'og:url', canonicalUrl)
    setMeta('meta[name="twitter:title"]', 'name', 'twitter:title', title)
    setMeta('meta[name="twitter:description"]', 'name', 'twitter:description', description)

    let canonical = document.head.querySelector<HTMLLinkElement>('link[rel="canonical"]')
    if (!canonical) {
      canonical = document.createElement('link')
      canonical.rel = 'canonical'
      document.head.appendChild(canonical)
    }
    canonical.href = canonicalUrl
  }, [activeTool, pageName, pathname])
  useEffect(() => {
    window.scrollTo(0, 0)
    setMobileOpen(false)
  }, [location.pathname])
  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault()
        setSearchOpen((value) => !value)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])
  const shortcut = /Mac|iPhone|iPad/.test(navigator.platform) ? '⌘' : 'Ctrl'
  return (
    <div className={`app-shell ${collapsed ? 'sidebar-collapsed' : ''}`}>
      <a href="#main-content" className="skip-link">
        {t('shell.skip')}
      </a>
      <aside className="sidebar">
        <Navigation />
      </aside>
      <div className="main-shell">
        <header className="topbar">
          <div className="topbar-location">
            <Button
              variant="ghost"
              className="mobile-menu"
              aria-label={t('shell.openNavigation')}
              onClick={() => setMobileOpen(true)}
            >
              <Menu size={21} />
            </Button>
            <NavLink className="breadcrumb-home" to="/">
              DevToolbox
            </NavLink>
            <span className="breadcrumb-slash">/</span>
            <span className="breadcrumb-current">{displayName}</span>
          </div>
          <div className="topbar-actions">
            <button
              className="topbar-search"
              onClick={() => setSearchOpen(true)}
              aria-label={t('shell.openSearch')}
            >
              <Search size={15} />
              <span>{t('shell.searchPlaceholder')}</span>
              <kbd>{shortcut} K</kbd>
            </button>
            <NavLink
              to="/workspace"
              className="topbar-workspace"
              aria-label={t('shell.goWorkspace')}
              title={t('shell.workspace')}
            >
              <FolderOpen size={17} />
              <span>{t('shell.workspace')}</span>
            </NavLink>
            <Button
              variant="ghost"
              aria-label={t('shell.toggleTheme')}
              onClick={() =>
                preferences.setTheme(
                  document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark',
                )
              }
            >
              <Sun size={18} className="theme-icon-sun" />
              <Moon size={18} className="theme-icon-moon" />
            </Button>
          </div>
        </header>
        <PwaUpdateNotice />
        <main id="main-content" className="main-content" tabIndex={-1}>
          {!storageAvailable && <Message kind="warning">{t('shell.storageUnavailable')}</Message>}
          <Outlet context={{ openSearch: () => setSearchOpen(true), shortcut }} />
        </main>
        <footer className="app-footer">
          <span>
            <ShieldCheck size={14} />
            {t('shell.dataLocal')}
          </span>
          <span>
            DevToolbox v4.1 <span aria-hidden="true">·</span>{' '}
            {t('shell.localTools', { count: tools.length })}
          </span>
        </footer>
      </div>
      <Modal
        open={mobileOpen}
        onClose={() => setMobileOpen(false)}
        title={t('shell.navigation')}
        className="mobile-drawer"
      >
        <Navigation close={() => setMobileOpen(false)} />
      </Modal>
      <CommandPalette open={searchOpen} onClose={() => setSearchOpen(false)} />
    </div>
  )
}
