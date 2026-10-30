import { useMessageState } from '../../i18n/useMessageState'
import { useTranslation } from 'react-i18next'
import { useState } from 'react'
import { Button, CopyButton, Editor, Message } from '../../components/ui'
import { generateLorem, type LoremUnit } from '../../lib/lorem'
import { errorDescriptor } from '../../lib/encoding'
export default function LoremTool() {
  const { t } = useTranslation()
  const [unit, setUnit] = useState<LoremUnit>('paragraphs')
  const [quantity, setQuantity] = useState(3)
  const [output, setOutput] = useState('')
  const [error, setError] = useMessageState()
  return (
    <>
      <div className="panel">
        <div className="field-row">
          <label className="field">
            {t('toolUi.generateBy')}
            <select
              value={unit}
              onChange={(event) => {
                const value = event.target.value
                if (value === 'paragraphs' || value === 'sentences' || value === 'words')
                  setUnit(value)
              }}
            >
              <option value="paragraphs">{t('toolUi.paragraphs')}</option>
              <option value="sentences">{t('toolUi.sentences')}</option>
              <option value="words">{t('toolUi.words')}</option>
            </select>
          </label>
          <label className="field">
            {t('toolUi.quantity')}
            <input
              type="number"
              min="1"
              max={unit === 'paragraphs' ? 100 : unit === 'sentences' ? 500 : 10000}
              value={Number.isNaN(quantity) ? '' : quantity}
              onChange={(event) => setQuantity(event.target.valueAsNumber)}
            />
          </label>
          <Button
            variant="primary"
            onClick={() => {
              try {
                setOutput(generateLorem(unit, quantity))
                setError('')
              } catch (error) {
                setError(errorDescriptor(error))
                setOutput('')
              }
            }}
          >
            {t('toolUi.generateText')}
          </Button>
        </div>
        <p className="helper-text">{t('toolUi.loremLimit')}</p>
      </div>
      {error && <Message kind="error">{error}</Message>}
      <div className="actions justify-end">
        <Button
          onClick={() => {
            setOutput('')
            setError('')
          }}
        >
          {t('toolUi.clear')}
        </Button>
        <CopyButton text={output} label={t('toolUi.copyText')} />
      </div>
      <Editor
        label={t('toolUi.generatedText')}
        value={output}
        readOnly
        placeholder={t('toolUi.loremHint')}
      />
    </>
  )
}
