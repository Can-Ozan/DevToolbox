import { useState } from 'react'
import { RefreshCw, ShieldCheck } from 'lucide-react'
import { Button, CopyButton, Message } from '../../components/ui'
import {
  defaultPasswordOptions,
  generatePassword,
  passwordPools,
  type PasswordOptions,
} from '../../lib/random'
import { errorMessage } from '../../lib/encoding'
export default function PasswordTool() {
  const [length, setLength] = useState(20)
  const [options, setOptions] = useState<PasswordOptions>({ ...defaultPasswordOptions })
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const entropy = length * Math.log2(passwordPools(options).join('').length || 1)
  const strength = entropy >= 100 ? 4 : entropy >= 70 ? 3 : entropy >= 45 ? 2 : 1
  const labels: Record<keyof PasswordOptions, string> = {
    uppercase: 'Uppercase (A–Z)',
    lowercase: 'Lowercase (a–z)',
    numbers: 'Numbers (0–9)',
    symbols: 'Symbols (!@#$)',
    excludeAmbiguous: 'Exclude ambiguous characters (O, 0, I, l, 1, |)',
  }
  return (
    <div className="panel">
      <div className="field-row">
        <label className="field">
          Password length
          <input
            aria-label="Password length"
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
          <span>8–128 characters</span>
          <input
            aria-label="Adjust password length"
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
              setError(errorMessage(error))
              setPassword('')
            }
          }}
        >
          <RefreshCw size={15} />
          {password ? 'Regenerate password' : 'Generate password'}
        </Button>
        <CopyButton text={password} label="Copy password" />
      </div>
      {error && <Message kind="error">{error}</Message>}
      <div className="password-result" aria-label="Generated password" aria-live="polite">
        {password || <span className="helper-text">Your next password will appear here.</span>}
      </div>
      {password && (
        <>
          <div className="strength-meter" aria-hidden="true">
            {[1, 2, 3, 4].map((value) => (
              <span className={value <= strength ? 'filled' : ''} key={value} />
            ))}
          </div>
          <p className="strength-text">
            {['', 'Basic', 'Moderate', 'Strong', 'Very strong'][strength]} · General estimate based
            on length and character pool, not a security guarantee.
          </p>
        </>
      )}
      <p className="helper-text flex items-center gap-2">
        <ShieldCheck size={15} />
        Generated locally in your browser.
      </p>
    </div>
  )
}
