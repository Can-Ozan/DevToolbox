import { useEffect, useRef, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { Download, FolderOpen, Plus, Save } from 'lucide-react'
import { Button, Message, Modal } from '../components/ui'
import { tools } from '../registry/tools'
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

export function compatibleTools(mimeType: string) {
  return tools.filter(
    (tool) =>
      tool.workspaceCompatible &&
      tool.acceptsFileTypes?.length &&
      acceptsFile(mimeType, tool.acceptsFileTypes),
  )
}

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
      className="file-picker"
      aria-label="Input source"
      onDragOver={(event) => event.preventDefault()}
      onDrop={(event) => {
        event.preventDefault()
        if (!disabled && !loading) choose(Array.from(event.dataTransfer.files, fromDevice))
      }}
    >
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
  const current = useRef(output)
  useEffect(() => {
    current.current = output
    setSaved(undefined)
    setError('')
  }, [output])
  return (
    <section className="panel file-output" aria-label="File output">
      <h2>Output</h2>
      <p className="file-name">{output.name}</p>
      <p className="helper-text">
        {formatBytes(output.blob.size)} · {output.blob.type}
        {output.detail ? ` · ${output.detail}` : ''}
      </p>
      {url && <img className="file-preview" src={url} alt="Output preview" />}
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
          onClick={async () => {
            const version = output
            setSaving(true)
            setError('')
            try {
              const [file] = await workspace.add([output])
              if (current.current === version) setSaved(file)
            } catch (reason) {
              if (current.current === version) setError(fileError(reason))
            } finally {
              setSaving(false)
            }
          }}
        >
          <Save size={16} />
          {saving ? 'Saving…' : saved ? 'Saved to Workspace' : 'Save to Workspace'}
        </Button>
      </div>
      {error && <Message kind="error">{error}</Message>}
      {saved && (
        <>
          <Message kind="success">
            Saved as {saved.name}. <Link to="/workspace">Open Workspace</Link>
          </Message>
          <div className="actions">
            {compatibleTools(output.blob.type).map((tool) => (
              <Link
                className="button button-secondary"
                key={tool.id}
                to={`${tool.path}?file=${encodeURIComponent(saved.id)}`}
              >
                Use in {tool.name}
              </Link>
            ))}
          </div>
        </>
      )}
    </section>
  )
}

export function useFileJob() {
  const [output, setOutput] = useState<FileOutput>()
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const controller = useRef<AbortController | undefined>(undefined)
  useEffect(() => () => controller.current?.abort(), [])
  function reset() {
    controller.current?.abort()
    controller.current = undefined
    setBusy(false)
    setOutput(undefined)
    setError('')
  }
  async function run(task: (signal: AbortSignal) => Promise<FileOutput>) {
    reset()
    const current = new AbortController()
    controller.current = current
    setBusy(true)
    try {
      const result = await task(current.signal)
      if (!current.signal.aborted) setOutput(result)
    } catch (reason) {
      if (!current.signal.aborted) setError(fileError(reason))
    } finally {
      if (!current.signal.aborted) setBusy(false)
    }
  }
  return { output, error, busy, reset, run }
}
