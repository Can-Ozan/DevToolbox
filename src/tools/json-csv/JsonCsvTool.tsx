import { useMessageState } from '../../i18n/useMessageState'
import { useTranslation } from 'react-i18next'
import { ToolToolbar, ToolActions } from '../../components/ToolLayout'
import { useState } from 'react'
import { ArrowLeftRight } from 'lucide-react'
import { Button, CopyButton, DownloadButton, Editor, Message } from '../../components/ui'
import { csvToJson, jsonToCsv, type Delimiter } from '../../lib/jsonCsv'
import { errorDescriptor } from '../../lib/encoding'
import { JsonFileInput } from '../../workspace/JsonFileInput'

export default function JsonCsvTool() {
  const { t } = useTranslation()
  const [toCsv, setToCsv] = useState(true)
  const [input, setInput] = useState('')
  const [result, setResult] = useState<ReturnType<typeof jsonToCsv>>()
  const [delimiter, setDelimiter] = useState<Delimiter>(',')
  const [error, setError] = useMessageState()
  function clearResult() {
    setResult(undefined)
    setError('')
  }
  return (
    <>
      <JsonFileInput
        onText={(text) => {
          setInput(text)
          setToCsv(true)
          clearResult()
        }}
      />
      <ToolToolbar>
        <Button
          variant="primary"
          onClick={() => {
            try {
              setResult((toCsv ? jsonToCsv : csvToJson)(input, delimiter))
              setError('')
            } catch (reason) {
              setResult(undefined)
              setError(errorDescriptor(reason))
            }
          }}
        >
          {t(toCsv ? 'toolUi.toCsv' : 'toolUi.toJsonCsv')}
        </Button>
        <Button
          onClick={() => {
            setToCsv(!toCsv)
            if (result) setInput(result.output)
            clearResult()
          }}
        >
          <ArrowLeftRight size={15} />
          {t('toolUi.swapDirection')}
        </Button>
        <Button
          onClick={() => {
            setInput('')
            clearResult()
          }}
        >
          {t('toolUi.clear')}
        </Button>
        <label className="toolbar-field">
          {t('toolUi.delimiter')}
          <select
            value={delimiter}
            onChange={(event) => {
              setDelimiter(event.target.value as Delimiter)
              clearResult()
            }}
          >
            <option value=",">{t('toolUi.comma')}</option>
            <option value=";">{t('toolUi.semicolon')}</option>
            <option value={'\t'}>{t('toolUi.tab')}</option>
          </select>
        </label>
      </ToolToolbar>
      {error && <Message kind="error">{error}</Message>}
      <div className="editor-grid">
        <Editor
          label={toCsv ? t('toolUi.jsonInput') : t('toolUi.csvInput')}
          value={input}
          onChange={(value) => {
            setInput(value)
            clearResult()
          }}
          placeholder={toCsv ? '[{"name":"Can","age":20}]' : 'name,age\nCan,20'}
        />
        <Editor
          label={toCsv ? t('toolUi.csvOutput') : t('toolUi.jsonOutput')}
          value={result?.output ?? ''}
          actions={
            <ToolActions label={t('toolUi.outputActions')}>
              <CopyButton
                text={result?.output ?? ''}
                label={t('toolUi.copyOutput')}
                visibleLabel={t('common.copy')}
              />
              <DownloadButton
                text={result?.output ?? ''}
                filename={toCsv ? 'data.csv' : 'data.json'}
                mimeType={toCsv ? 'text/csv;charset=utf-8' : 'application/json;charset=utf-8'}
              />
            </ToolActions>
          }
          readOnly
          placeholder={t('toolUi.dataHint')}
        />
      </div>
      {result && (
        <p role="status">
          {t('toolUi.rowsColumns', { rows: result.rows, columns: result.columns })}
        </p>
      )}

      <p className="helper-text">{t('toolUi.csvHelp')}</p>
    </>
  )
}
