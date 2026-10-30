import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { localizeRelease } from '../data/localizedRelease'
import { releases, releaseSections, type Release } from '../data/releases'
import { isLanguage } from '../i18n/language'
import { Button, Modal } from './ui'

export function ReleaseSections({
  release,
  limit,
  headingLevel = 3,
}: {
  release: Release
  limit?: number
  headingLevel?: 3 | 4
}) {
  const { t, i18n } = useTranslation()
  release = localizeRelease(release, isLanguage(i18n.language) ? i18n.language : 'en')
  const Heading = headingLevel === 3 ? 'h3' : 'h4'
  return (
    <div className="release-sections">
      {releaseSections(release).map(({ title, items }) => (
        <section key={title}>
          <Heading>{t(`releases.${title.toLowerCase()}` as 'releases.new')}</Heading>
          <ul>
            {items.slice(0, limit).map((item, index) => (
              <li key={index}>{item}</li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  )
}

export function ReleaseNotesModal({
  open,
  onClose,
  entries = releases,
}: {
  open: boolean
  onClose: () => void
  entries?: readonly Release[]
}) {
  const { t, i18n } = useTranslation()
  return (
    <Modal
      open={open}
      onClose={onClose}
      title={t('releases.title')}
      className="release-notes-modal"
    >
      {entries.map((entry) => {
        const release = localizeRelease(entry, isLanguage(i18n.language) ? i18n.language : 'en')
        return (
          <article className="release-entry" key={release.version}>
            <h3>
              DevToolbox v{release.version} — {release.title}
            </h3>
            <p className="release-date">
              <time dateTime={release.date}>
                {new Date(`${release.date}T00:00:00Z`).toLocaleDateString(i18n.language, {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                  timeZone: 'UTC',
                })}
              </time>
            </p>
            <ReleaseSections release={release} headingLevel={4} />
          </article>
        )
      })}
    </Modal>
  )
}

export function ReleaseNotesSettings() {
  const { t } = useTranslation()
  const [open, setOpen] = useState(false)
  return (
    <section className="settings-section">
      <h2>{t('releases.whatsNew')}</h2>
      <p>
        DevToolbox v{releases[0].version} — {releases[0].title}. {t('releases.availableOffline')}
      </p>
      <Button
        onClick={(event) => {
          // Safari does not focus pointer-clicked buttons; give the native dialog a return target.
          event.currentTarget.focus({ preventScroll: true })
          setOpen(true)
        }}
      >
        {t('releases.view')}
      </Button>
      <ReleaseNotesModal open={open} onClose={() => setOpen(false)} />
    </section>
  )
}
