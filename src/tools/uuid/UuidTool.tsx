import { useMessageState } from '../../i18n/useMessageState'
import { useTranslation } from 'react-i18next'
import { useState } from 'react'
import { RefreshCw } from 'lucide-react'
import { Button, CopyButton, Message } from '../../components/ui'
import { generateUuid } from '../../lib/random'
import { errorDescriptor } from '../../lib/encoding'
export default function UuidTool() {
  const { t } = useTranslation()
  const [quantity, setQuantity] = useState(5)
  const [values, setValues] = useState<string[]>([])
  const [error, setError] = useMessageState()
  return (
    <>
      <div className="panel">
        <div className="field-row">
          <label className="field">
            {t('toolUi.uuidCount')}
            <select value={quantity} onChange={(event) => setQuantity(Number(event.target.value))}>
              {[1, 5, 10, 25, 50, 100].map((n) => (
                <option key={n} value={n}>
                  {t('toolUi.uuidTotal', { count: n })}
                </option>
              ))}
            </select>
          </label>
          <Button
            variant="primary"
            onClick={() => {
              try {
                setValues(Array.from({ length: quantity }, generateUuid))
                setError('')
              } catch (error) {
                setError(errorDescriptor(error))
              }
            }}
          >
            <RefreshCw size={15} />
            {values.length ? t('toolUi.regenerate') : t('toolUi.generateUuids')}
          </Button>
          <CopyButton text={values.join('\n')} label={t('toolUi.copyAll')} />
        </div>
        <p className="helper-text">{t('toolUi.uuidHelp')}</p>
        {error && <Message kind="error">{error}</Message>}
        {values.length ? (
          <div className="result-list">
            {values.map((uuid, index) => (
              <div key={uuid} className="result-row">
                <span>{String(index + 1).padStart(2, '0')}</span>
                <code>{uuid}</code>
                <CopyButton
                  text={uuid}
                  label={t('toolUi.copyNamed', { name: `UUID ${index + 1}` })}
                />
              </div>
            ))}
          </div>
        ) : (
          <div className="empty-state compact">
            <h3>{t('toolUi.uuidEmpty')}</h3>
            <p>{t('toolUi.uuidEmptyHelp')}</p>
          </div>
        )}
      </div>
    </>
  )
}
