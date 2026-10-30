import { useSyncExternalStore } from 'react'
import { useTranslation } from 'react-i18next'
import { changeAppLanguage, getLanguageStatus, subscribeLanguageStatus } from './index'
import { isLanguage, languageNames } from './language'

export default function LanguageSettings() {
  const { t, i18n } = useTranslation()
  const status = useSyncExternalStore(subscribeLanguageStatus, getLanguageStatus, getLanguageStatus)
  return (
    <section className="settings-section">
      <h2>{t('settings.language.label')}</h2>
      <p id="language-description">{t('settings.language.description')}</p>
      <div className="field-row">
        <label className="field" htmlFor="app-language">
          {t('settings.language.label')}
          <select
            id="app-language"
            value={i18n.resolvedLanguage ?? 'en'}
            aria-describedby="language-description language-status"
            disabled={status.loading}
            onChange={(event) => {
              if (isLanguage(event.target.value)) void changeAppLanguage(event.target.value)
            }}
          >
            {Object.entries(languageNames).map(([language, name]) => (
              <option key={language} value={language} lang={language}>
                {name}
              </option>
            ))}
          </select>
        </label>
      </div>
      <p id="language-status" role="status">
        {status.error
          ? t('settings.language.error')
          : status.loading
            ? t('settings.language.loading')
            : ''}
      </p>
    </section>
  )
}
