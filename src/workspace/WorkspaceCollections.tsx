import { useState } from 'react'
import { Button, Message, Modal } from '../components/ui'
import { workspace } from './workspaceStore'
import type { WorkspaceCollection, WorkspaceFileInfo } from './workspaceTypes'
import { fileError } from './workspaceUtils'

export default function WorkspaceCollections({
  collections,
  files,
  active,
  onChange,
  disabled,
}: {
  collections: WorkspaceCollection[]
  files: WorkspaceFileInfo[]
  active: string
  onChange: (id: string) => void
  disabled: boolean
}) {
  const [mode, setMode] = useState<'create' | 'rename' | 'delete'>()
  const [name, setName] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const current = collections.find((item) => item.id === active)
  const count = (id: string) => files.filter((file) => file.collectionId === id).length
  function open(mode: 'create' | 'rename' | 'delete') {
    setName(mode === 'create' ? '' : (current?.name ?? ''))
    setError('')
    setMode(mode)
  }
  async function save() {
    setBusy(true)
    setError('')
    try {
      if (mode === 'delete' && current) {
        await workspace.deleteCollection(current.id)
        onChange('')
      } else {
        const collection = await workspace.saveCollection(
          name,
          mode === 'rename' ? current?.id : undefined,
        )
        onChange(collection.id)
      }
      setMode(undefined)
    } catch (reason) {
      setError(fileError(reason))
    } finally {
      setBusy(false)
    }
  }
  return (
    <section aria-label="Workspace collections">
      <div className="workspace-toolbar">
        <label className="field">
          Collection
          <select
            aria-label="Collection"
            value={active}
            disabled={disabled || busy}
            onChange={(event) => onChange(event.target.value)}
          >
            <option value="">All Files ({files.length})</option>
            <option value="unassigned">
              Unassigned (
              {
                files.filter(
                  (file) =>
                    !file.collectionId ||
                    !collections.some((item) => item.id === file.collectionId),
                ).length
              }
              )
            </option>
            {collections.map((item) => (
              <option key={item.id} value={item.id}>
                {item.name} ({count(item.id)})
              </option>
            ))}
          </select>
        </label>
        <div className="actions">
          <Button disabled={disabled || busy} onClick={() => open('create')}>
            New collection
          </Button>
          <Button disabled={disabled || busy || !current} onClick={() => open('rename')}>
            Rename collection
          </Button>
          <Button
            variant="danger"
            disabled={disabled || busy || !current}
            onClick={() => open('delete')}
          >
            Delete collection
          </Button>
        </div>
      </div>
      <p className="helper-text">
        {collections.length} collections · Each file can belong to one collection.
      </p>
      <Modal
        open={!!mode}
        onClose={() => {
          if (!busy) setMode(undefined)
        }}
        title={
          mode === 'delete'
            ? 'Delete collection?'
            : mode === 'rename'
              ? 'Rename collection'
              : 'Create collection'
        }
      >
        <form
          onSubmit={(event) => {
            event.preventDefault()
            void save()
          }}
        >
          {mode === 'delete' ? (
            <p>
              Delete “{current?.name}”? Its files will remain in Workspace, unassigned to a
              collection.
            </p>
          ) : (
            <label className="field">
              Collection name
              <input
                autoFocus
                value={name}
                maxLength={80}
                disabled={busy}
                onChange={(event) => setName(event.target.value)}
              />
            </label>
          )}
          {error && <Message kind="error">{error}</Message>}
          <div className="actions">
            <Button disabled={busy} onClick={() => setMode(undefined)}>
              Cancel
            </Button>
            <Button
              type="submit"
              variant={mode === 'delete' ? 'danger' : 'primary'}
              disabled={
                busy || (mode !== 'delete' && !name.trim()) || (mode !== 'create' && !current)
              }
            >
              {busy
                ? 'Saving…'
                : mode === 'delete'
                  ? 'Confirm delete collection'
                  : 'Save collection'}
            </Button>
          </div>
        </form>
      </Modal>
    </section>
  )
}

export function MoveCollectionModal({
  ids,
  collections,
  onClose,
}: {
  ids: string[]
  collections: WorkspaceCollection[]
  onClose: () => void
}) {
  const [target, setTarget] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  return (
    <Modal
      open
      onClose={() => {
        if (!busy) onClose()
      }}
      title="Move files to collection"
    >
      <p>{ids.length} selected file(s). Removing a collection assignment keeps the files.</p>
      <label className="field">
        Destination collection
        <select
          aria-label="Destination collection"
          value={target}
          disabled={busy}
          onChange={(event) => setTarget(event.target.value)}
        >
          <option value="">Unassigned (remove from collection)</option>
          {collections.map((item) => (
            <option key={item.id} value={item.id}>
              {item.name}
            </option>
          ))}
        </select>
      </label>
      {error && <Message kind="error">{error}</Message>}
      <div className="actions">
        <Button disabled={busy} onClick={onClose}>
          Cancel
        </Button>
        <Button
          variant="primary"
          disabled={busy || !ids.length}
          onClick={async () => {
            setBusy(true)
            setError('')
            try {
              await workspace.moveFiles(ids, target || undefined)
              onClose()
            } catch (reason) {
              setError(fileError(reason))
            } finally {
              setBusy(false)
            }
          }}
        >
          {busy ? 'Moving…' : 'Apply collection'}
        </Button>
      </div>
    </Modal>
  )
}
