import { Suspense, useEffect, useRef } from 'react'
import { Link, useParams, useLocation } from 'react-router-dom'
import { ArrowUpRight, ShieldCheck } from 'lucide-react'
import { tools } from '../registry/tools'
import { preferences } from '../storage/preferences'
import { ToolHeader } from '../components/ToolLayout'
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
  const Tool = tool.component
  return (
    <div className="tool-page page-enter">
      <ToolHeader tool={tool} />
      <div className="tool-workbench">
        <Suspense
          fallback={
            <div className="loading-state" role="status">
              Opening your tool…
            </div>
          }
        >
          <Tool key={tool.id} />
        </Suspense>
      </div>
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
              <ArrowUpRight size={14} />
            </Link>
          ))}
        </div>
      </section>
    </div>
  )
}
