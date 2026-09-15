import { useEffect, useState } from 'react'
import { NavLink, Outlet, useLocation } from 'react-router-dom'
import {
  ArrowLeftRight,
  Braces,
  ChevronLeft,
  CodeXml,
  Command,
  Grid2X2,
  History,
  House,
  Menu,
  Moon,
  PanelLeftClose,
  Search,
  Settings2,
  ShieldCheck,
  Sparkles,
  Star,
  Sun,
  WandSparkles,
  Wrench,
  X,
} from 'lucide-react'
import { categories, tools } from '../registry/tools'
import { preferences, usePreferences, useStorageAvailable } from '../storage/preferences'
import { Button, Message, Modal } from './ui'
import CommandPalette from '../features/CommandPalette'

const categoryIcons = [Braces, WandSparkles, CodeXml, ArrowLeftRight, Wrench]
function Navigation({ close }: { close?: () => void }) {
  const { favorites, collapsed } = usePreferences()
  return (
    <>
      <NavLink to="/" className="brand" onClick={close}>
        <span className="brand-icon">
          <CodeXml size={24} />
        </span>
        <span className="sidebar-label">
          DevToolbox<span className="version-pill">v1.0</span>
        </span>
      </NavLink>
      <div className="sidebar-scroll">
        <div className="nav-section-label sidebar-label">WORKSPACE</div>
        <nav aria-label="Workspace">
          <NavLink end to="/" title="Dashboard" onClick={close}>
            <House size={18} />
            <span className="sidebar-label">Dashboard</span>
          </NavLink>
          <NavLink end to="/tools" title="All Tools" onClick={close}>
            <Grid2X2 size={18} />
            <span className="sidebar-label">All Tools</span>
            <span className="nav-count sidebar-label">{tools.length}</span>
          </NavLink>
          <NavLink to="/favorites" title="Favorites" onClick={close}>
            <Star size={18} />
            <span className="sidebar-label">Favorites</span>
            {favorites.length > 0 && (
              <span className="nav-count sidebar-label">{favorites.length}</span>
            )}
          </NavLink>
          <NavLink to="/recent" title="Recent Tools" onClick={close}>
            <History size={18} />
            <span className="sidebar-label">Recent Tools</span>
          </NavLink>
        </nav>
        <div className="nav-section-label sidebar-label">TOOL CATEGORIES</div>
        <nav aria-label="Tool categories">
          {categories.map((category, index) => {
            const Icon = categoryIcons[index]
            return (
              <NavLink
                key={category}
                to={`/category/${category.toLowerCase()}`}
                title={category}
                onClick={close}
              >
                <Icon size={18} />
                <span className="sidebar-label">{category}</span>
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
          <strong>Private by design</strong>
          <p>
            Your inputs stay in your browser.
            <br />
            Just you and your tools.
          </p>
          <span className="local-indicator">
            <i />
            All tools run locally
          </span>
        </div>
        <nav aria-label="Preferences">
          <NavLink to="/settings" title="Settings" onClick={close}>
            <Settings2 size={18} />
            <span className="sidebar-label">Settings</span>
          </NavLink>
        </nav>
        <button
          className="collapse-button"
          onClick={preferences.toggleSidebar}
          aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          <PanelLeftClose size={17} />
          <span className="sidebar-label">Collapse sidebar</span>
          <ChevronLeft size={15} className="sidebar-label ml-auto" />
        </button>
      </div>
    </>
  )
}
export default function Layout() {
  const [searchOpen, setSearchOpen] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)
  const { collapsed, theme } = usePreferences()
  const storageAvailable = useStorageAvailable()
  const location = useLocation()
  const activeTool = tools.find((tool) => tool.path === location.pathname)
  const names: Record<string, string> = {
    '/': 'Dashboard',
    '/tools': 'All Tools',
    '/favorites': 'Favorites',
    '/recent': 'Recent Tools',
    '/settings': 'Settings',
  }
  const category = categories.find(
    (value) => location.pathname === `/category/${value.toLowerCase()}`,
  )
  const pageName = activeTool?.name ?? names[location.pathname] ?? category ?? 'Page not found'
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
    document.title = `${pageName} | DevToolbox`
    window.scrollTo(0, 0)
    setMobileOpen(false)
  }, [pageName, location.pathname])
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
        Skip to content
      </a>
      <aside className="sidebar">
        <Navigation />
      </aside>
      <div className="main-shell">
        <header className="topbar">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              className="mobile-menu"
              aria-label="Open navigation"
              onClick={() => setMobileOpen(true)}
            >
              <Menu size={21} />
            </Button>
            <span className="breadcrumb-home">Workspace</span>
            <span className="breadcrumb-slash">/</span>
            <span className="breadcrumb-current">{pageName}</span>
          </div>
          <div className="topbar-actions">
            <button
              className="topbar-search"
              onClick={() => setSearchOpen(true)}
              aria-label="Open search"
            >
              <Search size={15} />
              <span>Search anything…</span>
              <kbd>{shortcut} K</kbd>
            </button>
            <span className="topbar-divider" />
            <Button
              variant="ghost"
              aria-label="Toggle light and dark theme"
              onClick={() =>
                preferences.setTheme(
                  document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark',
                )
              }
            >
              {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
            </Button>
            <span className="workspace-avatar" title="Your local workspace">
              <CodeXml size={18} />
            </span>
          </div>
        </header>
        <main id="main-content" className="main-content" tabIndex={-1}>
          {!storageAvailable && (
            <Message kind="warning">
              Browser storage is unavailable. Preferences will last only for this session.
            </Message>
          )}
          <Outlet context={{ openSearch: () => setSearchOpen(true), shortcut }} />
        </main>
        <footer className="app-footer">
          <span>
            <ShieldCheck size={14} />
            Your data stays on your device.
          </span>
          <span>
            Essential developer tools. Fast, private, and local. <Sparkles size={13} />
          </span>
        </footer>
      </div>
      <Modal
        open={mobileOpen}
        onClose={() => setMobileOpen(false)}
        title="Navigation"
        className="mobile-drawer"
      >
        <button
          className="drawer-close"
          aria-label="Close navigation"
          onClick={() => setMobileOpen(false)}
        >
          <X size={20} />
        </button>
        <Navigation close={() => setMobileOpen(false)} />
      </Modal>
      <CommandPalette open={searchOpen} onClose={() => setSearchOpen(false)} />
      <span className="sr-only">
        <Command />
        Essential developer tools. Fast, private, and local.
      </span>
    </div>
  )
}
