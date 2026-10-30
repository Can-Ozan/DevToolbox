import { messageError } from '../../i18n/messages'
import { useMessageState } from '../../i18n/useMessageState'
import { useTranslation } from 'react-i18next'
import { ToolToolbar, ToolActions } from '../../components/ToolLayout'
import { useState } from 'react'
import { Braces, CheckCheck, Eraser, Minimize2 } from 'lucide-react'
import { Button, CopyButton, DownloadButton, Editor, Message } from '../../components/ui'
import { errorDescriptor } from '../../lib/encoding'
import { usePreferences } from '../../storage/preferences'
import { JsonFileInput } from '../../workspace/JsonFileInput'

export default function JsonTool() {
  const { t } = useTranslation()
  const [input, setInput] = useState('')
  const [output, setOutput] = useState('')
  const [error, setError] = useMessageState()
  const [valid, setValid] = useState(false)
  const { jsonIndent } = usePreferences()
  const [indent, setIndent] = useState<string>(jsonIndent)
  function run(mode: 'format' | 'minify' | 'validate') {
    try {
      if (!input.trim())
        throw messageError('toolErrors.jsonEmpty', 'Paste some JSON to get started.')
      const parsed: unknown = JSON.parse(input)
      setOutput(JSON.stringify(parsed, null, mode === 'minify' ? 0 : Number(indent)))
      setValid(true)
      setError('')
    } catch (error) {
      setError(errorDescriptor(error))
      setValid(false)
      setOutput('')
    }
  }
  function change(value: string) {
    setInput(value)
    setValid(false)
    setError('')
    setOutput('')
  }
  return (
    <>
      <JsonFileInput onText={change} />
      <ToolToolbar>
        <Button variant="primary" onClick={() => run('format')}>
          <Braces size={15} />
          {t('toolUi.formatJson')}
        </Button>
        <Button onClick={() => run('minify')}>
          <Minimize2 size={15} />
          {t('toolUi.minify')}
        </Button>
        <Button onClick={() => run('validate')}>
          <CheckCheck size={15} />
          {t('toolUi.validate')}
        </Button>
        <label className="toolbar-field">
          {t('toolUi.indent')}
          <select
            aria-label={t('toolUi.indentation')}
            value={indent}
            onChange={(event) => setIndent(event.target.value)}
          >
            <option value="2">{t('toolUi.spaces2')}</option>
            <option value="4">{t('toolUi.spaces4')}</option>
          </select>
        </label>
        <Button variant="ghost" onClick={() => change('')}>
          <Eraser size={15} />
          {t('toolUi.clear')}
        </Button>
        <Button
          variant="ghost"
          onClick={() =>
            change('{"project":"DevToolbox","private":true,"tools":["JSON","Base64","UUID"]}')
          }
        >
          {t('toolUi.loadSample')}
        </Button>
      </ToolToolbar>
      {error && <Message kind="error">{error}</Message>}
      {valid && <Message kind="success">{t('toolUi.validJson')}</Message>}
      <div className="editor-grid">
        <Editor
          minHeight={360}
          label={t('toolUi.jsonInput')}
          value={input}
          onChange={change}
          placeholder={'{\n  "hello": "world"\n}'}
        />
        <Editor
          minHeight={360}
          label={t('toolUi.jsonOutput')}
          value={output}
          actions={
            <ToolActions label={t('toolUi.outputActions')}>
              <CopyButton
                text={output}
                label={t('toolUi.copyOutput')}
                visibleLabel={t('common.copy')}
              />
              <DownloadButton text={output} filename="formatted.json" />
            </ToolActions>
          }
          readOnly
          placeholder={t('toolUi.jsonHint')}
        />
      </div>

      <p className="helper-text">{t('toolUi.jsonHelp')}</p>
    </>
  )
}
