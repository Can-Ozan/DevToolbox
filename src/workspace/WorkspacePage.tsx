import { useEffect, useRef, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { Button, copyText, Message, Modal, useToast } from '../components/ui'
import { tools } from '../registry/tools'
import { preferences, usePreferences } from '../storage/preferences'
import OverflowMenu from '../components/OverflowMenu'
import FileThumbnail from './FileThumbnail'
import StorageMeter from './StorageMeter'
import ClearWorkspaceButton from './ClearWorkspaceButton'
import WorkspaceActions from './WorkspaceActions'
import { imageDimensions } from '../lib/imageFiles'
import { compatibleTools, useObjectURL, WorkspaceFilePicker } from './FileControls'
import { refreshWorkspace, useWorkspace, workspace } from './workspaceStore'
import type { WorkspaceFile, WorkspaceFileInfo } from './workspaceTypes'
import { downloadFile, fileError, formatBytes, IMAGE_TYPES } from './workspaceUtils'

function Preview({ file }: { file: WorkspaceFile }) {
  const [image, setImage] = useState<Blob>()
  const [text, setText] = useState('')
  const [error, setError] = useState('')
  const url = useObjectURL(image)
  useEffect(() => {
    let active = true
    if (IMAGE_TYPES.includes(file.mimeType)) {
      void imageDimensions(file.blob)
        .then(() => {
          if (active) setImage(file.blob)
        })
        .catch((reason) => {
          if (active) setError(fileError(reason))
        })
    } else if (
      file.mimeType.startsWith('text/') ||
      ['application/json', 'application/yaml'].includes(file.mimeType)
    ) {
      void file.blob
        .slice(0, 65536)
        .text()
        .then((value) => {
          if (active) setText(value)
        })
        .catch(() => {
          if (active) setError('Text preview is unavailable.')
        })
    }
    return () => {
      active = false
    }
  }, [file])
  return (
    <>
      {url && <img className="file-preview" alt={`Preview of ${file.name}`} src={url} />}
      {text && (
        <>
          <pre className="file-text-preview">{text}</pre>
          {file.size > 65536 && <p className="helper-text">Showing the first 64 KB.</p>}
        </>
      )}
      {error && <Message kind="error">{error}</Message>}
      {!IMAGE_TYPES.includes(file.mimeType) && !text && (
        <p className="helper-text">
          Visual preview is unavailable for this format. Download it or open a compatible tool.
        </p>
      )}
      <dl className="file-metadata">
        <dt>Filename</dt>
        <dd>{file.name}</dd>
        <dt>Original filename</dt>
        <dd>{file.originalName ?? file.name}</dd>
        <dt>MIME type</dt>
        <dd>{file.mimeType}</dd>
        <dt>Size</dt>
        <dd>{formatBytes(file.size)}</dd>
        <dt>Created</dt>
        <dd>{new Date(file.createdAt).toLocaleString()}</dd>
        <dt>Source</dt>
        <dd>
          {tools.find((tool) => tool.id === file.sourceTool)?.name ??
            file.sourceTool ??
            'Imported from device'}
        </dd>
      </dl>
    </>
  )
}

export default function WorkspacePage() {
  const snapshot = useWorkspace()
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [archiveBusy, setArchiveBusy] = useState(false)
  const [selectionMode, setSelectionMode] = useState(false)
  const [selected, setSelected] = useState<string[]>([])
  const [preview, setPreview] = useState<WorkspaceFile>()
  const previewTrigger = useRef<HTMLButtonElement | null>(null)
  const [useFile, setUseFile] = useState<WorkspaceFileInfo>()
  const [query, setQuery] = useState('')
  const [filter, setFilter] = useState('All')
  const { workspaceView } = usePreferences()
  const [params] = useSearchParams()
  const focusedFile = params.get('file')
  const focusedRequest = useRef<string | null>(null)
  const toast = useToast()
  const fileType = (file: WorkspaceFileInfo) =>
    file.mimeType.startsWith('image/')
      ? 'Images'
      : file.mimeType === 'application/pdf'
        ? 'PDFs'
        : file.mimeType.startsWith('text/') ||
            ['application/json', 'application/yaml'].includes(file.mimeType)
          ? 'Text'
          : 'Other'
  const filters = ['All', 'Images', 'PDFs', 'Text', 'Other'].filter(
    (type) => type === 'All' || snapshot.files.some((file) => fileType(file) === type),
  )
  const activeFilter = filters.includes(filter) ? filter : 'All'
  const matching = snapshot.files.filter(
    (file) =>
      (activeFilter === 'All' || fileType(file) === activeFilter) &&
      (file.name + ' ' + file.mimeType).toLowerCase().includes(query.toLowerCase()),
  )
  useEffect(() => {
    if (!focusedFile) {
      focusedRequest.current = null
      return
    }
    if (snapshot.loading || focusedRequest.current === focusedFile) return
    setQuery('')
    setFilter('All')
    const frame = requestAnimationFrame(() => {
      const card = document.getElementById('workspace-file-' + focusedFile)
      focusedRequest.current = focusedFile
      card?.scrollIntoView({ block: 'center' })
      card?.focus({ preventScroll: true })
    })
    return () => cancelAnimationFrame(frame)
  }, [focusedFile, snapshot.loading])
  async function act(operation: () => Promise<void>) {
    setBusy(true)
    setError('')
    try {
      await operation()
    } catch (reason) {
      setError(fileError(reason))
    } finally {
      setBusy(false)
    }
  }
  return (
    <div className="page-enter workspace-page">
      <div className="eyebrow">LOCAL FILE VAULT</div>
      <h1>
        Workspace<span className="heading-dot">.</span>
      </h1>
      <p className="page-description">Reuse your files across tools. Files stay in this browser.</p>
      <Message>
        Browser data can be cleared by you or your browser. Download important files to keep your
        own copy.
      </Message>
      <WorkspaceFilePicker
        includeWorkspace={false}
        multiple
        disabled={busy || archiveBusy}
        deviceLabel="Import files"
        onSelect={(files) => {
          void act(async () => {
            await workspace.add(files)
          })
        }}
      />
      {(error || snapshot.error) && <Message kind="error">{error || snapshot.error}</Message>}
      {snapshot.warning && <Message kind="warning">{snapshot.warning}</Message>}
      <div className="workspace-toolbar">
        <label className="field">
          Search files
          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Filename or type…"
          />
        </label>
        <div className="actions">
          <Button
            disabled={busy}
            onClick={() => {
              void refreshWorkspace()
            }}
          >
            Refresh files
          </Button>
          <ClearWorkspaceButton disabled={busy} />
        </div>
      </div>
      <StorageMeter />
      <WorkspaceActions
        files={snapshot.files}
        matching={matching}
        selected={selected}
        setSelected={setSelected}
        selectionMode={selectionMode}
        setSelectionMode={setSelectionMode}
        disabled={busy}
        onBusy={setArchiveBusy}
      />
      <div className="workspace-view-controls">
        <div className="filter-tabs" aria-label="Filter files by type">
          {filters.map((type) => (
            <button
              key={type}
              aria-pressed={activeFilter === type}
              className={activeFilter === type ? 'active' : ''}
              onClick={() => setFilter(type)}
            >
              {type}
            </button>
          ))}
        </div>
        <div className="view-toggle" role="group" aria-label="Workspace view">
          {(['grid', 'list'] as const).map((view) => (
            <Button
              key={view}
              aria-pressed={workspaceView === view}
              onClick={() => preferences.setOptions({ workspaceView: view })}
            >
              {view === 'grid' ? 'Grid' : 'List'}
            </Button>
          ))}
        </div>
      </div>
      {snapshot.loading && <p role="status">Loading Workspace…</p>}
      {!snapshot.loading && !snapshot.error && !snapshot.files.length && (
        <section className="empty-state workspace-empty">
          <h2>Your Workspace is empty.</h2>
          <p>Save outputs from DevToolbox or import files to reuse them across tools.</p>
          <Link className="button button-secondary" to="/category/image">
            Explore file tools
          </Link>
          <p className="helper-text">Image → Convert → Compress · Images → PDF → Split</p>
        </section>
      )}
      {!!snapshot.files.length && !matching.length && (
        <p role="status">No matching files. Try another filter or filename.</p>
      )}
      {focusedFile &&
        !snapshot.loading &&
        !snapshot.files.some((file) => file.id === focusedFile) && (
          <Message kind="warning">This file is no longer in Workspace.</Message>
        )}
      <div
        className={'workspace-files workspace-' + workspaceView}
        id="workspace-results"
        tabIndex={-1}
      >
        {matching.map((file) => (
          <article
            className="panel workspace-file"
            key={file.id}
            id={'workspace-file-' + file.id}
            tabIndex={-1}
          >
            {workspaceView === 'grid' && <FileThumbnail file={file} />}
            {selectionMode && (
              <label className="checkbox-label workspace-select">
                <input
                  type="checkbox"
                  aria-label={`Select ${file.name}`}
                  checked={selected.includes(file.id)}
                  disabled={busy || archiveBusy}
                  onChange={(event) =>
                    setSelected(
                      event.target.checked
                        ? [...selected, file.id]
                        : selected.filter((id) => id !== file.id),
                    )
                  }
                />
                Select file
              </label>
            )}
            <div className="workspace-file-heading">
              <h2 className="file-name">
                {file.pinned && <span aria-label="Pinned">★ </span>}
                {file.name}
              </h2>
              <OverflowMenu
                label={'More actions for ' + file.name}
                disabled={busy}
                items={[
                  {
                    label: 'Download',
                    name: 'Download ' + file.name,
                    action: () => act(async () => downloadFile(await workspace.get(file.id))),
                  },
                  {
                    label: file.pinned ? 'Unpin' : 'Pin',
                    name: (file.pinned ? 'Unpin ' : 'Pin ') + file.name,
                    action: () => act(() => workspace.pin(file.id, !file.pinned)),
                  },
                  {
                    label: 'Copy filename',
                    name: 'Copy filename ' + file.name,
                    action: () =>
                      act(async () => {
                        await copyText(file.name)
                        toast('Copied to clipboard')
                      }),
                  },
                  {
                    label: 'Delete',
                    name: 'Delete ' + file.name,
                    danger: true,
                    action: () => act(() => workspace.delete(file.id)),
                  },
                ]}
              />
            </div>
            <p className="helper-text">
              {file.mimeType} · {formatBytes(file.size)} ·{' '}
              {new Date(file.createdAt).toLocaleString()}
            </p>
            <p className="helper-text">
              Source:{' '}
              {tools.find((tool) => tool.id === file.sourceTool)?.name ??
                file.sourceTool ??
                'Imported from device'}
            </p>
            <div className="actions">
              <Button
                aria-label={'Preview ' + file.name}
                disabled={busy}
                onClick={(event) => {
                  previewTrigger.current = event.currentTarget
                  void act(async () => setPreview(await workspace.get(file.id)))
                }}
              >
                Preview
              </Button>
              <Button
                disabled={busy || !compatibleTools(file.mimeType).length}
                onClick={() => setUseFile(file)}
              >
                Use in another tool
              </Button>
            </div>
          </article>
        ))}
      </div>
      <Modal
        open={!!preview}
        onClose={() => {
          setPreview(undefined)
          requestAnimationFrame(() => {
            if (previewTrigger.current?.isConnected) previewTrigger.current.focus()
          })
        }}
        title="File preview"
      >
        {preview && <Preview key={preview.id} file={preview} />}
      </Modal>
      <Modal open={!!useFile} onClose={() => setUseFile(undefined)} title="Use in another tool">
        <p className="file-name">{useFile?.name}</p>
        <div className="actions">
          {useFile &&
            compatibleTools(useFile.mimeType).map((tool) => (
              <Link
                className="button button-secondary"
                key={tool.id}
                to={`${tool.path}?file=${encodeURIComponent(useFile.id)}`}
              >
                {tool.name}
              </Link>
            ))}
        </div>
      </Modal>
    </div>
  )
}
