import { Suspense, useEffect, useRef } from 'react'
import { Link, useParams, useLocation } from 'react-router-dom'
import { ArrowLeft, ShieldCheck } from 'lucide-react'
import { tools } from '../registry/tools'
import { preferences } from '../storage/preferences'
import { FavoriteButton } from '../components/ToolCard'
import NotFound from './NotFound'
import { relatedTools } from '../registry/discovery'

export default function ToolPage() {
  const { id } = useParams()
  const tool = tools.find((item) => item.id === id)
  const { key } = useLocation()
  const counted = useRef<string | undefined>(undefined)
  useEffect(() => {
    if (tool && counted.current !== `${key}:${tool.id}`) {
      counted.current = `${key}:${tool.id}`
      preferences.visit(tool.id)
    }
  }, [tool, key])
  if (!tool) return <NotFound />
  const Icon = tool.icon
  const Tool = tool.component
  return (
    <div className="tool-page page-enter">
      <Link className="back-link" to="/tools">
        <ArrowLeft size={15} />
        All tools
      </Link>
      <div className="tool-page-heading">
        <span className={`tool-icon large ${tool.color}`}>
          <Icon size={29} />
        </span>
        <div>
          <span className="eyebrow">{tool.category}</span>
          <h1>{tool.name}</h1>
          <p className="page-description">{tool.description}</p>
        </div>
        <FavoriteButton tool={tool} />
      </div>
      <Suspense
        fallback={
          <div className="loading-state" role="status">
            Opening your tool…
          </div>
        }
      >
        <Tool key={tool.id} />
      </Suspense>
      <div className="tool-privacy">
        <ShieldCheck size={15} />
        Processed locally in your browser. Your inputs are never uploaded.
      </div>
      <section className="related-tools" aria-label="Related tools">
        <h2>Related tools</h2>
        <div className="related-links">
          {relatedTools(tool).map((item) => (
            <Link key={item.id} to={item.path}>
              {item.name}
            </Link>
          ))}
        </div>
      </section>
    </div>
  )
}
