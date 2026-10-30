import { useMessageState } from '../../i18n/useMessageState'
import { useTranslation } from 'react-i18next'
import { ToolToolbar, ToolActions } from '../../components/ToolLayout'
import { useState } from 'react'
import { Button, CopyButton, DownloadButton, Editor, Message } from '../../components/ui'
import { formatXml, type XmlMode } from '../../lib/xml'
import { errorDescriptor } from '../../lib/encoding'

export default function XmlTool() {
  const { t } = useTranslation()
  const [input, setInput] = useState(''),
    [output, setOutput] = useState(''),
    [error, setError] = useMessageState()
  const [indent, setIndent] = useState('2'),
    [valid, setValid] = useState(false)
  function change(value: string) {
    setInput(value)
    setOutput('')
    setError('')
    setValid(false)
  }
  function run(mode: XmlMode) {
    try {
      const result = formatXml(input, mode, indent)
      setOutput(result)
      setError('')
      setValid(true)
    } catch (reason) {
      setError(errorDescriptor(reason))
      setOutput('')
      setValid(false)
    }
  }
  return (
    <>
      <ToolToolbar>
        <Button variant="primary" onClick={() => run('format')}>
          {t('toolUi.formatXml')}
        </Button>
        <Button onClick={() => run('minify')}>{t('toolUi.minifyXml')}</Button>
        <Button onClick={() => run('validate')}>{t('toolUi.validateXml')}</Button>
        <label className="toolbar-field">
          {t('toolUi.indentation')}
          <select value={indent} onChange={(e) => setIndent(e.target.value)}>
            <option value="2">{t('toolUi.spaces2')}</option>
            <option value="4">{t('toolUi.spaces4')}</option>
            <option value="tab">{t('toolUi.tabs')}</option>
          </select>
        </label>
        <Button onClick={() => change('')}>{t('toolUi.clear')}</Button>
      </ToolToolbar>
      {error && <Message kind="error">{error}</Message>}
      {valid && <Message kind="success">{t('toolUi.validXml')}</Message>}
      <div className="editor-grid">
        <Editor
          minHeight={360}
          label={t('toolUi.xmlInput')}
          value={input}
          onChange={change}
          placeholder={'<project><name>DevToolbox</name></project>'}
        />
        <Editor
          minHeight={360}
          label={t('toolUi.xmlOutput')}
          placeholder={t('toolUi.xmlHint')}
          value={output}
          actions={
            <ToolActions label={t('toolUi.outputActions')}>
              <CopyButton
                text={output}
                label={t('toolUi.copyOutput')}
                visibleLabel={t('common.copy')}
              />
              <DownloadButton
                text={output}
                filename="formatted.xml"
                mimeType="application/xml;charset=utf-8"
              />
            </ToolActions>
          }
          readOnly
        />
      </div>

      <p className="helper-text">{t('toolUi.xmlHelp')}</p>
    </>
  )
}
