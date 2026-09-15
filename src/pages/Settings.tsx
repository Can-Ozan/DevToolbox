import { useState } from 'react'
import { Monitor, Moon, ShieldCheck, Sun, Trash2 } from 'lucide-react'
import { preferences, usePreferences, type Theme } from '../storage/preferences'
import { Button, Modal, useToast } from '../components/ui'

type ResetAction = 'recent' | 'favorites' | 'all'
export default function Settings() {
  const { theme, favorites, recent } = usePreferences()
  const [confirm, setConfirm] = useState<ResetAction | null>(null)
  const toast = useToast()
  const options: { id: Theme; label: string; icon: typeof Sun }[] = [
    { id: 'light', label: 'Light', icon: Sun },
    { id: 'dark', label: 'Dark', icon: Moon },
    { id: 'system', label: 'System', icon: Monitor },
  ]
  return (
    <div className="settings-page page-enter">
      <div className="eyebrow">MAKE YOURSELF AT HOME</div>
      <h1>
        Settings<span className="heading-dot">.</span>
      </h1>
      <p className="page-description">A few preferences for a workspace that feels like yours.</p>
      <section className="settings-section">
        <h2>Appearance</h2>
        <p>Choose a theme. System follows your device’s preference.</p>
        <div className="theme-options">
          {options.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              aria-pressed={theme === id}
              className={`theme-option ${theme === id ? 'active' : ''}`}
              onClick={() => preferences.setTheme(id)}
            >
              <div className={`theme-preview preview-${id}`}>
                <div />
                <div>
                  <i />
                  <i />
                  <i />
                </div>
              </div>
              <span>
                <Icon size={17} />
                {label}
                <span className="radio-dot" />
              </span>
            </button>
          ))}
        </div>
      </section>
      <section className="settings-section">
        <h2>Local data</h2>
        <p>
          Preferences are saved in this browser. Tool inputs and generated values are never stored.
        </p>
        <div className="setting-row">
          <div>
            <strong>Recently used tools</strong>
            <p>{recent.length} tools in your history</p>
          </div>
          <Button onClick={() => setConfirm('recent')} disabled={!recent.length}>
            <Trash2 size={15} />
            Clear history
          </Button>
        </div>
        <div className="setting-row">
          <div>
            <strong>Favorite tools</strong>
            <p>{favorites.length} tools in your collection</p>
          </div>
          <Button onClick={() => setConfirm('favorites')} disabled={!favorites.length}>
            <Trash2 size={15} />
            Clear favorites
          </Button>
        </div>
        <div className="setting-row">
          <div>
            <strong>Reset preferences</strong>
            <p>Reset your theme, sidebar, favorites, and history.</p>
          </div>
          <Button variant="danger" onClick={() => setConfirm('all')}>
            Reset all preferences
          </Button>
        </div>
      </section>
      <div className="privacy-note settings-privacy">
        <ShieldCheck size={25} />
        <div>
          <strong>Your workspace stays yours.</strong>
          <p>
            Your data stays on your device. DevToolbox processes supported inputs locally in your
            browser. No accounts, analytics, or external APIs. Clearing your browser’s site data
            will also clear your preferences.
          </p>
        </div>
      </div>
      <Modal
        open={confirm !== null}
        onClose={() => setConfirm(null)}
        title={
          confirm === 'all'
            ? 'Reset all preferences?'
            : `Clear ${confirm === 'recent' ? 'recent tools' : 'favorites'}?`
        }
      >
        <p className="confirmation-copy">
          {confirm === 'all'
            ? 'This removes your saved favorites and history, expands the sidebar, and restores the system theme.'
            : 'This removes this collection from your saved preferences.'}{' '}
          This action cannot be undone.
        </p>
        <div className="actions justify-end">
          <Button autoFocus onClick={() => setConfirm(null)}>
            Cancel
          </Button>
          <Button
            variant="danger"
            onClick={() => {
              if (confirm === 'all') preferences.reset()
              else if (confirm === 'recent') preferences.clearRecent()
              else preferences.clearFavorites()
              setConfirm(null)
              toast('Preferences updated')
            }}
          >
            Confirm {confirm === 'all' ? 'reset' : 'clear'}
          </Button>
        </div>
      </Modal>
    </div>
  )
}
