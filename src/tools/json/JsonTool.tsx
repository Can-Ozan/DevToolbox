import { ToolToolbar, ToolActions } from '../../components/ToolLayout'
import { useState } from 'react'
import { Braces, CheckCheck, Eraser, Minimize2 } from 'lucide-react'
import { Button, CopyButton, DownloadButton, Editor, Message } from '../../components/ui'
import { errorMessage } from '../../lib/encoding'
import { usePreferences } from '../../storage/preferences'

export default function JsonTool() {
  const [input, setInput] = useState('')
  const [output, setOutput] = useState('')
  const [error, setError] = useState('')
  const [valid, setValid] = useState(false)
  const { jsonIndent } = usePreferences()
  const [indent, setIndent] = useState<string>(jsonIndent)
  function run(mode: 'format' | 'minify' | 'validate') {
    try {
      if (!input.trim()) throw new Error('Paste some JSON to get started.')
      const parsed: unknown = JSON.parse(input)
      setOutput(JSON.stringify(parsed, null, mode === 'minify' ? 0 : Number(indent)))
      setValid(true)
      setError('')
    } catch (error) {
      setError(errorMessage(error))
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
      <ToolToolbar>
        <Button variant="primary" onClick={() => run('format')}>
          <Braces size={15} />
          Format JSON
        </Button>
        <Button onClick={() => run('minify')}>
          <Minimize2 size={15} />
          Minify
        </Button>
        <Button onClick={() => run('validate')}>
          <CheckCheck size={15} />
          Validate
        </Button>
        <label className="toolbar-field">
          Indent
          <select
            aria-label="Indentation"
            value={indent}
            onChange={(event) => setIndent(event.target.value)}
          >
            <option value="2">2 spaces</option>
            <option value="4">4 spaces</option>
          </select>
        </label>
        <Button variant="ghost" onClick={() => change('')}>
          <Eraser size={15} />
          Clear
        </Button>
        <Button
          variant="ghost"
          onClick={() =>
            change('{"project":"DevToolbox","private":true,"tools":["JSON","Base64","UUID"]}')
          }
        >
          Load sample
        </Button>
      </ToolToolbar>
      {error && <Message kind="error">{error}</Message>}
      {valid && <Message kind="success">Valid JSON. Your data is ready to use.</Message>}
      <div className="editor-grid">
        <Editor
          minHeight={360}
          label="JSON input"
          value={input}
          onChange={change}
          placeholder={'{\n  "hello": "world"\n}'}
        />
        <Editor
          minHeight={360}
          label="JSON output"
          value={output}
          actions={
            <ToolActions label="Output actions">
              <CopyButton text={output} label="Copy output" visibleLabel="Copy" />
              <DownloadButton text={output} filename="formatted.json" />
            </ToolActions>
          }
          readOnly
          placeholder="Formatted JSON will appear here…"
        />
      </div>

      <p className="helper-text">
        JSON uses double-quoted keys and strings. Comments and trailing commas are not supported.
        JavaScript number precision applies to very large integers.
      </p>
    </>
  )
}
