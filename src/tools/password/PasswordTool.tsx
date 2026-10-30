import { useMessageState } from '../../i18n/useMessageState'
import { useTranslation } from 'react-i18next'
import { useState } from 'react'
import { RefreshCw, ShieldCheck } from 'lucide-react'
import { Button, CopyButton, Message } from '../../components/ui'
import {
  defaultPasswordOptions,
  generatePassword,
  passwordPools,
  type PasswordOptions,
} from '../../lib/random'
import { errorDescriptor } from '../../lib/encoding'
export default function PasswordTool() {
  const { t } = useTranslation()
  const [length, setLength] = useState(20)
  const [options, setOptions] = useState<PasswordOptions>({ ...defaultPasswordOptions })
  const [password, setPassword] = useState('')
  const [error, setError] = useMessageState()
  const entropy = length * Math.log2(passwordPools(options).join('').length || 1)
  const strength = entropy >= 100 ? 4 : entropy >= 70 ? 3 : entropy >= 45 ? 2 : 1
  const labels: Record<keyof PasswordOptions, string> = {
    uppercase: t('toolUi.uppercase'),
    lowercase: t('toolUi.lowercase'),
    numbers: t('toolUi.numbers'),
    symbols: t('toolUi.symbols'),
    excludeAmbiguous: t('toolUi.excludeAmbiguous'),
  }
  return (
    <div className="panel">
      <div className="field-row">
        <label className="field">
          {t('toolUi.passwordLength')}
          <input
            aria-label={t('toolUi.passwordLength')}
            type="number"
            min="8"
            max="128"
            value={Number.isNaN(length) ? '' : length}
            onChange={(event) => {
              setLength(event.target.valueAsNumber)
              setPassword('')
              setError('')
            }}
          />
        </label>
        <label className="field" style={{ flex: 3 }}>
          <span>{t('toolUi.passwordRange')}</span>
          <input
            aria-label={t('toolUi.adjustPassword')}
            type="range"
            min="8"
            max="128"
            value={Number.isFinite(length) ? length : 8}
            onChange={(event) => {
              setLength(Number(event.target.value))
              setPassword('')
              setError('')
            }}
          />
        </label>
      </div>
      <div className="check-options">
        {(Object.keys(labels) as (keyof PasswordOptions)[]).map((key) => (
          <label key={key}>
            <input
              type="checkbox"
              checked={options[key]}
              onChange={(event) => {
                setOptions({ ...options, [key]: event.target.checked })
                setPassword('')
                setError('')
              }}
            />
            {labels[key]}
          </label>
        ))}
      </div>
      <div className="actions">
        <Button
          variant="primary"
          onClick={() => {
            try {
              setPassword(generatePassword(length, options))
              setError('')
            } catch (error) {
              setError(errorDescriptor(error))
              setPassword('')
            }
          }}
        >
          <RefreshCw size={15} />
          {password ? t('toolUi.regeneratePassword') : t('toolUi.generatePassword')}
        </Button>
        <CopyButton text={password} label={t('toolUi.copyPassword')} />
      </div>
      {error && <Message kind="error">{error}</Message>}
      <div
        className="password-result"
        aria-label={t('toolUi.generatedPassword')}
        aria-live="polite"
      >
        {password || <span className="helper-text">{t('toolUi.passwordHint')}</span>}
      </div>
      {password && (
        <>
          <div className="strength-meter" aria-hidden="true">
            {[1, 2, 3, 4].map((value) => (
              <span className={value <= strength ? 'filled' : ''} key={value} />
            ))}
          </div>
          <p className="strength-text">
            {t('toolUi.strengthHelp', {
              strength: [
                '',
                t('toolUi.basic'),
                t('toolUi.moderate'),
                t('toolUi.strong'),
                t('toolUi.veryStrong'),
              ][strength],
            })}
          </p>
        </>
      )}
      <p className="helper-text flex items-center gap-2">
        <ShieldCheck size={15} />
        {t('toolUi.generatedLocally')}
      </p>
    </div>
  )
}
