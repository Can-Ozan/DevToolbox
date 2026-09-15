import { useState } from 'react'
import { RefreshCw } from 'lucide-react'
import { Button, CopyButton, Message } from '../../components/ui'
import { generateUuid } from '../../lib/random'
import { errorMessage } from '../../lib/encoding'
export default function UuidTool() {
  const [quantity, setQuantity] = useState(5)
  const [values, setValues] = useState<string[]>([])
  const [error, setError] = useState('')
  return (
    <>
      <div className="panel">
        <div className="field-row">
          <label className="field">
            How many UUIDs?
            <select value={quantity} onChange={(event) => setQuantity(Number(event.target.value))}>
              {[1, 5, 10, 25, 50, 100].map((n) => (
                <option key={n} value={n}>
                  {n} {n === 1 ? 'UUID' : 'UUIDs'}
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
                setError(errorMessage(error))
              }
            }}
          >
            <RefreshCw size={15} />
            {values.length ? 'Regenerate' : 'Generate UUIDs'}
          </Button>
          <CopyButton text={values.join('\n')} label="Copy all" />
        </div>
        <p className="helper-text">Version 4 · Cryptographically secure random identifiers</p>
        {error && <Message kind="error">{error}</Message>}
        {values.length ? (
          <div className="result-list">
            {values.map((uuid, index) => (
              <div key={uuid} className="result-row">
                <span>{String(index + 1).padStart(2, '0')}</span>
                <code>{uuid}</code>
                <CopyButton text={uuid} label={`Copy UUID ${index + 1}`} />
              </div>
            ))}
          </div>
        ) : (
          <div className="empty-state compact">
            <h3>Unique IDs, ready when you are</h3>
            <p>Select a quantity and generate your first batch.</p>
          </div>
        )}
      </div>
    </>
  )
}
