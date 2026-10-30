import { useTranslation } from 'react-i18next'
import { useMessageState } from '../i18n/useMessageState'
import { useState } from 'react'
import { Button, Message, Modal } from '../components/ui'
import { workspace } from './workspaceStore'
import type { WorkspaceCollection, WorkspaceFileInfo } from './workspaceTypes'
import { fileMessage } from './workspaceUtils'

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
  const { t } = useTranslation()
  const [mode, setMode] = useState<'create' | 'rename' | 'delete'>()
  const [name, setName] = useState('')
  const [error, setError] = useMessageState()
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
      setError(fileMessage(reason))
    } finally {
      setBusy(false)
    }
  }
  return (
    <section aria-label={t('workspace.collections')}>
      <div className="workspace-toolbar">
        <label className="field">
          {t('workspace.collection')}
          <select
            aria-label={t('workspace.collection')}
            value={active}
            disabled={disabled || busy}
            onChange={(event) => onChange(event.target.value)}
          >
            <option value="">{t('workspace.allFiles', { count: files.length })}</option>
            <option value="unassigned">
              {t('workspace.unassignedCount', {
                count: files.filter(
                  (file) =>
                    !file.collectionId ||
                    !collections.some((item) => item.id === file.collectionId),
                ).length,
              })}
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
            {t('workspace.newCollection')}
          </Button>
          <Button disabled={disabled || busy || !current} onClick={() => open('rename')}>
            {t('workspace.renameCollection')}
          </Button>
          <Button
            variant="danger"
            disabled={disabled || busy || !current}
            onClick={() => open('delete')}
          >
            {t('workspace.deleteCollection')}
          </Button>
        </div>
      </div>
      <p className="helper-text">{t('workspace.collectionsHelp', { count: collections.length })}</p>
      <Modal
        open={!!mode}
        onClose={() => {
          if (!busy) setMode(undefined)
        }}
        title={
          mode === 'delete'
            ? t('workspace.deleteCollectionTitle')
            : mode === 'rename'
              ? t('workspace.renameCollection')
              : t('workspace.createCollection')
        }
      >
        <form
          onSubmit={(event) => {
            event.preventDefault()
            void save()
          }}
        >
          {mode === 'delete' ? (
            <p>{t('workspace.deleteCollectionHelp', { name: current?.name ?? '' })}</p>
          ) : (
            <label className="field">
              {t('workspace.collectionName')}
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
              {t('common.cancel')}
            </Button>
            <Button
              type="submit"
              variant={mode === 'delete' ? 'danger' : 'primary'}
              disabled={
                busy || (mode !== 'delete' && !name.trim()) || (mode !== 'create' && !current)
              }
            >
              {busy
                ? t('workspace.saving')
                : mode === 'delete'
                  ? t('workspace.confirmDeleteCollection')
                  : t('workspace.saveCollection')}
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
  const { t } = useTranslation()
  const [target, setTarget] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useMessageState()
  return (
    <Modal
      open
      onClose={() => {
        if (!busy) onClose()
      }}
      title={t('workspace.moveFiles')}
    >
      <p>{t('workspace.moveHelp', { count: ids.length })}</p>
      <label className="field">
        {t('workspace.destination')}
        <select
          aria-label={t('workspace.destination')}
          value={target}
          disabled={busy}
          onChange={(event) => setTarget(event.target.value)}
        >
          <option value="">{t('workspace.removeAssignment')}</option>
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
          {t('common.cancel')}
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
              setError(fileMessage(reason))
            } finally {
              setBusy(false)
            }
          }}
        >
          {busy ? t('workspace.moving') : t('workspace.applyCollection')}
        </Button>
      </div>
    </Modal>
  )
}
