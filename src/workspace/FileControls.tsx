import { useTranslation } from 'react-i18next'
import { messageError, renderMessage } from '../i18n/messages'
import { currentLanguage, getToolText } from '../i18n/toolLabels'
import { useMessageState } from '../i18n/useMessageState'
import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { Check, Download, FolderOpen, Plus, Save, Upload } from 'lucide-react'
import { Button, Message, Modal } from '../components/ui'
import { nextTools } from '../registry/discovery'
import type { ProcessingStage, ReportStage } from '../lib/processing'
import { beginFileActivity } from '../lib/fileActivity'
import { workspace, useWorkspace, refreshWorkspace } from './workspaceStore'
import type { FileInput, FileOutput } from './workspaceTypes'
import {
  acceptsFile,
  downloadFile,
  fileMessage,
  formatBytes,
  fromDevice,
  validateBatch,
} from './workspaceUtils'

export { compatibleTools } from '../registry/discovery'

export function useObjectURL(blob?: Blob) {
  // This effect owns one preview URL. React runs cleanup before replacement
  // and on unmount; clearing the Blob removes the old src before revocation.
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
  deviceLabel,
  includeWorkspace = true,
}: {
  accepted?: readonly string[]
  multiple?: boolean
  disabled?: boolean
  onSelect: (files: FileInput[]) => void
  deviceLabel?: string
  includeWorkspace?: boolean
}) {
  const { t } = useTranslation()
  const input = useRef<HTMLInputElement>(null)
  const [open, setOpen] = useState(false)
  const [error, setError] = useMessageState()
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
        if (active) setError(fileMessage(reason))
      })
      .finally(() => {
        if (active) setLoading(false)
      })
    return () => {
      active = false
    }
  }, [requested, acceptedKey, setError])

  function choose(files: FileInput[]) {
    try {
      if (!multiple && files.length !== 1)
        throw messageError('workspace.errors.oneFile', 'Choose one file for this tool.')
      validateBatch(files, accepted)
      onSelect(files)
      setError('')
      setOpen(false)
      setSelected([])
    } catch (reason) {
      setError(fileMessage(reason))
    }
  }
  async function fromWorkspace(ids: string[]) {
    setLoading(true)
    try {
      choose(await Promise.all(ids.map((id) => workspace.get(id))))
    } catch (reason) {
      setError(fileMessage(reason))
    } finally {
      setLoading(false)
    }
  }
  const matching = snapshot.files.filter((file) => acceptsFile(file.mimeType, accepted))
  return (
    <section
      className={`file-picker ${drag ? `drop-${drag}` : ''}`}
      aria-label={t('workspace.inputSource')}
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
        <strong>{multiple ? t('workspace.dropFiles') : t('workspace.dropFile')}</strong>
        <span className="helper-text">
          {(accepted?.includes('*/*')
            ? undefined
            : accepted?.map((type) => type.split('/')[1].toUpperCase()).join(', ')) ??
            t('workspace.stayDevice')}
        </span>
      </div>
      {drag === 'invalid' && <Message kind="error">{t('workspace.invalidDrop')}</Message>}
      <div className="actions">
        <input
          ref={input}
          type="file"
          aria-label={deviceLabel ?? t('workspace.upload')}
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
        <Button
          variant="primary"
          disabled={disabled || loading}
          onClick={() => input.current?.click()}
        >
          <Plus size={16} />
          {deviceLabel ?? t('workspace.upload')}
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
            {t('workspace.chooseWorkspace')}
          </Button>
        )}
      </div>
      <p className="helper-text">
        {loading ? t('workspace.openingFile') : t('workspace.localProcessing')}
      </p>
      {error && !open && <Message kind="error">{error}</Message>}
      {includeWorkspace && (
        <Modal open={open} onClose={() => setOpen(false)} title={t('workspace.chooseWorkspace')}>
          <p className="helper-text">{t('workspace.compatibleHelp')}</p>
          {(error || snapshot.error) && <Message kind="error">{error || snapshot.error}</Message>}
          {snapshot.warning && <Message kind="warning">{snapshot.warning}</Message>}
          {snapshot.loading ? (
            <p role="status">{t('workspace.loadingFiles')}</p>
          ) : (
            !matching.length && <p>{t('workspace.noCompatible')}</p>
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
                    {t('workspace.useFile', { name: file.name, size: formatBytes(file.size) })}
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
                {t('workspace.useSelected')}
              </Button>
            )}
            <Button
              onClick={() => {
                void refreshWorkspace()
              }}
            >
              {t('workspace.refresh')}
            </Button>
            <Button onClick={() => setOpen(false)}>{t('common.cancel')}</Button>
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
  const { t } = useTranslation()
  const url = useObjectURL(image ? output.blob : undefined)
  const [error, setError] = useMessageState()
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
  }, [output, setError])
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
      if (current.current === version) setError(fileMessage(reason))
    } finally {
      savingRef.current = false
      setSaving(false)
    }
  }
  return (
    <section className="panel file-output" aria-label={t('workspace.output')}>
      <h2 className="result-heading">
        <Check size={22} /> {t('workspace.completed')}
      </h2>
      <p className="file-name">{output.name}</p>
      <p className="helper-text">
        {formatBytes(output.blob.size)} · {output.blob.type}
        {output.detail ? ` · ${renderMessage(output.detail, t)}` : ''}
      </p>
      {url && <img className="file-preview" src={url} alt={t('workspace.outputPreview')} />}
      {output.originalSize !== undefined && (
        <dl className="result-stats">
          <div>
            <dt>{t('workspace.original')}</dt>
            <dd>{formatBytes(output.originalSize)}</dd>
          </div>
          <div>
            <dt>{t('workspace.outputLabel')}</dt>
            <dd>{formatBytes(output.blob.size)}</dd>
          </div>
          {output.originalSize > 0 && (
            <div>
              <dt>{t('workspace.difference')}</dt>
              <dd>
                {((output.blob.size / output.originalSize - 1) * 100).toFixed(1)}%{' '}
                {output.blob.size === output.originalSize
                  ? t('workspace.unchanged')
                  : output.blob.size > output.originalSize
                    ? t('workspace.larger')
                    : t('workspace.smaller')}
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
              setError(fileMessage(reason))
            }
          }}
        >
          <Download size={16} />
          {t('common.download')}
        </Button>
        <Button
          disabled={saving || !!saved}
          onClick={() => {
            void save()
          }}
        >
          {saved ? <Check size={16} /> : <Save size={16} />}
          {saving ? t('workspace.saving') : saved ? t('workspace.saved') : t('workspace.save')}
        </Button>
      </div>
      {error && <Message kind="error">{error}</Message>}
      {saved && (
        <>
          <Message kind="success">
            {t('workspace.savedAs', { name: saved.name })}{' '}
            <Link to="/workspace">{t('workspace.open')}</Link>
          </Message>
        </>
      )}
      {!!following.length && (
        <div className="continue-output">
          <h3>{t('workspace.continue')}</h3>
          {!saved && <p className="helper-text">{t('workspace.continueHelp')}</p>}
          <div className="actions">
            {following.map((tool) =>
              saved ? (
                <Link
                  className="button button-secondary"
                  key={tool.id}
                  to={`${tool.path}?file=${encodeURIComponent(saved.id)}`}
                >
                  {t('workspace.useIn', { name: getToolText(tool, currentLanguage()).name })}
                </Link>
              ) : (
                <Button
                  key={tool.id}
                  disabled={saving}
                  onClick={() => {
                    void save(tool.path)
                  }}
                >
                  {t('workspace.saveOpen', { name: getToolText(tool, currentLanguage()).name })}
                </Button>
              ),
            )}
          </div>
        </div>
      )}
    </section>
  )
}

export function useFileJob<T = FileOutput>() {
  const [output, setOutput] = useState<T>()
  const [error, setError] = useMessageState()
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
  async function run(task: (signal: AbortSignal, report: ReportStage) => Promise<T>) {
    reset()
    const current = new AbortController()
    controller.current = current
    const finish = beginFileActivity()
    current.signal.addEventListener('abort', finish, { once: true })
    setBusy(true)
    setStage('validating')
    try {
      const result = await task(current.signal, (stage) => {
        if (!current.signal.aborted) setStage(stage)
      })
      if (!current.signal.aborted) setOutput(result)
    } catch (reason) {
      if (!current.signal.aborted) setError(fileMessage(reason))
    } finally {
      finish()
      current.signal.removeEventListener('abort', finish)
      if (!current.signal.aborted) setBusy(false)
    }
  }
  return { output, error, busy, stage, reset, run }
}
