import { useState } from 'react'
import { Button, CopyButton, Editor, Message } from '../../components/ui'
import { generateLorem, type LoremUnit } from '../../lib/lorem'
import { errorMessage } from '../../lib/encoding'
export default function LoremTool() {
  const [unit, setUnit] = useState<LoremUnit>('paragraphs')
  const [quantity, setQuantity] = useState(3)
  const [output, setOutput] = useState('')
  const [error, setError] = useState('')
  return (
    <>
      <div className="panel">
        <div className="field-row">
          <label className="field">
            Generate by
            <select
              value={unit}
              onChange={(event) => {
                const value = event.target.value
                if (value === 'paragraphs' || value === 'sentences' || value === 'words')
                  setUnit(value)
              }}
            >
              <option value="paragraphs">Paragraphs</option>
              <option value="sentences">Sentences</option>
              <option value="words">Words</option>
            </select>
          </label>
          <label className="field">
            Quantity
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
                setError(errorMessage(error))
                setOutput('')
              }
            }}
          >
            Generate text
          </Button>
        </div>
        <p className="helper-text">Up to 100 paragraphs, 500 sentences, or 10,000 words.</p>
      </div>
      {error && <Message kind="error">{error}</Message>}
      <div className="actions justify-end">
        <Button
          onClick={() => {
            setOutput('')
            setError('')
          }}
        >
          Clear
        </Button>
        <CopyButton text={output} label="Copy text" />
      </div>
      <Editor
        label="Generated text"
        value={output}
        readOnly
        placeholder="A little placeholder text for your next big idea…"
      />
    </>
  )
}
