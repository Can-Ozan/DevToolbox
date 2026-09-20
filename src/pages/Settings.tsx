import { useState } from 'react'
import { Monitor, Moon, ShieldCheck, Sun, Trash2 } from 'lucide-react'
import { preferences, usePreferences, type Theme } from '../storage/preferences'
import { Button, Modal, useToast } from '../components/ui'

import StorageMeter from '../workspace/StorageMeter'
import ClearWorkspaceButton from '../workspace/ClearWorkspaceButton'

type ResetAction = 'recent' | 'favorites' | 'all' | 'usage'
export default function Settings() {
  const prefs = usePreferences()
  const { theme, favorites, recent, collapsed, jsonIndent, hexCase, jpegQuality, jpegBackground } =
    prefs
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
        <h2>Sidebar</h2>
        <label className="checkbox-label">
          <input type="checkbox" checked={collapsed} onChange={preferences.toggleSidebar} />{' '}
          Collapse desktop sidebar
        </label>
      </section>
      <section className="settings-section">
        <h2>Tools</h2>
        <div className="field-row">
          <label className="field">
            JSON indentation
            <select
              value={jsonIndent}
              onChange={(event) =>
                preferences.setOptions({ jsonIndent: event.target.value as '2' | '4' })
              }
            >
              <option value="2">2 spaces</option>
              <option value="4">4 spaces</option>
            </select>
          </label>
          <label className="field">
            HEX letter case
            <select
              value={hexCase}
              onChange={(event) =>
                preferences.setOptions({ hexCase: event.target.value as 'upper' | 'lower' })
              }
            >
              <option value="upper">Uppercase</option>
              <option value="lower">Lowercase</option>
            </select>
          </label>
        </div>
        <p>Defaults apply when you next open a tool.</p>
      </section>
      <section className="settings-section">
        <h2>Files</h2>
        <div className="field-row">
          <label className="field">
            Default JPEG quality ({jpegQuality}%)
            <input
              type="range"
              min="10"
              max="100"
              value={jpegQuality}
              onChange={(event) =>
                preferences.setOptions({ jpegQuality: Number(event.target.value) })
              }
            />
          </label>
          <label className="field">
            Default JPEG background
            <input
              type="color"
              value={jpegBackground}
              onChange={(event) => preferences.setOptions({ jpegBackground: event.target.value })}
            />
          </label>
        </div>
        <p>Image tools use these defaults on opening. You can change them for each output.</p>
      </section>
      <section className="settings-section">
        <h2>Workspace</h2>
        <StorageMeter />
        <ClearWorkspaceButton />
      </section>
      <section className="settings-section">
        <h2>Local data</h2>
        <p>
          Preferences are saved in this browser. Files are stored only when you import or save them
          to Workspace.
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
            <p>
              Reset your theme, sidebar, favorites, history, usage counts, view and tool defaults.
              Saved Workspace files are kept.
            </p>
          </div>
          <Button variant="danger" onClick={() => setConfirm('all')}>
            Reset all preferences
          </Button>
        </div>
      </section>
      <section className="settings-section">
        <h2>Local tool usage</h2>
        <p>
          Only tool IDs and open counts are stored locally, to order your most-used tools. No
          analytics or content tracking.
        </p>
        <Button disabled={!Object.keys(prefs.toolUsage).length} onClick={() => setConfirm('usage')}>
          Clear usage counts
        </Button>
      </section>
      <div className="privacy-note settings-privacy">
        <ShieldCheck size={25} />
        <div>
          <strong>Your workspace stays yours.</strong>
          <p>
            Your data stays on your device. DevToolbox processes supported inputs locally in your
            browser. No accounts, analytics, or external APIs. Clearing your browser’s site data
            will also clear your preferences and Workspace files. Download important files to keep a
            copy.
          </p>
        </div>
      </div>
      <Modal
        open={confirm !== null}
        onClose={() => setConfirm(null)}
        title={
          confirm === 'all'
            ? 'Reset all preferences?'
            : `Clear ${confirm === 'recent' ? 'recent tools' : confirm === 'usage' ? 'usage counts' : 'favorites'}?`
        }
      >
        <p className="confirmation-copy">
          {confirm === 'all'
            ? 'This clears favorites, history and usage counts, and restores appearance, view and tool defaults. Workspace files are kept.'
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
              else if (confirm === 'usage') preferences.clearUsage()
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
