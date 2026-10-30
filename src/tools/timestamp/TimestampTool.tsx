import { useMessageState } from '../../i18n/useMessageState'
import { useTranslation } from 'react-i18next'
import { useState } from 'react'
import { Clock3 } from 'lucide-react'
import { Button, CopyButton, Message } from '../../components/ui'
import { dateDetails, parseTimestamp } from '../../lib/timestamp'
import { errorDescriptor } from '../../lib/encoding'
export default function TimestampTool() {
  const { t } = useTranslation()
  const [timestamp, setTimestamp] = useState('')
  const [unit, setUnit] = useState<'seconds' | 'milliseconds'>('seconds')
  const [dateInput, setDateInput] = useState('')
  const [result, setResult] = useState<ReturnType<typeof dateDetails> | null>(null)
  const [error, setError] = useMessageState()
  function show(date: Date) {
    try {
      setResult(dateDetails(date))
      setError('')
    } catch (error) {
      setResult(null)
      setError(errorDescriptor(error))
    }
  }
  return (
    <>
      <div className="editor-grid">
        <section className="panel">
          <h2>{t('toolUi.timestampToDate')}</h2>
          <div className="field-row">
            <label className="field">
              {t('toolUi.unixTimestamp')}
              <input
                type="text"
                inputMode="decimal"
                placeholder="1700000000"
                value={timestamp}
                onChange={(event) => setTimestamp(event.target.value)}
              />
            </label>
            <label className="field">
              {t('toolUi.unit')}
              <select
                value={unit}
                onChange={(event) =>
                  setUnit(event.target.value === 'seconds' ? 'seconds' : 'milliseconds')
                }
              >
                <option value="seconds">{t('toolUi.seconds')}</option>
                <option value="milliseconds">{t('toolUi.milliseconds')}</option>
              </select>
            </label>
          </div>
          <Button
            variant="primary"
            onClick={() => {
              try {
                show(parseTimestamp(timestamp, unit))
              } catch (error) {
                setResult(null)
                setError(errorDescriptor(error))
              }
            }}
          >
            {t('toolUi.convertTimestamp')}
          </Button>
        </section>
        <section className="panel">
          <h2>{t('toolUi.dateToTimestamp')}</h2>
          <label className="field">
            {t('toolUi.localDate')}
            <input
              type="datetime-local"
              step="0.001"
              value={dateInput}
              onChange={(event) => setDateInput(event.target.value)}
            />
          </label>
          <div className="actions">
            <Button variant="primary" onClick={() => show(new Date(dateInput))}>
              {t('toolUi.convertDate')}
            </Button>
          </div>
        </section>
      </div>
      <div className="actions">
        <Button
          onClick={() => {
            const now = new Date()
            setTimestamp(
              String(unit === 'seconds' ? Math.floor(now.getTime() / 1000) : now.getTime()),
            )
            show(now)
          }}
        >
          <Clock3 size={15} />
          {t('toolUi.currentTime')}
        </Button>
        <Button
          variant="ghost"
          onClick={() => {
            setTimestamp('')
            setDateInput('')
            setResult(null)
            setError('')
          }}
        >
          {t('toolUi.clear')}
        </Button>
      </div>
      {error && <Message kind="error">{error}</Message>}
      {result && (
        <section className="panel">
          <div className="output-title">
            <h2>{t('toolUi.convertedDate')}</h2>
            <CopyButton
              text={Object.entries(result)
                .map(([key, value]) => `${key}: ${value}`)
                .join('\n')}
              label={t('toolUi.copyResults')}
            />
          </div>
          <dl className="data-table">
            {Object.entries(result).map(([key, value]) => (
              <div key={key}>
                <dt>
                  {{
                    'Local time': t('toolUi.localTime'),
                    'Unix seconds': t('toolUi.unixSeconds'),
                    'Unix milliseconds': t('toolUi.unixMilliseconds'),
                  }[key] ?? key}
                </dt>
                <dd>{value}</dd>
              </div>
            ))}
          </dl>
        </section>
      )}
      <p className="helper-text">{t('toolUi.timestampHelp')}</p>
    </>
  )
}
