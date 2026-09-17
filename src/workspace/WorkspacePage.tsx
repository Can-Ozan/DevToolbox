import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { Button, CopyButton, Message, Modal } from '../components/ui'
import { tools } from '../registry/tools'
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
  const [preview, setPreview] = useState<WorkspaceFile>()
  const previewTrigger = useRef<HTMLButtonElement | null>(null)
  const [useFile, setUseFile] = useState<WorkspaceFileInfo>()
  const [clearOpen, setClearOpen] = useState(false)
  const [query, setQuery] = useState('')
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
        disabled={busy}
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
          <Button
            variant="danger"
            disabled={busy || (!snapshot.files.length && !snapshot.warning)}
            onClick={() => setClearOpen(true)}
          >
            Clear Workspace
          </Button>
        </div>
      </div>
      <p className="helper-text">
        {snapshot.files.length} files ·{' '}
        {formatBytes(snapshot.files.reduce((sum, file) => sum + file.size, 0))} in Workspace ·
        Pinned first, then most recent.
        {snapshot.estimate?.quota !== undefined &&
          ` Browser origin storage: approximately ${formatBytes(snapshot.estimate.usage ?? 0)} of ${formatBytes(snapshot.estimate.quota)}.`}
      </p>
      {snapshot.loading && <p role="status">Loading Workspace…</p>}
      {!snapshot.loading && !snapshot.error && !snapshot.files.length && (
        <section className="empty-state">
          <h2>Your local file workspace</h2>
          <p>Import a file or save a tool’s output to start a workflow.</p>
        </section>
      )}
      <div className="workspace-files">
        {snapshot.files
          .filter((file) =>
            `${file.name} ${file.mimeType}`.toLowerCase().includes(query.toLowerCase()),
          )
          .map((file) => (
            <article className="panel workspace-file" key={file.id}>
              <h2 className="file-name">
                {file.pinned ? '★ ' : ''}
                {file.name}
              </h2>
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
                  aria-label={`Preview ${file.name}`}
                  disabled={busy}
                  onClick={(event) => {
                    previewTrigger.current = event.currentTarget
                    void act(async () => {
                      setPreview(await workspace.get(file.id))
                    })
                  }}
                >
                  Preview
                </Button>
                <Button
                  aria-label={`Download ${file.name}`}
                  disabled={busy}
                  onClick={() => {
                    void act(async () => downloadFile(await workspace.get(file.id)))
                  }}
                >
                  Download
                </Button>
                <Button
                  disabled={busy || !compatibleTools(file.mimeType).length}
                  onClick={() => setUseFile(file)}
                >
                  Use in another tool
                </Button>
                <CopyButton
                  text={file.name}
                  label={`Copy filename ${file.name}`}
                  visibleLabel="Copy filename"
                />
                <Button
                  aria-label={`${file.pinned ? 'Unpin' : 'Pin'} ${file.name}`}
                  disabled={busy}
                  onClick={() => {
                    void act(() => workspace.pin(file.id, !file.pinned))
                  }}
                >
                  {file.pinned ? 'Unpin' : 'Pin'}
                </Button>
                <Button
                  aria-label={`Delete ${file.name}`}
                  variant="danger"
                  disabled={busy}
                  onClick={() => {
                    void act(() => workspace.delete(file.id))
                  }}
                >
                  Delete
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
      <Modal
        open={clearOpen}
        onClose={() => {
          if (!busy) setClearOpen(false)
        }}
        title="Clear Workspace?"
      >
        <p>
          This deletes every file stored in this browser’s Workspace. Download anything you need
          first.
        </p>
        {error && <Message kind="error">{error}</Message>}
        <div className="actions">
          <Button disabled={busy} onClick={() => setClearOpen(false)}>
            Cancel
          </Button>
          <Button
            variant="danger"
            disabled={busy}
            onClick={() => {
              void act(async () => {
                await workspace.clear()
                setClearOpen(false)
              })
            }}
          >
            Confirm clear
          </Button>
        </div>
      </Modal>
    </div>
  )
}
