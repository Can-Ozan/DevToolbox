import type { ReactNode } from 'react'
import { ArrowLeft, ChevronRight, ShieldCheck } from 'lucide-react'
import { Link } from 'react-router-dom'
import type { ToolDefinition } from '../registry/tools'
import { FavoriteButton } from './ToolCard'

export function PageHeader({
  title,
  description,
  eyebrow,
  actions,
}: {
  title: string
  description: string
  eyebrow?: string
  actions?: ReactNode
}) {
  return (
    <header className="page-header">
      <div>
        {eyebrow && <div className="eyebrow">{eyebrow}</div>}
        <h1>{title}</h1>
        <p className="page-description">{description}</p>
      </div>
      {actions && <div className="page-header-actions">{actions}</div>}
    </header>
  )
}

export function ToolHeader({ tool }: { tool: ToolDefinition }) {
  const Icon = tool.icon
  return (
    <>
      <nav className="tool-breadcrumb" aria-label="Tool breadcrumb">
        <Link to="/tools">
          <ArrowLeft size={14} /> All tools
        </Link>
        <ChevronRight size={13} />
        <Link to={`/category/${tool.category.toLowerCase()}`}>{tool.category}</Link>
      </nav>
      <header className="tool-page-heading">
        <span className={`tool-icon large ${tool.color}`}>
          <Icon size={24} />
        </span>
        <div className="tool-heading-copy">
          <h1>{tool.name}</h1>
          <p className="page-description">{tool.description}</p>
          <div className="tool-meta">
            <span>
              <ShieldCheck size={13} /> Runs locally
            </span>
            {tool.workspaceCompatible && <span>Workspace compatible</span>}
          </div>
        </div>
        <FavoriteButton tool={tool} />
      </header>
    </>
  )
}

// Keep toolbar groups flexible: tools have different controls and processing flows.
export function ToolToolbar({ children }: { children: ReactNode }) {
  return <div className="tool-toolbar">{children}</div>
}

export function ToolActions({
  children,
  label = 'Tool actions',
}: {
  children: ReactNode
  label?: string
}) {
  return (
    <div className="tool-actions" role="group" aria-label={label}>
      {children}
    </div>
  )
}

export function ToolSection({
  title,
  actions,
  children,
}: {
  title: string
  actions?: ReactNode
  children: ReactNode
}) {
  return (
    <section className="tool-section">
      <div className="editor-heading">
        <h2>{title}</h2>
        {actions}
      </div>
      <div className="tool-section-body">{children}</div>
    </section>
  )
}

export function ToolTabs<T extends string>({
  label,
  value,
  options,
  onChange,
  disabled = false,
}: {
  label: string
  value: T
  options: readonly { value: T; label: string }[]
  onChange: (value: T) => void
  disabled?: boolean
}) {
  return (
    <div className="tool-tabs" role="group" aria-label={label}>
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          disabled={disabled}
          aria-pressed={value === option.value}
          onClick={() => onChange(option.value)}
        >
          {option.label}
        </button>
      ))}
    </div>
  )
}
