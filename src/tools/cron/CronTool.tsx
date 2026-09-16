import { useState } from 'react'
import { Button, CopyButton, Message } from '../../components/ui'
import {
  buildCron,
  cronFields,
  cronPresets,
  cronValues,
  describeCron,
  type CronKey,
} from '../../lib/cron'
import { errorMessage } from '../../lib/encoding'

export default function CronTool() {
  const [values, setValues] = useState(() => cronValues('0 9 * * *'))
  const [modes, setModes] = useState<Partial<Record<CronKey, string>>>({})
  let expression = ''
  let error = ''
  try {
    expression = buildCron(values)
  } catch (reason) {
    error = errorMessage(reason)
  }
  return (
    <>
      <div className="panel">
        <label className="field">
          Common presets
          <select
            aria-label="Common presets"
            value={cronPresets.some((p) => p.expression === expression) ? expression : ''}
            onChange={(event) => {
              if (event.target.value) {
                setValues(cronValues(event.target.value))
                setModes({})
              }
            }}
          >
            <option value="" disabled>
              Custom expression
            </option>
            {cronPresets.map((preset) => (
              <option key={preset.expression} value={preset.expression}>
                {preset.label}
              </option>
            ))}
          </select>
        </label>
        <div className="field-row" style={{ marginTop: 22 }}>
          {cronFields.map((field) => {
            const value = values[field.key]
            const mode =
              modes[field.key] ??
              (value === '*'
                ? 'every'
                : value.startsWith('*/')
                  ? 'interval'
                  : /^\d+$/.test(value)
                    ? 'specific'
                    : 'custom')
            return (
              <div className="field" key={field.key}>
                <label className="field">
                  {field.label}
                  <select
                    aria-label={`${field.label} mode`}
                    value={mode}
                    onChange={(event) => {
                      const mode = event.target.value
                      setModes({ ...modes, [field.key]: mode })
                      setValues({
                        ...values,
                        [field.key]:
                          mode === 'every' ? '*' : mode === 'interval' ? '*/1' : String(field.min),
                      })
                    }}
                  >
                    <option value="every">Every value</option>
                    <option value="specific">Specific value</option>
                    <option value="interval">Interval</option>
                    <option value="custom">List / range</option>
                  </select>
                </label>
                {mode !== 'every' && (
                  <input
                    type="text"
                    aria-label={`${field.label} value`}
                    value={mode === 'interval' ? value.replace(/^\*\//, '') : value}
                    onChange={(event) =>
                      setValues({
                        ...values,
                        [field.key]:
                          mode === 'interval' ? `*/${event.target.value}` : event.target.value,
                      })
                    }
                    placeholder={mode === 'interval' ? '5' : `${field.min}–${field.max}`}
                  />
                )}
                <span>
                  {field.min}–{field.max}
                  {field.key === 'weekday' ? ' · 0 = Sunday' : ''}
                </span>
              </div>
            )
          })}
        </div>
      </div>
      {error && <Message kind="error">{error}</Message>}
      <div className="output-title">
        <h2>Cron expression</h2>
        <CopyButton text={expression} label="Copy cron expression" />
      </div>
      <pre className="code-output" aria-label="Cron expression">
        {expression || 'Fix the fields above to create an expression.'}
      </pre>
      {expression && <Message>{describeCron(expression)}</Message>}
      <div className="actions">
        <Button
          onClick={() => {
            setValues(cronValues('0 9 * * *'))
            setModes({})
          }}
        >
          Reset
        </Button>
      </div>
      <p className="helper-text">
        Order: minute · hour · day of month · month · day of week. Intervals restart within each
        field. Dates that do not exist are skipped. When both day fields are restricted, common cron
        implementations match either field.
      </p>
      <Message kind="warning">
        Cron behavior, time zones, and daylight saving handling may vary between platforms. Check
        your scheduler’s documentation. This tool builds expressions; it does not schedule jobs.
      </Message>
    </>
  )
}
