import { ToolTabs, ToolToolbar } from '../../components/ToolLayout'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useSearchParams } from 'react-router-dom'
import { Button, Message } from '../../components/ui'
import { FileOutputPanel, useFileJob, WorkspaceFilePicker } from '../../workspace/FileControls'
import type { FileInput, FileOutput } from '../../workspace/workspaceTypes'
import { formatBytes, fileError } from '../../workspace/workspaceUtils'
import { workspace } from '../../workspace/workspaceStore'
import { ZIP_TYPES, type ArchiveEntry } from '../../lib/archiveTypes'
import { runArchive } from './archiveClient'
import { errorDescriptor } from '../../lib/encoding'
import { renderMessage } from '../../i18n/messages'

export default function ZipTool() {
  const { t } = useTranslation()
  const [params] = useSearchParams()
  const [mode, setMode] = useState<'create' | 'extract'>(params.has('file') ? 'extract' : 'create')
  const [files, setFiles] = useState<FileInput[]>([]),
    [archive, setArchive] = useState<FileInput>()
  const [name, setName] = useState('archive.zip'),
    [selected, setSelected] = useState<number[]>([])
  const [saving, setSaving] = useState(false),
    [message, setMessage] = useState(''),
    [error, setError] = useState('')
  const create = useFileJob<FileOutput>(),
    inspect = useFileJob<ArchiveEntry[]>(),
    extract = useFileJob<FileInput[]>()
  const busy = create.busy || inspect.busy || extract.busy || saving
  function clear() {
    create.reset()
    inspect.reset()
    extract.reset()
    setSelected([])
    setMessage('')
    setError('')
  }
  const available = inspect.output?.filter((entry) => !entry.directory) ?? []
  return (
    <>
      <ToolTabs
        label={t('inspection.zip.operation')}
        value={mode}
        disabled={busy}
        options={[
          { value: 'create', label: t('inspection.zip.create') },
          { value: 'extract', label: t('inspection.zip.extract') },
        ]}
        onChange={(value) => {
          clear()
          setMode(value)
        }}
      />
      <p className="helper-text">{t('inspection.zip.help')}</p>
      {mode === 'create' ? (
        <>
          <WorkspaceFilePicker
            multiple
            disabled={busy}
            onSelect={(value) => {
              clear()
              setFiles(value)
            }}
          />
          <label className="field">
            {t('inspection.zip.filename')}
            <input
              value={name}
              disabled={busy}
              maxLength={170}
              onChange={(e) => {
                create.reset()
                setName(e.target.value)
              }}
            />
          </label>
          <ul className="archive-input-list">
            {files.map((file, index) => (
              <li key={index}>
                <span>
                  {file.name} · {formatBytes(file.blob.size)}
                </span>
                <Button
                  disabled={busy}
                  aria-label={`${t('inspection.zip.remove')} ${file.name}`}
                  onClick={() => {
                    create.reset()
                    setFiles(files.filter((_, i) => i !== index))
                  }}
                >
                  {t('inspection.zip.remove')}
                </Button>
              </li>
            ))}
          </ul>
        </>
      ) : (
        <>
          <WorkspaceFilePicker
            accepted={ZIP_TYPES}
            disabled={busy}
            onSelect={([file]) => {
              clear()
              setArchive(file)
            }}
          />
          {archive && <p className="file-name">{archive.name}</p>}
          {inspect.output && (
            <section aria-label="ZIP entries" className="panel">
              <h2>{t('inspection.zip.entries', { count: inspect.output.length })}</h2>
              <div className="actions">
                <Button
                  disabled={busy || !available.length}
                  onClick={() => {
                    extract.reset()
                    setSelected(available.map((entry) => entry.id))
                  }}
                >
                  {t('inspection.zip.selectAll')}
                </Button>
                <Button
                  disabled={busy}
                  onClick={() => {
                    extract.reset()
                    setSelected([])
                  }}
                >
                  {t('inspection.zip.clearSelection')}
                </Button>
              </div>
              <div className="archive-entry-list">
                {inspect.output.map((entry) => (
                  <label key={entry.id} className="archive-entry">
                    <input
                      type="checkbox"
                      aria-label={`${t('inspection.zip.extractEntry')} ${entry.path}`}
                      disabled={busy || entry.directory}
                      checked={selected.includes(entry.id)}
                      onChange={(e) => {
                        extract.reset()
                        setSelected(
                          e.target.checked
                            ? [...selected, entry.id]
                            : selected.filter((id) => id !== entry.id),
                        )
                      }}
                    />
                    <span className="file-name">
                      {entry.path}
                      <small>
                        {entry.directory ? t('inspection.zip.directory') : t('inspection.zip.file')}{' '}
                        · {formatBytes(entry.compressedSize)} {t('inspection.zip.compressed')} ·{' '}
                        {formatBytes(entry.size)} {t('inspection.zip.expanded')}
                      </small>
                    </span>
                  </label>
                ))}
              </div>
              <Button
                variant="primary"
                disabled={busy || !selected.length}
                onClick={() => {
                  setMessage('')
                  setError('')
                  void extract.run((signal) =>
                    runArchive({ action: 'extract', file: archive!, selected }, signal),
                  )
                }}
              >
                {t('inspection.zip.extractSelected', { count: selected.length })}
              </Button>
            </section>
          )}
        </>
      )}
      <ToolToolbar>
        {mode === 'create' ? (
          <Button
            variant="primary"
            disabled={busy || !files.length}
            onClick={() =>
              void create.run((signal) =>
                runArchive({ action: 'create', files, name: name.trim() || 'archive.zip' }, signal),
              )
            }
          >
            {t('inspection.zip.generate')}
          </Button>
        ) : (
          <Button
            variant="primary"
            disabled={busy || !archive}
            onClick={() => {
              clear()
              void inspect.run((signal) => runArchive({ action: 'list', file: archive! }, signal))
            }}
          >
            {t('inspection.zip.inspect')}
          </Button>
        )}
        <Button
          disabled={saving}
          onClick={() => {
            clear()
            setFiles([])
            setArchive(undefined)
          }}
        >
          {t('toolUi.clear')}
        </Button>
        {(create.busy || inspect.busy || extract.busy) && (
          <Button onClick={clear}>{t('inspection.zip.cancel')}</Button>
        )}
      </ToolToolbar>
      {busy && (
        <p role="status">{saving ? t('inspection.zip.saving') : t('inspection.zip.processing')}</p>
      )}
      {(create.error || inspect.error || extract.error || error) && (
        <Message kind="error">
          {renderMessage(
            errorDescriptor(create.error || inspect.error || extract.error || error),
            t,
          )}
        </Message>
      )}
      {message && <Message kind="success">{message}</Message>}
      {create.output && <FileOutputPanel output={create.output} />}
      {extract.output && (
        <>
          <div className="actions">
            <Button
              disabled={busy}
              onClick={async () => {
                setSaving(true)
                setError('')
                try {
                  await workspace.add(extract.output!, { bulk: true })
                  setMessage(t('inspection.zip.saved', { count: extract.output!.length }))
                } catch (reason) {
                  setError(fileError(reason))
                } finally {
                  setSaving(false)
                }
              }}
            >
              {t('inspection.zip.save')}
            </Button>
          </div>
          <p className="helper-text">{t('inspection.zip.nothingSaved')}</p>
          {extract.output.map((file, index) => (
            <FileOutputPanel key={index} output={file} />
          ))}
        </>
      )}
    </>
  )
}
