import { useState } from 'react'
import { ArrowLeftRight } from 'lucide-react'
import { Button, CopyButton, DownloadButton, Editor, Message } from '../../components/ui'
import { convertJsonYaml } from '../../lib/jsonYaml'
import { errorMessage } from '../../lib/encoding'

export default function JsonYamlTool() {
  const [direction, setDirection] = useState<'json-yaml' | 'yaml-json'>('json-yaml')
  const [input, setInput] = useState('')
  const [output, setOutput] = useState('')
  const [error, setError] = useState('')
  const toYaml = direction === 'json-yaml'
  return (
    <>
      <div className="actions">
        <Button
          variant="primary"
          onClick={() => {
            try {
              setOutput(convertJsonYaml(input, direction))
              setError('')
            } catch (error) {
              setOutput('')
              setError(errorMessage(error))
            }
          }}
        >
          Convert {toYaml ? 'JSON to YAML' : 'YAML to JSON'}
        </Button>
        <Button
          onClick={() => {
            setDirection(toYaml ? 'yaml-json' : 'json-yaml')
            if (output) setInput(output)
            setOutput('')
            setError('')
          }}
        >
          <ArrowLeftRight size={15} />
          Swap direction
        </Button>
        <Button
          onClick={() => {
            setInput('')
            setOutput('')
            setError('')
          }}
        >
          Clear
        </Button>
      </div>
      {error && <Message kind="error">{error}</Message>}
      <div className="editor-grid">
        <Editor
          label={toYaml ? 'JSON input' : 'YAML input'}
          value={input}
          onChange={(value) => {
            setInput(value)
            setOutput('')
            setError('')
          }}
          placeholder={
            toYaml
              ? '{"hello":"世界","items":[true,null,42]}'
              : 'hello: 世界\nitems:\n  - true\n  - null\n  - 42'
          }
        />
        <Editor
          label={toYaml ? 'YAML output' : 'JSON output'}
          value={output}
          readOnly
          placeholder="Your converted document will appear here…"
        />
      </div>
      <div className="actions justify-end">
        <CopyButton text={output} label="Copy output" />
        <DownloadButton
          text={output}
          filename={toYaml ? 'converted.yaml' : 'converted.json'}
          mimeType={toYaml ? 'application/yaml;charset=utf-8' : 'application/json;charset=utf-8'}
        />
      </div>
      <p className="helper-text">
        Uses YAML 1.2 core types. JSON requires string keys and finite numbers. Comments and
        YAML-specific formatting are not preserved.
      </p>
    </>
  )
}
