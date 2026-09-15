import { useState } from 'react'
import { Clock3 } from 'lucide-react'
import { Button, CopyButton, Message } from '../../components/ui'
import { dateDetails, parseTimestamp } from '../../lib/timestamp'
import { errorMessage } from '../../lib/encoding'
export default function TimestampTool() {
  const [timestamp, setTimestamp] = useState('')
  const [unit, setUnit] = useState<'seconds' | 'milliseconds'>('seconds')
  const [dateInput, setDateInput] = useState('')
  const [result, setResult] = useState<ReturnType<typeof dateDetails> | null>(null)
  const [error, setError] = useState('')
  function show(date: Date) {
    try {
      setResult(dateDetails(date))
      setError('')
    } catch (error) {
      setResult(null)
      setError(errorMessage(error))
    }
  }
  return (
    <>
      <div className="editor-grid">
        <section className="panel">
          <h2>Timestamp → date</h2>
          <div className="field-row">
            <label className="field">
              Unix timestamp
              <input
                type="text"
                inputMode="decimal"
                placeholder="1700000000"
                value={timestamp}
                onChange={(event) => setTimestamp(event.target.value)}
              />
            </label>
            <label className="field">
              Unit
              <select
                value={unit}
                onChange={(event) =>
                  setUnit(event.target.value === 'seconds' ? 'seconds' : 'milliseconds')
                }
              >
                <option value="seconds">Seconds</option>
                <option value="milliseconds">Milliseconds</option>
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
                setError(errorMessage(error))
              }
            }}
          >
            Convert timestamp
          </Button>
        </section>
        <section className="panel">
          <h2>Date → timestamp</h2>
          <label className="field">
            Local date and time
            <input
              type="datetime-local"
              step="0.001"
              value={dateInput}
              onChange={(event) => setDateInput(event.target.value)}
            />
          </label>
          <div className="actions">
            <Button variant="primary" onClick={() => show(new Date(dateInput))}>
              Convert date
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
          Use current time
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
          Clear
        </Button>
      </div>
      {error && <Message kind="error">{error}</Message>}
      {result && (
        <section className="panel">
          <div className="output-title">
            <h2>Converted date</h2>
            <CopyButton
              text={Object.entries(result)
                .map(([key, value]) => `${key}: ${value}`)
                .join('\n')}
              label="Copy results"
            />
          </div>
          <dl className="data-table">
            {Object.entries(result).map(([key, value]) => (
              <div key={key}>
                <dt>{key}</dt>
                <dd>{value}</dd>
              </div>
            ))}
          </dl>
        </section>
      )}
      <p className="helper-text">
        Date input uses your device’s local time zone. Daylight saving transitions follow your
        browser’s date rules.
      </p>
    </>
  )
}
