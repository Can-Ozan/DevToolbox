import { useState } from 'react'
import { CopyButton, Message } from '../../components/ui'
import { formatColor, parseColor, type ColorFormat } from '../../lib/color'
import { errorMessage } from '../../lib/encoding'
const initial = formatColor({ r: 119, g: 96, b: 215 })
export default function ColorTool() {
  const [values, setValues] = useState(initial)
  const [preview, setPreview] = useState(initial.hex)
  const [error, setError] = useState('')
  function change(format: ColorFormat, value: string) {
    try {
      const converted = formatColor(parseColor(value, format))
      setValues({ ...converted, [format]: value })
      setPreview(converted.hex)
      setError('')
    } catch (error) {
      setValues((current) => ({ ...current, [format]: value }))
      setError(errorMessage(error))
    }
  }
  return (
    <>
      <div className="panel color-workbench">
        <div className="color-swatch" style={{ backgroundColor: preview }}>
          <label className="color-picker-label">
            <input
              type="color"
              aria-label="Pick a color"
              value={preview}
              onChange={(event) => change('hex', event.target.value.toUpperCase())}
            />
            Choose a color
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
                  label={`Copy ${format.toUpperCase()}`}
                />
              </div>
              <span>
                {format === 'hex'
                  ? '3 or 6 hexadecimal digits'
                  : format === 'rgb'
                    ? 'Red, green, blue · each 0–255'
                    : 'Hue 0–360 · saturation and lightness 0–100%'}
              </span>
            </label>
          ))}
        </div>
      </div>
      {error && <Message kind="error">{error} The preview keeps the last valid color.</Message>}
      <p className="helper-text">
        Edit any format to update the others. This converter uses opaque sRGB colors; RGB channels
        are rounded to whole numbers.
      </p>
    </>
  )
}
