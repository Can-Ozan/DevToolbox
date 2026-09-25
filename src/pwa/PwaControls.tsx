import { useState } from 'react'
import { Button, Modal } from '../components/ui'
import { useFileActivity } from '../lib/fileActivity'
import { installApp, updateApp, usePwa } from './pwaStore'
import ConnectionStatus from './ConnectionStatus'

export function PwaSettings() {
  const pwa = usePwa()
  return (
    <section className="settings-section">
      <h2>Install &amp; offline</h2>
      <ConnectionStatus />
      <p>
        {pwa.error ||
          (pwa.ready
            ? 'App shell ready for offline use.'
            : 'Offline setup completes after a successful online visit in a supported browser.')}
      </p>
      <p>
        Application assets are cached locally. Workspace files stay in IndexedDB. PDF rendering
        assets are cached when used; browser storage may be cleared. Download important files as
        backups.
      </p>
      {pwa.install && <Button onClick={() => void installApp()}>Install DevToolbox</Button>}
    </section>
  )
}
export function PwaUpdateNotice() {
  const pwa = usePwa()
  const busy = useFileActivity()
  const [dismissed, setDismissed] = useState(false)
  const [confirm, setConfirm] = useState(false)
  if (!pwa.update || dismissed) return null
  return (
    <>
      <section className="pwa-update" aria-label="Application update">
        <p role="status">
          A new DevToolbox version is ready.
          {busy ? ' Finish or cancel processing before updating.' : ''}
        </p>
        <div className="actions">
          <Button disabled={busy} onClick={() => setConfirm(true)}>
            Update app
          </Button>
          <Button variant="ghost" onClick={() => setDismissed(true)}>
            Later
          </Button>
        </div>
      </section>
      <Modal open={confirm} onClose={() => setConfirm(false)} title="Reload to update?">
        <p className="confirmation-copy">
          Reloading clears unsaved inputs and outputs. Download or save anything you want to keep.
          Saved Workspace files and preferences are kept.
        </p>
        <div className="actions">
          <Button onClick={() => setConfirm(false)}>Cancel</Button>
          <Button variant="primary" disabled={busy} onClick={() => void updateApp()}>
            Reload and update
          </Button>
        </div>
      </Modal>
    </>
  )
}
