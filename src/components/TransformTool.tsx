import { useEffect, useState, type ReactNode } from 'react'
import { ArrowLeftRight, Eraser, Play } from 'lucide-react'
import { Button, CopyButton, Editor, Message } from './ui'
import { errorMessage } from '../lib/encoding'

export default function TransformTool({
  encode,
  decode,
  inputHint,
  children,
}: {
  encode: (text: string) => string
  decode: (text: string) => string
  inputHint: string
  children?: ReactNode
}) {
  const [input, setInput] = useState('')
  const [output, setOutput] = useState('')
  const [error, setError] = useState('')
  useEffect(() => {
    setOutput('')
    setError('')
  }, [encode, decode])
  function run(transform: (value: string) => string) {
    try {
      setOutput(transform(input))
      setError('')
    } catch (error) {
      setError(errorMessage(error))
      setOutput('')
    }
  }
  return (
    <>
      <div>{children}</div>
      <div className="actions">
        <Button variant="primary" onClick={() => run(encode)}>
          <Play size={14} />
          Encode
        </Button>
        <Button onClick={() => run(decode)}>Decode</Button>
        <Button
          disabled={!input && !output}
          onClick={() => {
            setInput(output)
            setOutput(input)
            setError('')
          }}
        >
          <ArrowLeftRight size={15} />
          Swap
        </Button>
        <Button
          variant="ghost"
          onClick={() => {
            setInput('')
            setOutput('')
            setError('')
          }}
        >
          <Eraser size={15} />
          Clear
        </Button>
        <span className="push-right">
          <CopyButton text={output} label="Copy output" />
        </span>
      </div>
      {error && <Message kind="error">{error}</Message>}
      <div className="editor-grid">
        <Editor
          label="Input"
          value={input}
          onChange={(value) => {
            setInput(value)
            setOutput('')
            setError('')
          }}
          placeholder={inputHint}
        />
        <Editor
          label="Output"
          value={output}
          readOnly
          placeholder="Your result will appear here…"
        />
      </div>
    </>
  )
}
