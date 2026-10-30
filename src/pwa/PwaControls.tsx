import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { renderMessage } from '../i18n/messages'
import { Button, Modal } from '../components/ui'
import { useFileActivity } from '../lib/fileActivity'
import { installApp, updateApp, usePwa } from './pwaStore'
import ConnectionStatus from './ConnectionStatus'
import { ReleaseNotesModal, ReleaseSections } from '../components/ReleaseNotes'
import { releaseSections } from '../data/releases'

export function PwaSettings() {
  const { t } = useTranslation()
  const pwa = usePwa()
  return (
    <section className="settings-section">
      <h2>{t('pwa.installOffline')}</h2>
      <ConnectionStatus />
      <p>
        {' '}
        {pwa.error ? renderMessage(pwa.error, t) : pwa.ready ? t('pwa.ready') : t('pwa.setup')}
      </p>
      <p>{t('pwa.storageHelp')}</p>
      {pwa.install && <Button onClick={() => void installApp()}>{t('pwa.install')}</Button>}
    </section>
  )
}
export function PwaUpdateNotice() {
  const { t } = useTranslation()
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
            ? t('pwa.updateReady', { version: pwa.release.version })
            : t('pwa.updateAvailable')}
        </h2>
        {pwa.release ? (
          <div
            className="pwa-update-notes"
            role="region"
            aria-label={t('pwa.highlights')}
            tabIndex={0}
          >
            <ReleaseSections release={pwa.release} limit={3} />
          </div>
        ) : (
          <p>{t('pwa.detailsUnavailable')}</p>
        )}
        {busy && <p role="status">{t('pwa.finishProcessing')}</p>}
        {pwa.error && <p role="alert">{renderMessage(pwa.error, t)}</p>}
        <div className="actions">
          <Button
            disabled={busy}
            onClick={(event) => {
              event.currentTarget.focus({ preventScroll: true })
              setConfirm(true)
            }}
          >
            {t('pwa.updateNow')}
          </Button>
          <Button variant="ghost" onClick={() => setDismissed(true)}>
            {t('pwa.later')}
          </Button>
          {pwa.release && releaseSections(pwa.release).some(({ items }) => items.length > 3) && (
            <Button
              variant="ghost"
              onClick={(event) => {
                event.currentTarget.focus({ preventScroll: true })
                setNotesOpen(true)
              }}
            >
              {t('pwa.viewAll')}
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
      <Modal open={confirm} onClose={() => setConfirm(false)} title={t('pwa.reloadTitle')}>
        <p className="confirmation-copy">{t('pwa.reloadHelp')}</p>
        <div className="actions">
          <Button onClick={() => setConfirm(false)}>{t('common.cancel')}</Button>
          <Button variant="primary" disabled={busy} onClick={() => void updateApp()}>
            {t('pwa.reload')}
          </Button>
        </div>
      </Modal>
    </>
  )
}
