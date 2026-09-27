import { ToolToolbar, ToolActions } from '../../components/ToolLayout'
import { useState } from 'react'
import { Button, CopyButton, DownloadButton, Editor, Message } from '../../components/ui'
import { formatXml, type XmlMode } from '../../lib/xml'
import { errorMessage } from '../../lib/encoding'

export default function XmlTool() {
  const [input, setInput] = useState(''),
    [output, setOutput] = useState(''),
    [error, setError] = useState('')
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
      setError(errorMessage(reason))
      setOutput('')
      setValid(false)
    }
  }
  return (
    <>
      <ToolToolbar>
        <Button variant="primary" onClick={() => run('format')}>
          Format XML
        </Button>
        <Button onClick={() => run('minify')}>Minify XML</Button>
        <Button onClick={() => run('validate')}>Validate XML</Button>
        <label className="toolbar-field">
          Indentation
          <select value={indent} onChange={(e) => setIndent(e.target.value)}>
            <option value="2">2 spaces</option>
            <option value="4">4 spaces</option>
            <option value="tab">Tabs</option>
          </select>
        </label>
        <Button onClick={() => change('')}>Clear</Button>
      </ToolToolbar>
      {error && <Message kind="error">{error}</Message>}
      {valid && <Message kind="success">Valid XML.</Message>}
      <div className="editor-grid">
        <Editor
          minHeight={360}
          label="XML input"
          value={input}
          onChange={change}
          placeholder={'<project><name>DevToolbox</name></project>'}
        />
        <Editor
          minHeight={360}
          label="XML output"
          placeholder="Formatted XML will appear here…"
          value={output}
          actions={
            <ToolActions label="Output actions">
              <CopyButton text={output} label="Copy output" visibleLabel="Copy" />
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

      <p className="helper-text">
        Local parsing only. DTD/entity declarations are rejected; no external resources are fetched.
        Mixed text and xml:space content are preserved. Up to 200,000 characters and 100 nesting
        levels.
      </p>
    </>
  )
}
