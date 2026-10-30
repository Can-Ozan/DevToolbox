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

import { useTranslation } from 'react-i18next'
import { currentLanguage, getToolText, getCategoryLabel } from '../i18n/toolLabels'

export default function Dashboard() {
  const { t } = useTranslation()
  const language = currentLanguage()
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
          <div className="eyebrow">{t('discovery.eyebrow')}</div>
          <h1>{t('discovery.title')}</h1>
          <p className="page-description">{t('discovery.description', { count: tools.length })}</p>
        </div>
        <span className="local-badge">
          <ShieldCheck size={14} /> {t('shell.private')}
        </span>
      </header>
      <button className="dashboard-search" onClick={openSearch}>
        <Search size={21} />
        <span>
          <strong>{t('discovery.findTitle')}</strong>
          <span>{t('discovery.findDescription')}</span>
        </span>
        <kbd>{shortcut} K</kbd>
      </button>
      <div className="dashboard-columns">
        <div className="dashboard-primary">
          <section className="dashboard-section" aria-label={t('discovery.continue')}>
            <div className="section-heading">
              <h2>{t('discovery.continue')}</h2>
              <Link to="/workspace">
                {t('discovery.openWorkspace')} <ArrowRight size={14} />
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
                        {tools.find((tool) => tool.id === file.sourceTool)
                          ? getToolText(
                              tools.find((tool) => tool.id === file.sourceTool)!,
                              language,
                            ).name
                          : t('discovery.imported')}
                      </p>
                      <div className="related-links">
                        <Link to={`/workspace?file=${encodeURIComponent(file.id)}`}>
                          {t('discovery.openFile')}
                        </Link>
                        {compatibleTools(file.mimeType)
                          .slice(0, 2)
                          .map((tool) => (
                            <Link
                              key={tool.id}
                              to={`${tool.path}?file=${encodeURIComponent(file.id)}`}
                            >
                              {getToolText(tool, language).name}
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
                  <h3>{t(snapshot.error ? 'discovery.unavailable' : 'discovery.nextProject')}</h3>
                  <p>{snapshot.error ? t('discovery.storageError') : t('discovery.importHelp')}</p>
                </div>
                <Link to="/workspace" className="button button-secondary">
                  {t('discovery.openWorkspace')}
                </Link>
              </div>
            )}
          </section>
          <section className="dashboard-section" aria-label={t('discovery.recentLabel')}>
            <div className="section-heading">
              <h2>{t('discovery.recentlyUsed')}</h2>
              <Link to="/recent">
                {t('discovery.viewHistory')} <ArrowRight size={14} />
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
                        <strong>{getToolText(tool, language).name}</strong>
                        <span>{getCategoryLabel(tool.category, language)}</span>
                      </div>
                      <ArrowUpRight size={14} />
                    </Link>
                  )
                })}
              </div>
            ) : (
              <div className="recent-empty">
                <Clock3 size={18} />
                <p>{t('discovery.recentEmpty')}</p>
              </div>
            )}
          </section>
          <section className="dashboard-section" aria-label={t('settings.favoriteTools')}>
            <div className="section-heading">
              <h2>
                {t('discovery.favorites')}{' '}
                <span className="count-pill">{favoriteTools.length}</span>
              </h2>
              <Link to="/favorites">
                {t('discovery.viewFavorites')} <ArrowRight size={14} />
              </Link>
            </div>
            {favoriteTools.length ? (
              <ToolGrid items={favoriteTools.slice(0, 6)} compact />
            ) : (
              <div className="dashboard-empty">
                <Star size={23} />
                <div>
                  <h3>{t('discovery.favoritesTitle')}</h3>
                  <p>{t('discovery.favoritesHelp')}</p>
                </div>
                <Link className="button button-secondary" to="/tools">
                  {t('discovery.explore')}
                </Link>
              </div>
            )}
          </section>
          <section className="dashboard-section" aria-label={t('discovery.quickActions')}>
            <div className="section-heading">
              <h2>{t('discovery.quickActions')}</h2>
            </div>
            <div className="quick-actions">
              {quickTools.map((tool) => {
                const Icon = tool.icon
                return (
                  <Link key={tool.id} to={tool.path}>
                    <Icon size={17} />
                    <span>{getToolText(tool, language).name}</span>
                    <ArrowUpRight size={13} />
                  </Link>
                )
              })}
              <Link to="/workspace">
                <FolderOpen size={17} />
                <span>{t('discovery.openWorkspace')}</span>
                <ArrowUpRight size={13} />
              </Link>
            </div>
          </section>
        </div>
        <div className="dashboard-secondary">
          <section
            className="dashboard-section discovery-section"
            aria-label={t(
              discovery.title === 'Most used' ? 'discovery.mostUsed' : 'discovery.featured',
            )}
          >
            <div className="section-heading">
              <h2>
                {t(discovery.title === 'Most used' ? 'discovery.mostUsed' : 'discovery.featured')}
              </h2>
              <span className="subtle-label">
                {t(discovery.title === 'Most used' ? 'discovery.onDevice' : 'discovery.startHere')}
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
                      <span>{getToolText(tool, language).name}</span>
                    </Link>
                    <FavoriteButton tool={tool} />
                  </li>
                )
              })}
            </ol>
          </section>
          <section
            className="dashboard-section workspace-summary"
            aria-label={t('discovery.workspaceSummary')}
          >
            <div className="section-heading">
              <h2>
                <FolderOpen size={17} /> {t('shell.workspace')}
              </h2>
              <Link to="/workspace">
                {t('discovery.manage')} <ArrowRight size={14} />
              </Link>
            </div>
            <dl className="workspace-stats">
              <div>
                <dt>{t('discovery.savedFiles')}</dt>
                <dd>{snapshot.error ? '—' : snapshot.loading ? '…' : snapshot.files.length}</dd>
              </div>
              <div>
                <dt>{t('discovery.fileStorage')}</dt>
                <dd>
                  {snapshot.error
                    ? t('discovery.unavailableValue')
                    : formatBytes(snapshot.files.reduce((sum, file) => sum + file.size, 0))}
                </dd>
              </div>
            </dl>
            <p className="helper-text">{t('discovery.backupHelp')}</p>
            <Link className="button button-secondary" to="/workspace">
              {t('discovery.manageFiles')} <ArrowRight size={14} />
            </Link>
          </section>
        </div>
      </div>
      <section className="dashboard-section" aria-label={t('shell.categories')}>
        <div className="section-heading">
          <h2>{t('discovery.browseCategory')}</h2>
          <Link to="/tools">
            {t('discovery.allCount', { count: tools.length })} <ArrowRight size={14} />
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
                  <strong>{getCategoryLabel(category, language)}</strong>
                  <span>{t('discovery.tools', { count })}</span>
                  <ArrowUpRight size={14} />
                </Link>
              )
            })}
        </div>
      </section>
    </div>
  )
}
