import { useState } from 'react'
import { Button, Modal } from '../components/ui'
import { useFileActivity } from '../lib/fileActivity'
import { installApp, updateApp, usePwa } from './pwaStore'
import ConnectionStatus from './ConnectionStatus'
import { ReleaseNotesModal, ReleaseSections } from '../components/ReleaseNotes'
import { releaseSections } from '../data/releases'

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
  const [notesOpen, setNotesOpen] = useState(false)
  if (!pwa.update || dismissed) return null
  return (
    <>
      <section className="pwa-update" aria-labelledby="pwa-update-heading">
        <h2 id="pwa-update-heading" aria-live="polite">
          {pwa.release
            ? `DevToolbox v${pwa.release.version} is ready`
            : 'A DevToolbox update is ready'}
        </h2>
        {pwa.release ? (
          <div
            className="pwa-update-notes"
            role="region"
            aria-label="Release highlights"
            tabIndex={0}
          >
            <ReleaseSections release={pwa.release} limit={3} />
          </div>
        ) : (
          <p>Release details are unavailable for this update. You can still update safely.</p>
        )}
        {busy && <p role="status">Finish or cancel processing before updating.</p>}
        {pwa.error && <p role="alert">{pwa.error}</p>}
        <div className="actions">
          <Button
            disabled={busy}
            onClick={(event) => {
              event.currentTarget.focus({ preventScroll: true })
              setConfirm(true)
            }}
          >
            Update now
          </Button>
          <Button variant="ghost" onClick={() => setDismissed(true)}>
            Later
          </Button>
          {pwa.release && releaseSections(pwa.release).some(({ items }) => items.length > 3) && (
            <Button
              variant="ghost"
              onClick={(event) => {
                event.currentTarget.focus({ preventScroll: true })
                setNotesOpen(true)
              }}
            >
              View all changes
            </Button>
          )}
        </div>
      </section>
      {pwa.release && (
        <ReleaseNotesModal
          open={notesOpen}
          onClose={() => setNotesOpen(false)}
          entries={[pwa.release]}
        />
      )}
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
