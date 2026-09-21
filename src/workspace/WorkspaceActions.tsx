import { useEffect, useState } from 'react'
import { Button, Message, Modal } from '../components/ui'
import { FileOutputPanel, useFileJob } from './FileControls'
import { workspace } from './workspaceStore'
import type { FileOutput, WorkspaceFileInfo } from './workspaceTypes'
import { downloadFile, fileError, fromDevice } from './workspaceUtils'
import { runArchive } from '../tools/zip/archiveClient'
import { ZIP_LIMITS, type BackupInput } from '../lib/archiveTypes'

export default function WorkspaceActions({
  files,
  matching,
  selected,
  setSelected,
  selectionMode,
  setSelectionMode,
  disabled,
  onBusy,
}: {
  files: WorkspaceFileInfo[]
  matching: WorkspaceFileInfo[]
  selected: string[]
  setSelected: (ids: string[]) => void
  selectionMode: boolean
  setSelectionMode: (value: boolean) => void
  disabled: boolean
  onBusy: (value: boolean) => void
}) {
  const selectedFiles = files.filter((file) => selected.includes(file.id))
  const exportJob = useFileJob<FileOutput>(),
    importJob = useFileJob<BackupInput[]>()
  const [confirmDelete, setConfirmDelete] = useState(false),
    [acting, setActing] = useState(false),
    [error, setError] = useState(''),
    [message, setMessage] = useState('')
  const [chooseBackup, setChooseBackup] = useState(false)
  const busy = acting || exportJob.busy || importJob.busy
  useEffect(() => {
    onBusy(busy)
    return () => onBusy(false)
  }, [busy, onBusy])
  async function act(operation: () => Promise<void>) {
    setActing(true)
    setError('')
    try {
      await operation()
    } catch (reason) {
      setError(fileError(reason))
    } finally {
      setActing(false)
    }
  }
  async function load(items: WorkspaceFileInfo[]) {
    if (items.reduce((sum, file) => sum + file.size, 0) > ZIP_LIMITS.bytes)
      throw new Error('Combined files are limited to 150 MB.')
    return Promise.all(items.map((file) => workspace.get(file.id)))
  }
  return (
    <section className="workspace-bulk" aria-label="Workspace actions">
      <div className="actions">
        <Button
          disabled={disabled || busy || !files.length}
          aria-pressed={selectionMode}
          onClick={() => {
            setSelectionMode(!selectionMode)
            setSelected([])
          }}
        >
          {selectionMode ? 'Exit selection' : 'Select files'}
        </Button>
        <Button
          disabled={disabled || busy || !files.length}
          onClick={() =>
            void exportJob.run(async (signal) =>
              runArchive({ action: 'export', files: await load(files) }, signal),
            )
          }
        >
          Export Workspace
        </Button>
        <Button disabled={disabled || busy} onClick={() => setChooseBackup(true)}>
          Import Workspace backup
        </Button>
      </div>
      <Modal
        open={chooseBackup}
        onClose={() => setChooseBackup(false)}
        title="Choose Workspace backup"
      >
        <p>
          Select a DevToolbox Workspace ZIP backup. Files are validated locally before you confirm
          import.
        </p>
        {chooseBackup && (
          <label className="field">
            Workspace backup file
            <input
              type="file"
              accept=".zip,application/zip"
              onChange={(event) => {
                const file = event.target.files?.[0]
                if (file) {
                  setChooseBackup(false)
                  setMessage('')
                  setError('')
                  void importJob.run((signal) =>
                    runArchive({ action: 'import', file: fromDevice(file) }, signal),
                  )
                }
              }}
            />
          </label>
        )}
      </Modal>
      {selectionMode && (
        <div className="panel">
          <p role="status">
            {selectedFiles.length} files selected. Selection includes files hidden by filters.
          </p>
          <div className="actions">
            <Button
              disabled={busy || disabled || !matching.length}
              onClick={() =>
                setSelected([...new Set([...selected, ...matching.map((file) => file.id)])])
              }
            >
              Select all visible
            </Button>
            <Button disabled={busy || disabled} onClick={() => setSelected([])}>
              Clear selection
            </Button>
            <Button
              disabled={busy || disabled || !selectedFiles.length}
              onClick={() =>
                void act(async () => {
                  for (const file of await load(selectedFiles)) downloadFile(file)
                  setMessage('Downloads started. Your browser may ask to allow multiple downloads.')
                })
              }
            >
              Download selected
            </Button>
            <Button
              disabled={busy || disabled || !selectedFiles.length}
              onClick={() =>
                void exportJob.run(async (signal) =>
                  runArchive(
                    {
                      action: 'create',
                      files: await load(selectedFiles),
                      name: 'workspace-selected.zip',
                    },
                    signal,
                  ),
                )
              }
            >
              ZIP selected
            </Button>
            <Button
              variant="danger"
              disabled={busy || disabled || !selectedFiles.length}
              onClick={() => {
                setError('')
                setConfirmDelete(true)
              }}
            >
              Delete selected
            </Button>
          </div>
        </div>
      )}
      {busy && (
        <p role="status">{acting ? 'Updating Workspace…' : 'Processing archive locally…'}</p>
      )}
      {(exportJob.busy || importJob.busy) && (
        <Button
          onClick={() => {
            exportJob.reset()
            importJob.reset()
          }}
        >
          Cancel archive processing
        </Button>
      )}
      {(error || exportJob.error || importJob.error) && (
        <Message kind="error">{error || exportJob.error || importJob.error}</Message>
      )}
      {message && <Message kind="success">{message}</Message>}
      {exportJob.output && (
        <>
          <FileOutputPanel output={exportJob.output} />
          <Button onClick={exportJob.reset}>Clear archive result</Button>
        </>
      )}
      <Modal
        open={confirmDelete}
        onClose={() => {
          if (!acting) setConfirmDelete(false)
        }}
        title={`Delete ${selectedFiles.length} selected files?`}
      >
        <p>
          Both file content and metadata will be removed from this browser. Download anything you
          want to keep first.
        </p>
        {error && <Message kind="error">{error}</Message>}
        <div className="actions">
          <Button disabled={acting} onClick={() => setConfirmDelete(false)}>
            Cancel
          </Button>
          <Button
            variant="danger"
            disabled={acting || !selectedFiles.length}
            onClick={() =>
              void act(async () => {
                await workspace.deleteMany(selectedFiles.map((file) => file.id))
                setSelected([])
                setConfirmDelete(false)
                setMessage('Selected files deleted.')
              })
            }
          >
            Confirm delete selected
          </Button>
        </div>
      </Modal>
      <Modal
        open={!!importJob.output}
        onClose={() => {
          if (!acting) importJob.reset()
        }}
        title="Import Workspace backup?"
      >
        <p>
          {importJob.output?.length} validated files. Existing files will be kept; duplicate names
          receive a suffix. Pins and creation dates are restored. Preferences are not imported.
        </p>
        {error && <Message kind="error">{error}</Message>}
        <div className="actions">
          <Button disabled={acting} onClick={importJob.reset}>
            Cancel
          </Button>
          <Button
            variant="primary"
            disabled={acting}
            onClick={() =>
              void act(async () => {
                const files = importJob.output!
                await workspace.add(files, { bulk: true, restore: true })
                importJob.reset()
                setMessage(`${files.length} files imported. Existing files were preserved.`)
              })
            }
          >
            Confirm import
          </Button>
        </div>
      </Modal>
    </section>
  )
}
