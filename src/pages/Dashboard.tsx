import {
  ArrowRight,
  ArrowUpRight,
  Clock3,
  File,
  FolderOpen,
  Search,
  ShieldCheck,
  Star,
} from 'lucide-react'
import { Link, useOutletContext } from 'react-router-dom'
import { categories, categoryIcons, tools } from '../registry/tools'
import { usePreferences } from '../storage/preferences'
import { FavoriteButton, ToolGrid } from '../components/ToolCard'
import { compatibleTools, dashboardDiscovery } from '../registry/discovery'
import { useWorkspace } from '../workspace/workspaceStore'
import { formatBytes } from '../workspace/workspaceUtils'

export default function Dashboard() {
  const { openSearch, shortcut } = useOutletContext<{ openSearch: () => void; shortcut: string }>()
  const prefs = usePreferences()
  const snapshot = useWorkspace()
  const discovery = dashboardDiscovery(prefs)
  const quickTools = ['json', 'image-converter', 'image-compressor', 'pdf-merger', 'qr'].flatMap(
    (id) => tools.filter((tool) => tool.id === id),
  )
  const favoriteTools = tools.filter((tool) => prefs.favorites.includes(tool.id))
  const recentTools = prefs.recent
    .flatMap((id) => tools.filter((tool) => tool.id === id))
    .slice(0, 4)
  const recentFiles = [...snapshot.files].sort((a, b) => b.createdAt - a.createdAt).slice(0, 3)
  return (
    <div className="dashboard page-enter">
      <header className="dashboard-header">
        <div>
          <div className="eyebrow">YOUR LOCAL WORKSPACE</div>
          <h1>Less friction. More flow.</h1>
          <p className="page-description">{tools.length} tools for the work between the work.</p>
        </div>
        <span className="local-badge">
          <ShieldCheck size={14} /> Private by design
        </span>
      </header>
      <button className="dashboard-search" onClick={openSearch}>
        <Search size={21} />
        <span>
          <strong>Find a tool. Pick up a file.</strong>
          <span>Search tools, Workspace files, and actions</span>
        </span>
        <kbd>{shortcut} K</kbd>
      </button>
      <div className="dashboard-columns">
        <div className="dashboard-primary">
          <section className="dashboard-section" aria-label="Continue working">
            <div className="section-heading">
              <h2>Continue working</h2>
              <Link to="/workspace">
                Open Workspace <ArrowRight size={14} />
              </Link>
            </div>
            {!snapshot.error && !!recentFiles.length ? (
              <div className="continue-files">
                {recentFiles.map((file) => (
                  <article className="continue-file" key={file.id}>
                    <File size={20} />
                    <div>
                      <h3 className="file-name">
                        {file.pinned && '★ '}
                        {file.name}
                      </h3>
                      <p className="helper-text">
                        {file.mimeType} · {formatBytes(file.size)} ·{' '}
                        {tools.find((tool) => tool.id === file.sourceTool)?.name ??
                          'Imported from device'}
                      </p>
                      <div className="related-links">
                        <Link to={`/workspace?file=${encodeURIComponent(file.id)}`}>Open file</Link>
                        {compatibleTools(file.mimeType)
                          .slice(0, 2)
                          .map((tool) => (
                            <Link
                              key={tool.id}
                              to={`${tool.path}?file=${encodeURIComponent(file.id)}`}
                            >
                              {tool.name}
                              <ArrowUpRight size={13} />
                            </Link>
                          ))}
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            ) : (
              <div className="dashboard-empty">
                <FolderOpen size={23} />
                <div>
                  <h3>
                    {snapshot.error ? 'Workspace is unavailable' : 'A place for your next project'}
                  </h3>
                  <p>
                    {snapshot.error
                      ? 'Open Workspace to review the storage error.'
                      : 'Import a file or save a tool result. Continue from here.'}
                  </p>
                </div>
                <Link to="/workspace" className="button button-secondary">
                  Open Workspace
                </Link>
              </div>
            )}
          </section>
          <section className="dashboard-section" aria-label="Recent tools">
            <div className="section-heading">
              <h2>Recently used</h2>
              <Link to="/recent">
                View history <ArrowRight size={14} />
              </Link>
            </div>
            {recentTools.length ? (
              <div className="recent-grid">
                {recentTools.map((tool) => {
                  const Icon = tool.icon
                  return (
                    <Link to={tool.path} key={tool.id} className="recent-item">
                      <span className={`tool-icon small ${tool.color}`}>
                        <Icon size={18} />
                      </span>
                      <div>
                        <strong>{tool.name}</strong>
                        <span>{tool.category}</span>
                      </div>
                      <ArrowUpRight size={14} />
                    </Link>
                  )
                })}
              </div>
            ) : (
              <div className="recent-empty">
                <Clock3 size={18} />
                <p>The tools you open will appear here.</p>
              </div>
            )}
          </section>
          <section className="dashboard-section" aria-label="Favorite tools">
            <div className="section-heading">
              <h2>
                Your favorites <span className="count-pill">{favoriteTools.length}</span>
              </h2>
              <Link to="/favorites">
                View favorites <ArrowRight size={14} />
              </Link>
            </div>
            {favoriteTools.length ? (
              <ToolGrid items={favoriteTools.slice(0, 6)} compact />
            ) : (
              <div className="dashboard-empty">
                <Star size={23} />
                <div>
                  <h3>Your go-to tools, one click away</h3>
                  <p>Star a tool to pin it here and in your sidebar.</p>
                </div>
                <Link className="button button-secondary" to="/tools">
                  Explore tools
                </Link>
              </div>
            )}
          </section>
          <section className="dashboard-section" aria-label="Quick actions">
            <div className="section-heading">
              <h2>Quick actions</h2>
            </div>
            <div className="quick-actions">
              {quickTools.map((tool) => {
                const Icon = tool.icon
                return (
                  <Link key={tool.id} to={tool.path}>
                    <Icon size={17} />
                    <span>{tool.name}</span>
                    <ArrowUpRight size={13} />
                  </Link>
                )
              })}
              <Link to="/workspace">
                <FolderOpen size={17} />
                <span>Open Workspace</span>
                <ArrowUpRight size={13} />
              </Link>
            </div>
          </section>
        </div>
        <div className="dashboard-secondary">
          <section className="dashboard-section discovery-section" aria-label={discovery.title}>
            <div className="section-heading">
              <h2>{discovery.title}</h2>
              <span className="subtle-label">
                {discovery.title === 'Most used' ? 'On this device' : 'Start here'}
              </span>
            </div>
            <ol className="discovery-list">
              {discovery.items.map((tool, index) => {
                const Icon = tool.icon
                return (
                  <li key={tool.id}>
                    <Link to={tool.path}>
                      <span className="discovery-rank">{String(index + 1).padStart(2, '0')}</span>
                      <Icon size={17} />
                      <span>{tool.name}</span>
                    </Link>
                    <FavoriteButton tool={tool} />
                  </li>
                )
              })}
            </ol>
          </section>
          <section className="dashboard-section workspace-summary" aria-label="Workspace summary">
            <div className="section-heading">
              <h2>
                <FolderOpen size={17} /> Workspace
              </h2>
              <Link to="/workspace">
                Manage <ArrowRight size={14} />
              </Link>
            </div>
            <dl className="workspace-stats">
              <div>
                <dt>Saved files</dt>
                <dd>{snapshot.error ? '—' : snapshot.loading ? '…' : snapshot.files.length}</dd>
              </div>
              <div>
                <dt>File storage</dt>
                <dd>
                  {snapshot.error
                    ? 'Unavailable'
                    : formatBytes(snapshot.files.reduce((sum, file) => sum + file.size, 0))}
                </dd>
              </div>
            </dl>
            <p className="helper-text">
              Stored in this browser. Download important files to keep a backup.
            </p>
            <Link className="button button-secondary" to="/workspace">
              Import or manage files <ArrowRight size={14} />
            </Link>
          </section>
        </div>
      </div>
      <section className="dashboard-section" aria-label="Tool categories">
        <div className="section-heading">
          <h2>Browse by category</h2>
          <Link to="/tools">
            All {tools.length} tools <ArrowRight size={14} />
          </Link>
        </div>
        <div className="category-grid">
          {categories
            .filter((category) => tools.some((tool) => tool.category === category))
            .map((category) => {
              const Icon = categoryIcons[category]
              const count = tools.filter((tool) => tool.category === category).length
              return (
                <Link key={category} to={`/category/${category.toLowerCase()}`}>
                  <Icon size={19} />
                  <strong>{category}</strong>
                  <span>{count} tools</span>
                  <ArrowUpRight size={14} />
                </Link>
              )
            })}
        </div>
      </section>
    </div>
  )
}
