import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button, Message } from '../../components/ui'
import { WorkspaceFilePicker, useFileJob } from '../../workspace/FileControls'
import type { FileInput } from '../../workspace/workspaceTypes'
import { workspace } from '../../workspace/workspaceStore'
import { fileError, formatBytes } from '../../workspace/workspaceUtils'
import { inspectFile, type Inspection } from './inspection'
import { inspectionTools } from '../../registry/discovery'

export default function FileInspector() {
  const [file, setFile] = useState<FileInput>()
  const job = useFileJob<Inspection>()
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const current = useRef<FileInput | undefined>(undefined)
  const navigate = useNavigate()
  useEffect(
    () => () => {
      current.current = undefined
    },
    [],
  )
  function clear() {
    current.current = undefined
    setFile(undefined)
    setError('')
    job.reset()
  }
  async function open(path: string) {
    if (!file || !job.output?.valid || saving) return
    const version = file
    setSaving(true)
    setError('')
    try {
      // Reuse persisted input when its MIME is already correct. Signature-detected
      // files with a different reported MIME get an explicit, compatible copy.
      let id =
        'id' in file && typeof file.id === 'string' && file.blob.type === job.output.mimeType
          ? file.id
          : undefined
      if (!id) {
        const [saved] = await workspace.add([
          { ...file, blob: file.blob.slice(0, file.blob.size, job.output.mimeType) },
        ])
        id = saved.id
      }
      if (current.current === version) navigate(`${path}?file=${encodeURIComponent(id)}`)
    } catch (reason) {
      if (current.current === version) setError(fileError(reason))
    } finally {
      setSaving(false)
    }
  }
  const result = job.output
  const recommendations = file && result ? inspectionTools(file.name, result) : []
  return (
    <>
      <WorkspaceFilePicker
        disabled={job.busy || saving}
        onSelect={([selected]) => {
          current.current = selected
          setFile(selected)
          setError('')
          void job.run((signal) => inspectFile(selected, signal))
        }}
      />
      {file && (
        <div className="actions">
          <Button disabled={saving} onClick={clear}>
            {job.busy ? 'Cancel inspection' : 'Clear file'}
          </Button>
        </div>
      )}
      {job.busy && <p role="status">Inspecting locally…</p>}
      {(error || job.error) && <Message kind="error">{error || job.error}</Message>}
      {file && (
        <section className="panel file-output" aria-label="File inspection">
          <h2>File details</h2>
          <dl className="result-stats">
            {(
              [
                ['Filename', file.name],
                ['Extension', /\.([^.]+)$/.exec(file.name)?.[1].toLowerCase() ?? 'None'],
                ['Reported MIME', file.blob.type || 'Not provided'],
                [
                  'Size',
                  `${formatBytes(file.blob.size)} (${file.blob.size.toLocaleString()} bytes)`,
                ],
                [
                  'Last modified',
                  file.lastModified &&
                  Number.isFinite(file.lastModified) &&
                  file.lastModified <= 8.64e15
                    ? new Date(file.lastModified).toLocaleString()
                    : 'Not available',
                ],
                ...(result ? [['Detected type', result.mimeType], ...result.details] : []),
              ] as [string, string][]
            ).map(([label, value]) => (
              <div key={label}>
                <dt>{label}</dt>
                <dd>{value}</dd>
              </div>
            ))}
          </dl>
          {result && <p className="helper-text">{result.detection}</p>}
          {result?.warning && <Message kind="warning">{result.warning}</Message>}
          {result?.valid && (
            <Message kind="success">Inspection complete. Your file stays on this device.</Message>
          )}
        </section>
      )}
      {!!recommendations.length && (
        <section className="panel file-output" aria-label="Recommended tools">
          <h2>Continue with a compatible tool</h2>
          <p className="helper-text">
            Workspace files are reused. Device inputs are saved to Workspace when you choose a tool.
          </p>
          {recommendations.map(({ tool, reason }) => (
            <div className="inspection-recommendation" key={tool.id}>
              <Button
                disabled={saving}
                onClick={() => {
                  void open(tool.path)
                }}
              >
                Open {tool.name}
              </Button>
              <p className="helper-text">{reason}</p>
            </div>
          ))}
        </section>
      )}
      <p className="helper-text">
        Signature and format checks are deterministic, not a security scan. PNG, JPEG, WebP, PDF,
        JSON and ZIP are inspected within the existing file limits. Other formats show metadata
        only. No uploads or network lookups.
      </p>
    </>
  )
}
