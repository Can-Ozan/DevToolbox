import { useTranslation } from 'react-i18next'
import { message } from '../i18n/messages'
import { currentLanguage, getToolText } from '../i18n/toolLabels'
import { useMessageState } from '../i18n/useMessageState'
import { useEffect, useRef, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import {
  ArrowUpRight,
  Eye,
  FolderOpen,
  LayoutGrid,
  List,
  RefreshCw,
  ShieldCheck,
} from 'lucide-react'
import { PageHeader } from '../components/ToolLayout'
import { Button, copyText, Message, Modal, useToast } from '../components/ui'
import { tools } from '../registry/tools'
import { preferences, usePreferences } from '../storage/preferences'
import OverflowMenu from '../components/OverflowMenu'
import FileThumbnail from './FileThumbnail'
import StorageMeter from './StorageMeter'
import ClearWorkspaceButton from './ClearWorkspaceButton'
import WorkspaceActions from './WorkspaceActions'
import WorkspaceCollections, { MoveCollectionModal } from './WorkspaceCollections'
import { imageDimensions } from '../lib/imageFiles'
import { compatibleTools, useObjectURL, WorkspaceFilePicker } from './FileControls'
import { refreshWorkspace, useWorkspace, workspace } from './workspaceStore'
import type { WorkspaceFile, WorkspaceFileInfo } from './workspaceTypes'
import { downloadFile, fileMessage, formatBytes, IMAGE_TYPES } from './workspaceUtils'

function sourceLabel(source: string | undefined, importedLabel: string) {
  const tool = tools.find((item) => item.id === source)
  return tool ? getToolText(tool, currentLanguage()).name : (source ?? importedLabel)
}

function Preview({ file }: { file: WorkspaceFile }) {
  const { t } = useTranslation()
  const [image, setImage] = useState<Blob>()
  const [text, setText] = useState('')
  const [error, setError] = useMessageState()
  const url = useObjectURL(image)
  useEffect(() => {
    let active = true
    if (IMAGE_TYPES.includes(file.mimeType)) {
      void imageDimensions(file.blob)
        .then(() => {
          if (active) setImage(file.blob)
        })
        .catch((reason) => {
          if (active) setError(fileMessage(reason))
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
          if (active) setError(message('workspace.errors.preview', 'Text preview is unavailable.'))
        })
    }
    return () => {
      active = false
    }
  }, [file, setError])
  return (
    <>
      {url && (
        <img
          className="file-preview"
          alt={t('workspace.previewAlt', { name: file.name })}
          src={url}
        />
      )}
      {text && (
        <>
          <pre className="file-text-preview">{text}</pre>
          {file.size > 65536 && <p className="helper-text">{t('workspace.previewLimit')}</p>}
        </>
      )}
      {error && <Message kind="error">{error}</Message>}
      {!IMAGE_TYPES.includes(file.mimeType) && !text && (
        <p className="helper-text">{t('workspace.noPreview')}</p>
      )}
      <dl className="file-metadata">
        <dt>{t('workspace.filename')}</dt>
        <dd>{file.name}</dd>
        <dt>{t('workspace.originalFilename')}</dt>
        <dd>{file.originalName ?? file.name}</dd>
        <dt>{t('workspace.mime')}</dt>
        <dd>{file.mimeType}</dd>
        <dt>{t('workspace.size')}</dt>
        <dd>{formatBytes(file.size)}</dd>
        <dt>{t('workspace.created')}</dt>
        <dd>{new Date(file.createdAt).toLocaleString(currentLanguage())}</dd>
        <dt>{t('workspace.source')}</dt>
        <dd>{sourceLabel(file.sourceTool, t('workspace.importedDevice'))}</dd>
      </dl>
    </>
  )
}

export default function WorkspacePage() {
  const { t } = useTranslation()
  const snapshot = useWorkspace()
  const [error, setError] = useMessageState()
  const [busy, setBusy] = useState(false)
  const [archiveBusy, setArchiveBusy] = useState(false)
  const [selectionMode, setSelectionMode] = useState(false)
  const [selected, setSelected] = useState<string[]>([])
  const [collection, setCollection] = useState('')
  const [moveIds, setMoveIds] = useState<string[]>()
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
  const filters = (['All', 'Images', 'PDFs', 'Text', 'Other'] as const).filter(
    (type) => type === 'All' || snapshot.files.some((file) => fileType(file) === type),
  )
  const activeFilter = filters.find((item) => item === filter) ?? 'All'
  const activeCollection =
    collection === 'unassigned' || snapshot.collections.some((item) => item.id === collection)
      ? collection
      : ''
  const matching = snapshot.files.filter(
    (file) =>
      (!activeCollection ||
        (activeCollection === 'unassigned'
          ? !snapshot.collections.some((item) => item.id === file.collectionId)
          : file.collectionId === activeCollection)) &&
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
    setCollection('')
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
      setError(fileMessage(reason))
    } finally {
      setBusy(false)
    }
  }
  return (
    <div className="page-enter workspace-page">
      <PageHeader
        eyebrow={t('workspace.eyebrow')}
        title={t('shell.workspace')}
        description={t('workspace.description')}
        actions={
          <span className="count-pill">
            <FolderOpen size={14} />
            {snapshot.loading
              ? t('common.loading')
              : t('workspace.files', { count: snapshot.files.length })}
          </span>
        }
      />
      <p className="workspace-note">
        <ShieldCheck size={15} />
        {t('workspace.backupNote')}
      </p>
      <div className="workspace-manager">
        <WorkspaceFilePicker
          includeWorkspace={false}
          multiple
          disabled={busy || archiveBusy}
          deviceLabel={t('workspace.importFiles')}
          onSelect={(files) => {
            void act(async () => {
              await workspace.add(files)
            })
          }}
        />
        {(error || snapshot.error) && <Message kind="error">{error || snapshot.error}</Message>}
        {snapshot.warning && <Message kind="warning">{snapshot.warning}</Message>}
        <WorkspaceActions
          files={snapshot.files}
          collections={snapshot.collections}
          matching={matching}
          selected={selected}
          setSelected={setSelected}
          selectionMode={selectionMode}
          setSelectionMode={setSelectionMode}
          disabled={busy}
          onBusy={setArchiveBusy}
        />
        <WorkspaceCollections
          collections={snapshot.collections}
          files={snapshot.files}
          active={activeCollection}
          onChange={setCollection}
          disabled={busy || archiveBusy || snapshot.loading}
        />
        <div className="workspace-toolbar">
          <label className="field">
            {t('workspace.search')}
            <input
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder={t('workspace.searchPlaceholder')}
            />
          </label>
          <div className="actions">
            <Button
              disabled={busy}
              onClick={() => {
                void refreshWorkspace()
              }}
            >
              <RefreshCw size={14} />
              {t('workspace.refresh')}
            </Button>
            <ClearWorkspaceButton disabled={busy} />
          </div>
        </div>

        <div className="workspace-view-controls">
          <div className="filter-tabs" aria-label={t('workspace.filter')}>
            {filters.map((type) => (
              <button
                key={type}
                aria-pressed={activeFilter === type}
                className={activeFilter === type ? 'active' : ''}
                onClick={() => setFilter(type)}
              >
                {t(`workspace.${type}`)}
              </button>
            ))}
          </div>
          <div className="view-toggle" role="group" aria-label={t('workspace.view')}>
            {(['grid', 'list'] as const).map((view) => (
              <Button
                key={view}
                aria-pressed={workspaceView === view}
                onClick={() => preferences.setOptions({ workspaceView: view })}
              >
                {view === 'grid' ? <LayoutGrid size={15} /> : <List size={15} />}
                {view === 'grid' ? t('workspace.grid') : t('workspace.list')}
              </Button>
            ))}
          </div>
        </div>
        {snapshot.loading && <p role="status">{t('common.loadingWorkspace')}</p>}
        {!snapshot.loading && !snapshot.error && !snapshot.files.length && (
          <section className="empty-state workspace-empty">
            <span className="empty-icon">
              <FolderOpen size={24} />
            </span>
            <h2>{t('workspace.empty')}</h2>
            <p>{t('workspace.emptyHelp')}</p>
            <Link className="button button-secondary" to="/category/image">
              {t('workspace.explore')}
            </Link>
            <p className="helper-text">{t('workspace.example')}</p>
          </section>
        )}
        {!!snapshot.files.length && !matching.length && (
          <p role="status">{t('workspace.noMatching')}</p>
        )}
        {focusedFile &&
          !snapshot.loading &&
          !snapshot.files.some((file) => file.id === focusedFile) && (
            <Message kind="warning">{t('workspace.missing')}</Message>
          )}
        <div
          className={'workspace-files workspace-' + workspaceView}
          id="workspace-results"
          tabIndex={-1}
        >
          {matching.map((file) => (
            <article
              className={`panel workspace-file ${selectionMode && selected.includes(file.id) ? 'is-selected' : ''}`}
              key={file.id}
              id={'workspace-file-' + file.id}
              tabIndex={-1}
            >
              {workspaceView === 'grid' && <FileThumbnail file={file} />}
              {selectionMode && (
                <label className="checkbox-label workspace-select">
                  <input
                    type="checkbox"
                    aria-label={t('workspace.selectName', { name: file.name })}
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
                  {t('workspace.selectFile')}
                </label>
              )}
              <div className="workspace-file-heading">
                <h2 className="file-name">
                  {file.pinned && <span aria-label={t('workspace.pinned')}>★ </span>}
                  {file.name}
                </h2>
                <OverflowMenu
                  label={t('workspace.moreName', { name: file.name })}
                  disabled={busy}
                  items={[
                    {
                      label: t('common.download'),
                      id: 'download',
                      name: t('workspace.downloadName', { name: file.name }),
                      action: () => act(async () => downloadFile(await workspace.get(file.id))),
                    },
                    {
                      label: file.pinned ? t('workspace.unpin') : t('workspace.pin'),
                      id: 'pin',
                      name: t(file.pinned ? 'workspace.unpinName' : 'workspace.pinName', {
                        name: file.name,
                      }),
                      action: () => act(() => workspace.pin(file.id, !file.pinned)),
                    },
                    {
                      label: t('workspace.copyFilename'),
                      id: 'copy',
                      name: t('workspace.copyFilenameName', { name: file.name }),
                      action: () =>
                        act(async () => {
                          await copyText(file.name)
                          toast(t('common.copied'))
                        }),
                    },
                    {
                      label: t('workspace.moveCollection'),
                      id: 'move',
                      name: t('workspace.moveName', { name: file.name }),
                      action: () => setMoveIds([file.id]),
                    },
                    {
                      label: t('workspace.delete'),
                      id: 'delete',
                      name: t('workspace.deleteName', { name: file.name }),
                      danger: true,
                      action: () => act(() => workspace.delete(file.id)),
                    },
                  ]}
                />
              </div>
              <p className="helper-text workspace-file-details">
                {file.mimeType} · {formatBytes(file.size)} ·{' '}
                {new Date(file.createdAt).toLocaleString(currentLanguage())}
              </p>
              <p className="helper-text workspace-file-source">
                {t('workspace.source')}:{' '}
                {sourceLabel(file.sourceTool, t('workspace.importedDevice'))}
                {file.collectionId && (
                  <span>
                    <br />
                    {t('workspace.collection')}:{' '}
                    {snapshot.collections.find((item) => item.id === file.collectionId)?.name ??
                      t('workspace.unassigned')}
                  </span>
                )}
              </p>
              <div className="actions">
                <Button
                  aria-label={t('workspace.previewName', { name: file.name })}
                  disabled={busy}
                  onClick={(event) => {
                    previewTrigger.current = event.currentTarget
                    void act(async () => setPreview(await workspace.get(file.id)))
                  }}
                >
                  <Eye size={15} />
                  {t('workspace.preview')}
                </Button>
                <Button
                  disabled={busy || !compatibleTools(file.mimeType).length}
                  onClick={() => setUseFile(file)}
                >
                  {t('workspace.useTool')}
                  <ArrowUpRight size={14} />
                </Button>
              </div>
            </article>
          ))}
        </div>
      </div>
      <StorageMeter />
      {moveIds && (
        <MoveCollectionModal
          ids={moveIds}
          collections={snapshot.collections}
          onClose={() => setMoveIds(undefined)}
        />
      )}
      <Modal
        open={!!preview}
        onClose={() => {
          setPreview(undefined)
          requestAnimationFrame(() => {
            if (previewTrigger.current?.isConnected) previewTrigger.current.focus()
          })
        }}
        title={t('workspace.filePreview')}
      >
        {preview && <Preview key={preview.id} file={preview} />}
      </Modal>
      <Modal open={!!useFile} onClose={() => setUseFile(undefined)} title={t('workspace.useTool')}>
        <p className="file-name">{useFile?.name}</p>
        <div className="actions">
          {useFile &&
            compatibleTools(useFile.mimeType).map((tool) => (
              <Link
                className="button button-secondary"
                key={tool.id}
                to={`${tool.path}?file=${encodeURIComponent(useFile.id)}`}
              >
                {getToolText(tool, currentLanguage()).name}
              </Link>
            ))}
        </div>
      </Modal>
    </div>
  )
}
