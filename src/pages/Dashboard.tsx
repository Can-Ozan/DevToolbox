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
} from 'lucide-react'
import { Link, useOutletContext } from 'react-router-dom'
import { tools } from '../registry/tools'
import { usePreferences } from '../storage/preferences'
import { ToolGrid } from '../components/ToolCard'

export default function Dashboard() {
  const { openSearch, shortcut } = useOutletContext<{ openSearch: () => void; shortcut: string }>()
  const { favorites, recent } = usePreferences()
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
          <p className="page-description">A little less friction. A little more building.</p>
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
          <span>Search developer tools…</span>
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
            <Star size={18} />
          </span>
          <strong>{favorites.length}</strong>
          <span>favorites</span>
        </div>
        <div>
          <span className="stat-icon green">
            <ShieldCheck size={18} />
          </span>
          <strong>100%</strong>
          <span>browser-side processing</span>
        </div>
      </div>
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
            <h2>Popular tools</h2>
            <span className="subtle-label">A good place to start</span>
          </div>
          <Link to="/tools">
            View all tools <ArrowRight size={15} />
          </Link>
        </div>
        <ToolGrid items={tools.slice(0, 6)} />
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
