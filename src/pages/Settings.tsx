import { useState } from 'react'
import { Bug, Lightbulb, Monitor, Moon, ShieldCheck, Star, Sun, Trash2 } from 'lucide-react'
import { preferences, usePreferences, type Theme } from '../storage/preferences'
import { Button, Modal, useToast } from '../components/ui'

import StorageMeter from '../workspace/StorageMeter'
import ClearWorkspaceButton from '../workspace/ClearWorkspaceButton'
import { PwaSettings } from '../pwa/PwaControls'
import { ReleaseNotesSettings } from '../components/ReleaseNotes'
import { PageHeader } from '../components/ToolLayout'
import LanguageSettings from '../i18n/LanguageSettings'
import { useTranslation } from 'react-i18next'

type ResetAction = 'recent' | 'favorites' | 'all' | 'usage'
export default function Settings() {
  const { t } = useTranslation()
  const prefs = usePreferences()
  const { theme, favorites, recent, collapsed, jsonIndent, hexCase, jpegQuality, jpegBackground } =
    prefs
  const [confirm, setConfirm] = useState<ResetAction | null>(null)
  const toast = useToast()
  const options: { id: Theme; label: string; icon: typeof Sun }[] = [
    { id: 'light', label: t('settings.light'), icon: Sun },
    { id: 'dark', label: t('settings.dark'), icon: Moon },
    { id: 'system', label: t('settings.system'), icon: Monitor },
  ]
  return (
    <div className="settings-page page-enter">
      <PageHeader
        eyebrow={t('settings.eyebrow')}
        title={t('shell.settings')}
        description={t('settings.description')}
      />
      <LanguageSettings />
      <section className="settings-section">
        <h2>{t('settings.appearance')}</h2>
        <p>{t('settings.themeHelp')}</p>
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
        <h2>{t('settings.sidebar')}</h2>
        <label className="checkbox-label">
          <input type="checkbox" checked={collapsed} onChange={preferences.toggleSidebar} />{' '}
          {t('settings.collapseDesktop')}
        </label>
      </section>
      <section className="settings-section">
        <h2>{t('settings.tools')}</h2>
        <div className="field-row">
          <label className="field">
            {t('settings.indentation')}
            <select
              value={jsonIndent}
              onChange={(event) =>
                preferences.setOptions({ jsonIndent: event.target.value as '2' | '4' })
              }
            >
              <option value="2">{t('settings.spaces', { count: 2 })}</option>
              <option value="4">{t('settings.spaces', { count: 4 })}</option>
            </select>
          </label>
          <label className="field">
            {t('settings.hexCase')}
            <select
              value={hexCase}
              onChange={(event) =>
                preferences.setOptions({ hexCase: event.target.value as 'upper' | 'lower' })
              }
            >
              <option value="upper">{t('settings.uppercase')}</option>
              <option value="lower">{t('settings.lowercase')}</option>
            </select>
          </label>
        </div>
        <p>{t('settings.defaultsHelp')}</p>
      </section>
      <section className="settings-section">
        <h2>{t('settings.files')}</h2>
        <div className="field-row">
          <label className="field">
            {t('settings.jpegQuality', { quality: jpegQuality })}
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
            {t('settings.jpegBackground')}
            <input
              type="color"
              value={jpegBackground}
              onChange={(event) => preferences.setOptions({ jpegBackground: event.target.value })}
            />
          </label>
        </div>
        <p>{t('settings.imageDefaults')}</p>
      </section>
      <section className="settings-section">
        <h2>{t('shell.workspace')}</h2>
        <StorageMeter />
        <ClearWorkspaceButton />
      </section>
      <PwaSettings />
      <ReleaseNotesSettings />
      <section className="settings-section">
        <h2>{t('settings.localData')}</h2>
        <p>{t('settings.localDataHelp')}</p>
        <div className="setting-row">
          <div>
            <strong>{t('settings.recentlyUsed')}</strong>
            <p>{t('settings.history', { count: recent.length })}</p>
          </div>
          <Button onClick={() => setConfirm('recent')} disabled={!recent.length}>
            <Trash2 size={15} />
            {t('settings.clearHistory')}
          </Button>
        </div>
        <div className="setting-row">
          <div>
            <strong>{t('settings.favoriteTools')}</strong>
            <p>{t('settings.collection', { count: favorites.length })}</p>
          </div>
          <Button onClick={() => setConfirm('favorites')} disabled={!favorites.length}>
            <Trash2 size={15} />
            {t('settings.clearFavorites')}
          </Button>
        </div>
        <div className="setting-row">
          <div>
            <strong>{t('settings.reset')}</strong>
            <p>{t('settings.resetHelp')}</p>
          </div>
          <Button variant="danger" onClick={() => setConfirm('all')}>
            {t('settings.resetAll')}
          </Button>
        </div>
      </section>
      <section className="settings-section">
        <h2>{t('settings.usage')}</h2>
        <p>{t('settings.usageHelp')}</p>
        <Button disabled={!Object.keys(prefs.toolUsage).length} onClick={() => setConfirm('usage')}>
          {t('settings.clearUsage')}
        </Button>
      </section>
      <section className="settings-section">
        <h2>{t('settings.support')}</h2>
        <p>{t('settings.supportHelp')}</p>
        <div className="actions">
          <a
            className="button"
            href="https://github.com/Can-Ozan/DevToolbox"
            target="_blank"
            rel="noreferrer"
          >
            {' '}
            {t('settings.github')}
          </a>
          <a
            className="button"
            href="https://github.com/Can-Ozan/DevToolbox/issues/new"
            target="_blank"
            rel="noreferrer"
          >
            <Bug size={15} />
            {t('settings.bug')}
          </a>
          <a
            className="button"
            href="https://github.com/Can-Ozan/DevToolbox/issues/new"
            target="_blank"
            rel="noreferrer"
          >
            <Lightbulb size={15} />
            {t('settings.request')}
          </a>
          <a
            className="button"
            href="https://github.com/Can-Ozan/DevToolbox"
            target="_blank"
            rel="noreferrer"
          >
            <Star size={15} />
            {t('settings.star')}
          </a>
        </div>
      </section>
      <div className="privacy-note settings-privacy">
        <ShieldCheck size={25} />
        <div>
          <strong>{t('settings.privacyTitle')}</strong>
          <p>{t('settings.privacyBody')}</p>
        </div>
      </div>
      <Modal
        open={confirm !== null}
        onClose={() => setConfirm(null)}
        title={
          confirm === 'all'
            ? t('settings.confirmAll')
            : t(
                confirm === 'recent'
                  ? 'settings.confirmRecent'
                  : confirm === 'usage'
                    ? 'settings.confirmUsage'
                    : 'settings.confirmFavorites',
              )
        }
      >
        <p className="confirmation-copy">
          {confirm === 'all' ? t('settings.resetBody') : t('settings.clearBody')}{' '}
          {t('settings.irreversible')}
        </p>
        <div className="actions justify-end">
          <Button autoFocus onClick={() => setConfirm(null)}>
            {t('common.cancel')}
          </Button>
          <Button
            variant="danger"
            onClick={() => {
              if (confirm === 'all') preferences.reset()
              else if (confirm === 'recent') preferences.clearRecent()
              else if (confirm === 'usage') preferences.clearUsage()
              else preferences.clearFavorites()
              setConfirm(null)
              toast(t('settings.updated'))
            }}
          >
            {t(confirm === 'all' ? 'settings.confirmReset' : 'settings.confirmClear')}
          </Button>
        </div>
      </Modal>
    </div>
  )
}
