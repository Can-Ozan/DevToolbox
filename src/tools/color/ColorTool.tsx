import { useMessageState } from '../../i18n/useMessageState'
import { useTranslation } from 'react-i18next'
import { useState } from 'react'
import { CopyButton, Message } from '../../components/ui'
import { formatColor, parseColor, type ColorFormat } from '../../lib/color'
import { errorDescriptor } from '../../lib/encoding'
import { usePreferences } from '../../storage/preferences'
const initial = formatColor({ r: 119, g: 96, b: 215 })
export default function ColorTool() {
  const { t } = useTranslation()
  const { hexCase } = usePreferences()
  const letterCase = (value: string) =>
    hexCase === 'lower' ? value.toLowerCase() : value.toUpperCase()
  const [values, setValues] = useState({ ...initial, hex: letterCase(initial.hex) })
  const [preview, setPreview] = useState(initial.hex)
  const [error, setError] = useMessageState()
  function change(format: ColorFormat, value: string) {
    try {
      const converted = formatColor(parseColor(value, format))
      converted.hex = letterCase(converted.hex)
      setValues({ ...converted, [format]: value })
      setPreview(converted.hex)
      setError('')
    } catch (error) {
      setValues((current) => ({ ...current, [format]: value }))
      setError(errorDescriptor(error))
    }
  }
  return (
    <>
      <div className="panel color-workbench">
        <div className="color-swatch" style={{ backgroundColor: preview }}>
          <label className="color-picker-label">
            <input
              type="color"
              aria-label={t('toolUi.pickColor')}
              value={preview}
              onChange={(event) => change('hex', letterCase(event.target.value))}
            />
            {t('toolUi.chooseColor')}
          </label>
        </div>
        <div className="color-fields">
          {(['hex', 'rgb', 'hsl'] as const).map((format) => (
            <label className="field" key={format}>
              {format.toUpperCase()}
              <div className="color-field-row">
                <input
                  type="text"
                  aria-label={format.toUpperCase()}
                  value={values[format]}
                  onChange={(event) => change(format, event.target.value)}
                  spellCheck={false}
                />
                <CopyButton
                  disabled={!!error}
                  text={values[format]}
                  label={t('toolUi.copyNamed', { name: format.toUpperCase() })}
                />
              </div>
              <span>
                {format === 'hex'
                  ? t('toolUi.hexHelp')
                  : format === 'rgb'
                    ? t('toolUi.rgbHelp')
                    : t('toolUi.hslHelp')}
              </span>
            </label>
          ))}
        </div>
      </div>
      {error && (
        <Message kind="error">
          {error} {t('toolUi.lastColor')}
        </Message>
      )}
      <p className="helper-text">{t('toolUi.colorHelp')}</p>
    </>
  )
}
