import { renderMessage } from '../../i18n/messages'
import { useTranslation } from 'react-i18next'
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
import { errorDescriptor } from '../../lib/encoding'

export default function CronTool() {
  const { t } = useTranslation()
  const [values, setValues] = useState(() => cronValues('0 9 * * *'))
  const [modes, setModes] = useState<Partial<Record<CronKey, string>>>({})
  let expression = ''
  let error = ''
  try {
    expression = buildCron(values)
  } catch (reason) {
    error = renderMessage(errorDescriptor(reason), t)
  }
  return (
    <>
      <div className="panel">
        <label className="field">
          {t('toolUi.presets')}
          <select
            aria-label={t('toolUi.presets')}
            value={cronPresets.some((p) => p.expression === expression) ? expression : ''}
            onChange={(event) => {
              if (event.target.value) {
                setValues(cronValues(event.target.value))
                setModes({})
              }
            }}
          >
            <option value="" disabled>
              {t('toolUi.customExpression')}
            </option>
            {cronPresets.map((preset, index) => (
              <option key={preset.expression} value={preset.expression}>
                {t(
                  (
                    [
                      'toolUi.everyMinute',
                      'toolUi.every5',
                      'toolUi.everyHour',
                      'toolUi.everyDay',
                      'toolUi.everyWeekday',
                      'toolUi.everyWeek',
                      'toolUi.everyMonth',
                    ] as const
                  )[index],
                )}
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
                  {t(`toolUi.${field.key}`)}
                  <select
                    aria-label={t('toolUi.fieldMode', { field: t(`toolUi.${field.key}`) })}
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
                    <option value="every">{t('toolUi.everyValue')}</option>
                    <option value="specific">{t('toolUi.specificValue')}</option>
                    <option value="interval">{t('toolUi.interval')}</option>
                    <option value="custom">{t('toolUi.listRange')}</option>
                  </select>
                </label>
                {mode !== 'every' && (
                  <input
                    type="text"
                    aria-label={t('toolUi.fieldValue', { field: t(`toolUi.${field.key}`) })}
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
                  {field.key === 'weekday' ? t('toolUi.sundayZero') : ''}
                </span>
              </div>
            )
          })}
        </div>
      </div>
      {error && <Message kind="error">{error}</Message>}
      <div className="output-title">
        <h2>{t('toolUi.cronExpression')}</h2>
        <CopyButton text={expression} label={t('toolUi.copyCron')} />
      </div>
      <pre className="code-output" aria-label={t('toolUi.cronExpression')}>
        {expression || t('toolUi.fixCron')}
      </pre>
      {expression && (
        <Message>{describeCron(expression, (value) => renderMessage(value, t))}</Message>
      )}
      <div className="actions">
        <Button
          onClick={() => {
            setValues(cronValues('0 9 * * *'))
            setModes({})
          }}
        >
          {t('toolUi.reset')}
        </Button>
      </div>
      <p className="helper-text">{t('toolUi.cronHelp')}</p>
      <Message kind="warning">{t('toolUi.cronWarning')}</Message>
    </>
  )
}
