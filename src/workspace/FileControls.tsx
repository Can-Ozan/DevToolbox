import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { Check, Download, FolderOpen, Plus, Save, Upload } from 'lucide-react'
import { Button, Message, Modal } from '../components/ui'
import { nextTools } from '../registry/discovery'
import type { ProcessingStage, ReportStage } from '../lib/processing'
import { workspace, useWorkspace, refreshWorkspace } from './workspaceStore'
import type { FileInput, FileOutput } from './workspaceTypes'
import {
  acceptsFile,
  downloadFile,
  fileError,
  formatBytes,
  fromDevice,
  validateBatch,
} from './workspaceUtils'

export { compatibleTools } from '../registry/discovery'

export function useObjectURL(blob?: Blob) {
  const [value, setValue] = useState<{ blob: Blob; url: string }>()
  useEffect(() => {
    if (!blob) {
      setValue(undefined)
      return
    }
    const url = URL.createObjectURL(blob)
    setValue({ blob, url })
    return () => URL.revokeObjectURL(url)
  }, [blob])
  return value?.blob === blob ? value?.url : undefined
}

export function WorkspaceFilePicker({
  accepted,
  multiple = false,
  disabled = false,
  onSelect,
  deviceLabel = 'Upload from device',
  includeWorkspace = true,
}: {
  accepted?: readonly string[]
  multiple?: boolean
  disabled?: boolean
  onSelect: (files: FileInput[]) => void
  deviceLabel?: string
  includeWorkspace?: boolean
}) {
  const input = useRef<HTMLInputElement>(null)
  const [open, setOpen] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [selected, setSelected] = useState<string[]>([])
  const [drag, setDrag] = useState<'valid' | 'invalid' | ''>('')
  const snapshot = useWorkspace()
  const [params] = useSearchParams()
  const requested = includeWorkspace ? params.get('file') : null
  const selectRef = useRef(onSelect)
  useEffect(() => {
    selectRef.current = onSelect
  }, [onSelect])
  const acceptedKey = accepted?.join(',') ?? ''
  useEffect(() => {
    if (!requested) return
    let active = true
    setLoading(true)
    void workspace
      .get(requested)
      .then((file) => {
        validateBatch([file], acceptedKey ? acceptedKey.split(',') : undefined)
        if (active) {
          selectRef.current([file])
          setError('')
        }
      })
      .catch((reason) => {
        if (active) setError(fileError(reason))
      })
      .finally(() => {
        if (active) setLoading(false)
      })
    return () => {
      active = false
    }
  }, [requested, acceptedKey])

  function choose(files: FileInput[]) {
    try {
      if (!multiple && files.length !== 1) throw new Error('Choose one file for this tool.')
      validateBatch(files, accepted)
      onSelect(files)
      setError('')
      setOpen(false)
      setSelected([])
    } catch (reason) {
      setError(fileError(reason))
    }
  }
  async function fromWorkspace(ids: string[]) {
    setLoading(true)
    try {
      choose(await Promise.all(ids.map((id) => workspace.get(id))))
    } catch (reason) {
      setError(fileError(reason))
    } finally {
      setLoading(false)
    }
  }
  const matching = snapshot.files.filter((file) => acceptsFile(file.mimeType, accepted))
  return (
    <section
      className={`file-picker ${drag ? `drop-${drag}` : ''}`}
      aria-label="Input source"
      onDragOver={(event) => {
        event.preventDefault()
        if (disabled || loading) return
        const items = Array.from(event.dataTransfer.items).filter((item) => item.kind === 'file')
        const invalid =
          (!multiple && items.length > 1) ||
          items.some((item) => item.type && !acceptsFile(item.type, accepted))
        setDrag(invalid ? 'invalid' : 'valid')
        event.dataTransfer.dropEffect = invalid ? 'none' : 'copy'
      }}
      onDragLeave={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setDrag('')
      }}
      onDrop={(event) => {
        event.preventDefault()
        setDrag('')
        if (!disabled && !loading) choose(Array.from(event.dataTransfer.files, fromDevice))
      }}
    >
      <div className="drop-prompt">
        <Upload size={25} />
        <strong>{multiple ? 'Drop your files here' : 'Drop your file here'}</strong>
        <span className="helper-text">
          {accepted?.map((type) => type.split('/')[1].toUpperCase()).join(', ') ??
            'Files stay in your local Workspace'}
        </span>
      </div>
      {drag === 'invalid' && (
        <Message kind="error">
          This file type or number of files is not supported here. Your current input is unchanged.
        </Message>
      )}
      <div className="actions">
        <input
          ref={input}
          type="file"
          aria-label={deviceLabel}
          hidden
          accept={accepted?.join(',')}
          multiple={multiple}
          disabled={disabled || loading}
          onChange={(event) => {
            const files = Array.from(event.target.files ?? [], fromDevice)
            event.target.value = ''
            if (files.length) choose(files)
          }}
        />
        <Button disabled={disabled || loading} onClick={() => input.current?.click()}>
          <Plus size={16} />
          {deviceLabel}
        </Button>
        {includeWorkspace && (
          <Button
            disabled={disabled || loading}
            onClick={() => {
              setOpen(true)
              setError('')
              void refreshWorkspace()
            }}
          >
            <FolderOpen size={16} />
            Choose from Workspace
          </Button>
        )}
      </div>
      <p className="helper-text">
        {loading
          ? 'Opening file…'
          : 'Or drop files here. Files are processed locally in your browser.'}
      </p>
      {error && !open && <Message kind="error">{error}</Message>}
      {includeWorkspace && (
        <Modal open={open} onClose={() => setOpen(false)} title="Choose from Workspace">
          <p className="helper-text">
            Only compatible files are shown. Files stay in this browser.
          </p>
          {(error || snapshot.error) && <Message kind="error">{error || snapshot.error}</Message>}
          {snapshot.warning && <Message kind="warning">{snapshot.warning}</Message>}
          {snapshot.loading ? (
            <p role="status">Loading files…</p>
          ) : (
            !matching.length && (
              <p>No compatible files yet. Import a file or save an output first.</p>
            )
          )}
          <div className="workspace-picker-list">
            {matching.map((file) => (
              <div className="workspace-picker-row" key={file.id}>
                {multiple ? (
                  <label className="checkbox-label">
                    <input
                      type="checkbox"
                      checked={selected.includes(file.id)}
                      disabled={loading}
                      onChange={(event) =>
                        setSelected(
                          event.target.checked
                            ? [...selected, file.id]
                            : selected.filter((id) => id !== file.id),
                        )
                      }
                    />
                    <span>
                      {file.name} <small>{formatBytes(file.size)}</small>
                    </span>
                  </label>
                ) : (
                  <Button
                    disabled={loading}
                    onClick={() => {
                      void fromWorkspace([file.id])
                    }}
                  >
                    Use {file.name} · {formatBytes(file.size)}
                  </Button>
                )}
              </div>
            ))}
          </div>
          <div className="actions">
            {multiple && (
              <Button
                variant="primary"
                disabled={!selected.length || loading}
                onClick={() => {
                  void fromWorkspace(selected)
                }}
              >
                Use selected files
              </Button>
            )}
            <Button
              onClick={() => {
                void refreshWorkspace()
              }}
            >
              Refresh files
            </Button>
            <Button onClick={() => setOpen(false)}>Cancel</Button>
          </div>
        </Modal>
      )}
    </section>
  )
}

export function FileOutputPanel({
  output,
  image = false,
}: {
  output: FileOutput
  image?: boolean
}) {
  const url = useObjectURL(image ? output.blob : undefined)
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState<{ id: string; name: string }>()
  const navigate = useNavigate()
  const savingRef = useRef(false)
  const following = nextTools(output.sourceTool, output.blob.type)
  const current = useRef<FileOutput | undefined>(output)
  useEffect(() => {
    current.current = output
    setSaved(undefined)
    setError('')
    return () => {
      current.current = undefined
    }
  }, [output])
  async function save(path?: string) {
    if (savingRef.current) return
    if (saved) {
      if (path) navigate(`${path}?file=${encodeURIComponent(saved.id)}`)
      return
    }
    const version = output
    savingRef.current = true
    setSaving(true)
    setError('')
    try {
      const [file] = await workspace.add([output])
      if (current.current === version) {
        setSaved(file)
        if (path) navigate(`${path}?file=${encodeURIComponent(file.id)}`)
      }
    } catch (reason) {
      if (current.current === version) setError(fileError(reason))
    } finally {
      savingRef.current = false
      setSaving(false)
    }
  }
  return (
    <section className="panel file-output" aria-label="File output">
      <h2 className="result-heading">
        <Check size={22} /> Completed
      </h2>
      <p className="file-name">{output.name}</p>
      <p className="helper-text">
        {formatBytes(output.blob.size)} · {output.blob.type}
        {output.detail ? ` · ${output.detail}` : ''}
      </p>
      {url && <img className="file-preview" src={url} alt="Output preview" />}
      {output.originalSize !== undefined && (
        <dl className="result-stats">
          <div>
            <dt>Original</dt>
            <dd>{formatBytes(output.originalSize)}</dd>
          </div>
          <div>
            <dt>Output</dt>
            <dd>{formatBytes(output.blob.size)}</dd>
          </div>
          {output.originalSize > 0 && (
            <div>
              <dt>Difference</dt>
              <dd>
                {((output.blob.size / output.originalSize - 1) * 100).toFixed(1)}%{' '}
                {output.blob.size === output.originalSize
                  ? '(unchanged)'
                  : output.blob.size > output.originalSize
                    ? '(larger)'
                    : '(smaller)'}
              </dd>
            </div>
          )}
        </dl>
      )}
      <div className="actions">
        <Button
          onClick={() => {
            try {
              downloadFile(output)
            } catch (reason) {
              setError(fileError(reason))
            }
          }}
        >
          <Download size={16} />
          Download
        </Button>
        <Button
          disabled={saving || !!saved}
          onClick={() => {
            void save()
          }}
        >
          {saved ? <Check size={16} /> : <Save size={16} />}
          {saving ? 'Saving…' : saved ? 'Saved to Workspace' : 'Save to Workspace'}
        </Button>
      </div>
      {error && <Message kind="error">{error}</Message>}
      {saved && (
        <>
          <Message kind="success">
            Saved as {saved.name}. <Link to="/workspace">Open Workspace</Link>
          </Message>
        </>
      )}
      {!!following.length && (
        <div className="continue-output">
          <h3>Continue with</h3>
          {!saved && (
            <p className="helper-text">
              Save a copy to Workspace and open it in a compatible tool.
            </p>
          )}
          <div className="actions">
            {following.map((tool) =>
              saved ? (
                <Link
                  className="button button-secondary"
                  key={tool.id}
                  to={`${tool.path}?file=${encodeURIComponent(saved.id)}`}
                >
                  Use in {tool.name}
                </Link>
              ) : (
                <Button
                  key={tool.id}
                  disabled={saving}
                  onClick={() => {
                    void save(tool.path)
                  }}
                >
                  Save &amp; open {tool.name}
                </Button>
              ),
            )}
          </div>
        </div>
      )}
    </section>
  )
}

export function useFileJob() {
  const [output, setOutput] = useState<FileOutput>()
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [stage, setStage] = useState<ProcessingStage>('validating')
  const controller = useRef<AbortController | undefined>(undefined)
  useEffect(() => () => controller.current?.abort(), [])
  function reset() {
    controller.current?.abort()
    controller.current = undefined
    setBusy(false)
    setOutput(undefined)
    setError('')
  }
  async function run(task: (signal: AbortSignal, report: ReportStage) => Promise<FileOutput>) {
    reset()
    const current = new AbortController()
    controller.current = current
    setBusy(true)
    setStage('validating')
    try {
      const result = await task(current.signal, (stage) => {
        if (!current.signal.aborted) setStage(stage)
      })
      if (!current.signal.aborted) setOutput(result)
    } catch (reason) {
      if (!current.signal.aborted) setError(fileError(reason))
    } finally {
      if (!current.signal.aborted) setBusy(false)
    }
  }
  return { output, error, busy, stage, reset, run }
}
