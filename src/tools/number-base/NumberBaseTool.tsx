import { useState } from 'react'
import { Button, CopyButton, Message } from '../../components/ui'
import { bases, convertNumberBase, type NumberBase } from '../../lib/numberBase'
import { errorMessage } from '../../lib/encoding'

export default function NumberBaseTool() {
  const [source, setSource] = useState<{ base: NumberBase; text: string }>({ base: 10, text: '' })
  const [uppercase, setUppercase] = useState(true)
  let values: Record<NumberBase, string> = { 2: '', 8: '', 10: '', 16: '' }
  let error = ''
  if (source.text.trim()) {
    try {
      values = convertNumberBase(source.text, source.base, uppercase)
    } catch (reason) {
      error = errorMessage(reason)
    }
  }
  return (
    <>
      <div className="panel">
        <p className="panel-subtitle">
          Edit any base to update the others. Values use BigInt for exact integer conversion.
        </p>
        <div className="color-fields">
          {bases.map(({ base, name }) => (
            <div className="field" key={base}>
              <label htmlFor={`base-${base}`}>
                {name} · base {base}
              </label>
              <div className="color-field-row">
                <input
                  id={`base-${base}`}
                  type="text"
                  spellCheck={false}
                  value={source.base === base ? source.text : values[base]}
                  onChange={(event) => setSource({ base, text: event.target.value })}
                  aria-invalid={source.base === base && !!error}
                  placeholder={
                    base === 16 ? 'ff' : base === 2 ? '11111111' : base === 8 ? '377' : '255'
                  }
                />
                <CopyButton
                  text={values[base]}
                  disabled={!!error}
                  label={`Copy ${name.toLowerCase()}`}
                />
              </div>
            </div>
          ))}
        </div>
        <div className="actions">
          <label className="flex items-center gap-2 text-xs">
            <input
              type="checkbox"
              checked={uppercase}
              onChange={(event) => {
                setUppercase(event.target.checked)
                if (source.base === 16 && !error) setSource({ base: 10, text: values[10] })
              }}
            />
            Uppercase hexadecimal
          </label>
          <Button onClick={() => setSource({ base: 10, text: '' })}>Clear</Button>
        </div>
      </div>
      {error && <Message kind="error">{error}</Message>}
      <p className="helper-text">
        Signed integers only. Optional 0b, 0o, and 0x prefixes are accepted in their matching
        fields. No floating-point conversion or precision loss. Maximum input: 4,096 digits.
      </p>
    </>
  )
}
