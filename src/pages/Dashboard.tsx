import {
  ArrowRight,
  ArrowUpRight,
  Clock3,
  Command,
  Grid2X2,
  Search,
  ShieldCheck,
  Sparkles,
  Star,
  Zap,
  FolderOpen,
} from 'lucide-react'
import { Link, useOutletContext } from 'react-router-dom'
import { tools } from '../registry/tools'
import { usePreferences } from '../storage/preferences'
import { ToolGrid } from '../components/ToolCard'
import { compatibleTools, dashboardDiscovery } from '../registry/discovery'
import { useWorkspace } from '../workspace/workspaceStore'
import { formatBytes } from '../workspace/workspaceUtils'

export default function Dashboard() {
  const { openSearch, shortcut } = useOutletContext<{ openSearch: () => void; shortcut: string }>()
  const prefs = usePreferences()
  const { favorites, recent } = prefs
  const snapshot = useWorkspace()
  const discovery = dashboardDiscovery(prefs)
  const quickTools = ['json', 'image-converter', 'image-compressor', 'pdf-merger', 'qr'].flatMap(
    (id) => tools.filter((tool) => tool.id === id),
  )
  const hour = new Date().getHours()
  const greeting = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening'
  const favoriteTools = tools.filter((tool) => favorites.includes(tool.id))
  const recentTools = recent
    .flatMap((id) => {
      const tool = tools.find((item) => item.id === id)
      return tool ? [tool] : []
    })
    .slice(0, 6)
  return (
    <div className="dashboard page-enter">
      <div className="welcome-row">
        <div>
          <div className="eyebrow">
            <span className="accent-dot" />
            YOUR EVERYDAY DEVELOPER TOOLKIT
          </div>
          <h1>
            {greeting} <span className="greeting-wave">✦</span>
          </h1>
          <p className="page-description">Build faster with the tools you use every day.</p>
          <p className="helper-text">
            {tools.length} local-first tools for code, files, images and PDFs.
          </p>
        </div>
        <span className="local-badge">
          <span />
          All systems local
        </span>
      </div>
      <button className="dashboard-search" onClick={openSearch}>
        <span className="search-icon-wrap">
          <Search size={23} />
        </span>
        <span>
          <strong>What do you want to build today?</strong>
          <span>Find tools, Workspace files, and actions…</span>
        </span>
        <kbd>{shortcut} K</kbd>
      </button>
      <div className="workspace-stats">
        <div>
          <span className="stat-icon purple">
            <Grid2X2 size={18} />
          </span>
          <strong>{tools.length}</strong>
          <span>essential tools</span>
        </div>
        <div>
          <span className="stat-icon amber">
            <FolderOpen size={18} />
          </span>
          <strong>{snapshot.error ? '—' : snapshot.loading ? '…' : snapshot.files.length}</strong>
          <span>Workspace files{snapshot.error ? ' · unavailable' : ''}</span>
        </div>
        <div>
          <span className="stat-icon purple">
            <Clock3 size={18} />
          </span>
          <strong>{recent.length}</strong>
          <span>recent tools</span>
        </div>
        <div>
          <span className="stat-icon green">
            <ShieldCheck size={18} />
          </span>
          <strong>100%</strong>
          <span>browser-side processing</span>
        </div>
      </div>
      <section className="dashboard-section" aria-label="Quick actions">
        <div className="section-heading">
          <h2>Quick actions</h2>
        </div>
        <div className="quick-actions">
          {quickTools.map((tool) => {
            const Icon = tool.icon
            return (
              <Link key={tool.id} to={tool.path}>
                <Icon size={20} />
                <span>{tool.name}</span>
                <ArrowUpRight size={15} />
              </Link>
            )
          })}
          <Link to="/workspace">
            <FolderOpen size={20} />
            <span>Open Workspace</span>
            <ArrowUpRight size={15} />
          </Link>
        </div>
      </section>
      {!snapshot.error && !!snapshot.files.length && (
        <section className="dashboard-section" aria-label="Continue working">
          <div className="section-heading">
            <h2>Continue working</h2>
            <Link to="/workspace">
              Open Workspace <ArrowRight size={15} />
            </Link>
          </div>
          <div className="continue-files">
            {snapshot.files.slice(0, 3).map((file) => (
              <article className="panel" key={file.id}>
                <h3 className="file-name">
                  {file.pinned && '★ '}
                  {file.name}
                </h3>
                <p className="helper-text">
                  {file.mimeType} · {formatBytes(file.size)}
                </p>
                <p className="helper-text">
                  {tools.find((tool) => tool.id === file.sourceTool)?.name ??
                    'Imported from device'}
                </p>
                <div className="related-links">
                  <Link to={`/workspace?file=${encodeURIComponent(file.id)}`}>Open file</Link>
                  {compatibleTools(file.mimeType)
                    .slice(0, 2)
                    .map((tool) => (
                      <Link key={tool.id} to={`${tool.path}?file=${encodeURIComponent(file.id)}`}>
                        {tool.name}
                      </Link>
                    ))}
                </div>
              </article>
            ))}
          </div>
        </section>
      )}
      <section className="dashboard-section">
        <div className="section-heading">
          <div>
            <Star size={19} />
            <h2>Your favorites</h2>
            {favorites.length > 0 && <span className="count-pill">{favorites.length}</span>}
          </div>
          <Link to="/favorites">
            View favorites <ArrowRight size={15} />
          </Link>
        </div>
        {favoriteTools.length ? (
          <ToolGrid items={favoriteTools.slice(0, 6)} />
        ) : (
          <div className="favorites-empty">
            <span className="empty-icon">
              <Star size={24} />
            </span>
            <div>
              <h3>Your go-to tools, one click away</h3>
              <p>
                Click the <Star size={12} /> on any tool to give it a home here.
              </p>
            </div>
            <Link className="button button-secondary" to="/tools">
              Explore tools <ArrowRight size={15} />
            </Link>
          </div>
        )}
      </section>
      <section className="dashboard-section">
        <div className="section-heading">
          <div>
            <Zap size={19} />
            <h2>{discovery.title}</h2>
            <span className="subtle-label">
              {discovery.title === 'Most used'
                ? 'Based on your local history'
                : 'A good place to start'}
            </span>
          </div>
          <Link to="/tools">
            View all tools <ArrowRight size={15} />
          </Link>
        </div>
        <ToolGrid items={discovery.items} />
      </section>
      <section className="dashboard-section">
        <div className="section-heading">
          <div>
            <Clock3 size={19} />
            <h2>Recently used</h2>
          </div>
          <Link to="/recent">
            View history <ArrowRight size={15} />
          </Link>
        </div>
        {recentTools.length ? (
          <div className="recent-grid">
            {recentTools.map((tool) => {
              const Icon = tool.icon
              return (
                <Link to={tool.path} key={tool.id} className="recent-item">
                  <span className={`tool-icon small ${tool.color}`}>
                    <Icon size={19} />
                  </span>
                  <div>
                    <strong>{tool.name}</strong>
                    <span>{tool.category}</span>
                  </div>
                  <ArrowUpRight size={16} />
                </Link>
              )
            })}
          </div>
        ) : (
          <div className="recent-empty">
            <Clock3 size={19} />
            <span>A fresh workspace. The tools you open will appear here.</span>
          </div>
        )}
      </section>
      <div className="dashboard-bottom">
        <div className="privacy-note">
          <ShieldCheck size={22} />
          <div>
            <strong>Small tools. A little peace of mind.</strong>
            <p>
              Your data stays on your device. DevToolbox processes supported inputs locally in your
              browser.
            </p>
          </div>
        </div>
        <div className="shortcut-note">
          <span>
            <Command size={17} />A shortcut to everything
          </span>
          <p>
            Press <kbd>{shortcut}</kbd> + <kbd>K</kbd> from anywhere.
          </p>
          <Sparkles className="shortcut-sparkle" size={30} />
        </div>
      </div>
    </div>
  )
}
