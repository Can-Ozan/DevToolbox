import { Suspense, useEffect } from 'react'
import { Link, useParams } from 'react-router-dom'
import { ArrowLeft, ShieldCheck } from 'lucide-react'
import { tools } from '../registry/tools'
import { preferences } from '../storage/preferences'
import { FavoriteButton } from '../components/ToolCard'
import NotFound from './NotFound'

export default function ToolPage() {
  const { id } = useParams()
  const tool = tools.find((item) => item.id === id)
  useEffect(() => {
    if (tool) preferences.visit(tool.id)
  }, [tool])
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
    </div>
  )
}
