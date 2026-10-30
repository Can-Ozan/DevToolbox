import { useTranslation } from 'react-i18next'
import { useMessageState } from '../i18n/useMessageState'
import { useState } from 'react'
import { Button, Message, Modal } from '../components/ui'
import { useWorkspace, workspace } from './workspaceStore'
import { fileMessage } from './workspaceUtils'

export default function ClearWorkspaceButton({ disabled = false }: { disabled?: boolean }) {
  const { t } = useTranslation()
  const { files, collections, warning } = useWorkspace()
  const [open, setOpen] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useMessageState()
  return (
    <>
      <Button
        variant="danger"
        disabled={disabled || (!files.length && !collections.length && !warning)}
        onClick={() => {
          setError('')
          setOpen(true)
        }}
      >
        {t('workspace.clear')}
      </Button>
      <Modal
        open={open}
        onClose={() => {
          if (!busy) setOpen(false)
        }}
        title={t('workspace.clearTitle')}
      >
        <p>{t('workspace.clearHelp')}</p>
        {error && <Message kind="error">{error}</Message>}
        <div className="actions">
          <Button autoFocus disabled={busy} onClick={() => setOpen(false)}>
            {t('common.cancel')}
          </Button>
          <Button
            variant="danger"
            disabled={busy}
            onClick={async () => {
              setBusy(true)
              try {
                await workspace.clear()
                setOpen(false)
              } catch (reason) {
                setError(fileMessage(reason))
              } finally {
                setBusy(false)
              }
            }}
          >
            {busy ? t('workspace.clearing') : t('workspace.confirmClear')}
          </Button>
        </div>
      </Modal>
    </>
  )
}
