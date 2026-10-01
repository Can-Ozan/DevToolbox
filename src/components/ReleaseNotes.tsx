import { useState } from 'react'
import { releases, releaseSections, type Release } from '../data/releases'
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
  const Heading = headingLevel === 3 ? 'h3' : 'h4'
  return (
    <div className="release-sections">
      {releaseSections(release).map(({ title, items }) => (
        <section key={title}>
          <Heading>{title}</Heading>
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
  return (
    <Modal open={open} onClose={onClose} title="Release notes" className="release-notes-modal">
      {entries.map((release) => (
        <article className="release-entry" key={release.version}>
          <h3>
            DevToolbox v{release.version} — {release.title}
          </h3>
          <p className="release-date">
            <time dateTime={release.date}>
              {new Date(`${release.date}T00:00:00Z`).toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
                timeZone: 'UTC',
              })}
            </time>
          </p>
          <ReleaseSections release={release} headingLevel={4} />
        </article>
      ))}
    </Modal>
  )
}

export function ReleaseNotesSettings() {
  const [open, setOpen] = useState(false)
  return (
    <section className="settings-section">
      <h2>What’s new</h2>
      <p>
        DevToolbox v{releases[0].version} — {releases[0].title}. Release notes are available
        offline.
      </p>
      <Button
        onClick={(event) => {
          // Safari does not focus pointer-clicked buttons; give the native dialog a return target.
          event.currentTarget.focus({ preventScroll: true })
          setOpen(true)
        }}
      >
        View release notes
      </Button>
      <ReleaseNotesModal open={open} onClose={() => setOpen(false)} />
    </section>
  )
}
