import { renderMessage } from '../../i18n/messages'
import { useTranslation } from 'react-i18next'
import { useState } from 'react'
import { Button, CopyButton, Message } from '../../components/ui'
import { bases, convertNumberBase, type NumberBase } from '../../lib/numberBase'
import { errorDescriptor } from '../../lib/encoding'

export default function NumberBaseTool() {
  const { t } = useTranslation()
  const names: Record<NumberBase, string> = {
    2: t('toolUi.binary'),
    8: t('toolUi.octal'),
    10: t('toolUi.decimal'),
    16: t('toolUi.hexadecimal'),
  }
  const [source, setSource] = useState<{ base: NumberBase; text: string }>({ base: 10, text: '' })
  const [uppercase, setUppercase] = useState(true)
  let values: Record<NumberBase, string> = { 2: '', 8: '', 10: '', 16: '' }
  let error = ''
  if (source.text.trim()) {
    try {
      values = convertNumberBase(source.text, source.base, uppercase)
    } catch (reason) {
      error = renderMessage(errorDescriptor(reason), t)
    }
  }
  return (
    <>
      <div className="panel">
        <p className="panel-subtitle">{t('toolUi.numberIntro')}</p>
        <div className="color-fields">
          {bases.map(({ base }) => (
            <div className="field" key={base}>
              <label htmlFor={`base-${base}`}>
                {t('toolUi.baseLabel', { name: names[base], base })}
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
                  label={t('toolUi.copyNamed', { name: names[base].toLowerCase() })}
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
            {t('toolUi.uppercaseHex')}
          </label>
          <Button onClick={() => setSource({ base: 10, text: '' })}>{t('toolUi.clear')}</Button>
        </div>
      </div>
      {error && <Message kind="error">{error}</Message>}
      <p className="helper-text">{t('toolUi.numberHelp')}</p>
    </>
  )
}
