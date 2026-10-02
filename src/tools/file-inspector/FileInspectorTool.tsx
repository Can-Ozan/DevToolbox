import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { FileSearch } from 'lucide-react'
import { Button, Message } from '../../components/ui'
import { tools } from '../../registry/tools'

type Inspection = {
  name: string
  size: number
  mime: string
  extension: string
  modified: string
  preview: string
}

export default function FileInspectorTool() {
  const [inspection, setInspection] = useState<Inspection | null>(null)
  const [error, setError] = useState('')

  const recommendations = useMemo(() => {
    if (!inspection) return []
    const mimeMatches = tools.filter((tool) => tool.acceptsFileTypes?.includes(inspection.mime))
    const byExtension: Record<string, string[]> = {
      json: ['json', 'json-csv', 'json-yaml', 'diff'],
      csv: ['json-csv', 'diff'],
      yaml: ['json-yaml', 'diff'],
      yml: ['json-yaml', 'diff'],
      pdf: ['pdf-merger', 'pdf-splitter', 'pdf-reorder', 'pdf-to-images'],
      png: ['image-converter', 'image-compressor', 'image-resizer', 'image-cropper', 'image-metadata'],
      jpg: ['image-converter', 'image-compressor', 'image-resizer', 'image-cropper', 'image-metadata'],
      jpeg: ['image-converter', 'image-compressor', 'image-resizer', 'image-cropper', 'image-metadata'],
      webp: ['image-converter', 'image-compressor', 'image-resizer', 'image-cropper', 'image-metadata'],
      md: ['markdown', 'diff'],
      txt: ['diff', 'case', 'base64'],
    }
    const ids = new Set([...mimeMatches.map((tool) => tool.id), ...(byExtension[inspection.extension] ?? [])])
    return tools.filter((tool) => ids.has(tool.id)).slice(0, 8)
  }, [inspection])

  async function inspect(file?: File) {
    if (!file) return
    setError('')
    try {
      const extension = file.name.includes('.') ? file.name.split('.').pop()?.toLowerCase() ?? '' : ''
      const textLike =
        file.type.startsWith('text/') ||
        ['json', 'csv', 'yaml', 'yml', 'md', 'txt', 'xml', 'js', 'ts', 'tsx', 'jsx'].includes(extension)
      const preview = textLike ? (await file.slice(0, 4096).text()).slice(0, 1200) : ''
      setInspection({
        name: file.name,
        size: file.size,
        mime: file.type || 'Unknown',
        extension: extension || 'None',
        modified: new Date(file.lastModified).toLocaleString(),
        preview,
      })
    } catch {
      setInspection(null)
      setError('This file could not be inspected in the browser.')
    }
  }

  return (
    <>
      <label className="panel" style={{ display: 'block', cursor: 'pointer' }}>
        <div className="empty-state compact">
          <FileSearch size={28} />
          <h3>Drop or choose any file</h3>
          <p>DevToolbox detects its type and recommends useful local tools.</p>
          <input
            type="file"
            onChange={(event) => void inspect(event.target.files?.[0])}
            style={{ maxWidth: 320 }}
          />
        </div>
      </label>

      {error && <Message kind="error">{error}</Message>}

      {inspection && (
        <>
          <dl className="data-table">
            <div><dt>Name</dt><dd>{inspection.name}</dd></div>
            <div><dt>Type</dt><dd>{inspection.mime}</dd></div>
            <div><dt>Extension</dt><dd>.{inspection.extension}</dd></div>
            <div><dt>Size</dt><dd>{new Intl.NumberFormat().format(inspection.size)} bytes</dd></div>
            <div><dt>Last modified</dt><dd>{inspection.modified}</dd></div>
          </dl>

          {inspection.preview && (
            <>
              <div className="output-title"><h2>Safe text preview</h2></div>
              <pre className="code-output">{inspection.preview}</pre>
            </>
          )}

          <div className="output-title"><h2>Recommended tools</h2></div>
          {recommendations.length ? (
            <div className="quick-actions">
              {recommendations.map((tool) => (
                <Link key={tool.id} to={tool.path}>{tool.name}</Link>
              ))}
            </div>
          ) : (
            <Message kind="info">No specialized tool matched yet. The file stayed on your device.</Message>
          )}

          <div className="actions">
            <Button onClick={() => setInspection(null)}>Inspect another file</Button>
          </div>
        </>
      )}
    </>
  )
}
