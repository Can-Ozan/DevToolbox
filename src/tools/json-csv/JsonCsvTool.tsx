import { useState } from 'react'
import { ArrowLeftRight } from 'lucide-react'
import { Button, CopyButton, DownloadButton, Editor, Message } from '../../components/ui'
import { csvToJson, jsonToCsv, type Delimiter } from '../../lib/jsonCsv'
import { errorMessage } from '../../lib/encoding'

export default function JsonCsvTool() {
  const [toCsv, setToCsv] = useState(true)
  const [input, setInput] = useState('')
  const [result, setResult] = useState<ReturnType<typeof jsonToCsv>>()
  const [delimiter, setDelimiter] = useState<Delimiter>(',')
  const [error, setError] = useState('')
  function clearResult() {
    setResult(undefined)
    setError('')
  }
  return (
    <>
      <div className="actions">
        <Button
          variant="primary"
          onClick={() => {
            try {
              setResult((toCsv ? jsonToCsv : csvToJson)(input, delimiter))
              setError('')
            } catch (reason) {
              setResult(undefined)
              setError(errorMessage(reason))
            }
          }}
        >
          Convert {toCsv ? 'JSON to CSV' : 'CSV to JSON'}
        </Button>
        <Button
          onClick={() => {
            setToCsv(!toCsv)
            if (result) setInput(result.output)
            clearResult()
          }}
        >
          <ArrowLeftRight size={15} />
          Swap direction
        </Button>
        <Button
          onClick={() => {
            setInput('')
            clearResult()
          }}
        >
          Clear
        </Button>
        <label className="field">
          Delimiter
          <select
            value={delimiter}
            onChange={(event) => {
              setDelimiter(event.target.value as Delimiter)
              clearResult()
            }}
          >
            <option value=",">Comma</option>
            <option value=";">Semicolon</option>
            <option value={'\t'}>Tab</option>
          </select>
        </label>
      </div>
      {error && <Message kind="error">{error}</Message>}
      <div className="editor-grid">
        <Editor
          label={toCsv ? 'JSON input' : 'CSV input'}
          value={input}
          onChange={(value) => {
            setInput(value)
            clearResult()
          }}
          placeholder={toCsv ? '[{"name":"Can","age":20}]' : 'name,age\nCan,20'}
        />
        <Editor
          label={toCsv ? 'CSV output' : 'JSON output'}
          value={result?.output ?? ''}
          readOnly
          placeholder="Converted data will appear here…"
        />
      </div>
      {result && (
        <p role="status">
          {result.rows} rows · {result.columns} columns
        </p>
      )}
      <div className="actions justify-end">
        <CopyButton text={result?.output ?? ''} label="Copy output" />
        <DownloadButton
          text={result?.output ?? ''}
          filename={toCsv ? 'data.csv' : 'data.json'}
          mimeType={toCsv ? 'text/csv;charset=utf-8' : 'application/json;charset=utf-8'}
        />
      </div>
      <p className="helper-text">
        JSON accepts flat objects only. Columns follow their first appearance; missing values and
        null become empty cells. CSV uses the first row as unique headers and keeps values as
        strings, including numbers. Blank lines are skipped; nested values are rejected. Up to
        200,000 input characters, 10,000 rows, 200 columns and 100,000 cells. Inputs stay in memory.
      </p>
    </>
  )
}
