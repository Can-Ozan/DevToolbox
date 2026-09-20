import { useState } from 'react'
import { Button, Message, Modal } from '../components/ui'
import { useWorkspace, workspace } from './workspaceStore'
import { fileError } from './workspaceUtils'

export default function ClearWorkspaceButton({ disabled = false }: { disabled?: boolean }) {
  const { files, warning } = useWorkspace()
  const [open, setOpen] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  return (
    <>
      <Button
        variant="danger"
        disabled={disabled || (!files.length && !warning)}
        onClick={() => {
          setError('')
          setOpen(true)
        }}
      >
        Clear Workspace
      </Button>
      <Modal
        open={open}
        onClose={() => {
          if (!busy) setOpen(false)
        }}
        title="Clear Workspace?"
      >
        <p>
          This deletes every file stored in this browser’s Workspace. Download anything you need
          first.
        </p>
        {error && <Message kind="error">{error}</Message>}
        <div className="actions">
          <Button autoFocus disabled={busy} onClick={() => setOpen(false)}>
            Cancel
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
                setError(fileError(reason))
              } finally {
                setBusy(false)
              }
            }}
          >
            {busy ? 'Clearing…' : 'Confirm clear'}
          </Button>
        </div>
      </Modal>
    </>
  )
}
