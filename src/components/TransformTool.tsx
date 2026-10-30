import { useMessageState } from '../i18n/useMessageState'
import { useTranslation } from 'react-i18next'
import { ToolToolbar } from './ToolLayout'
import { useEffect, useState, type ReactNode } from 'react'
import { ArrowLeftRight, Eraser, Play } from 'lucide-react'
import { Button, CopyButton, Editor, Message } from './ui'
import { errorDescriptor } from '../lib/encoding'

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
  const { t } = useTranslation()
  const [input, setInput] = useState('')
  const [output, setOutput] = useState('')
  const [error, setError] = useMessageState()
  useEffect(() => {
    setOutput('')
    setError('')
  }, [encode, decode, setError])
  function run(transform: (value: string) => string) {
    try {
      setOutput(transform(input))
      setError('')
    } catch (error) {
      setError(errorDescriptor(error))
      setOutput('')
    }
  }
  return (
    <>
      <div>{children}</div>
      <ToolToolbar>
        <Button variant="primary" onClick={() => run(encode)}>
          <Play size={14} />
          {t('toolUi.encode')}
        </Button>
        <Button onClick={() => run(decode)}>{t('toolUi.decode')}</Button>
        <Button
          disabled={!input && !output}
          onClick={() => {
            setInput(output)
            setOutput(input)
            setError('')
          }}
        >
          <ArrowLeftRight size={15} />
          {t('toolUi.swap')}
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
          {t('toolUi.clear')}
        </Button>
      </ToolToolbar>
      {error && <Message kind="error">{error}</Message>}
      <div className="editor-grid">
        <Editor
          label={t('toolUi.input')}
          value={input}
          onChange={(value) => {
            setInput(value)
            setOutput('')
            setError('')
          }}
          placeholder={inputHint}
        />
        <Editor
          label={t('toolUi.output')}
          value={output}
          actions={
            <CopyButton
              text={output}
              label={t('toolUi.copyOutput')}
              visibleLabel={t('common.copy')}
            />
          }
          readOnly
          placeholder={t('toolUi.resultHint')}
        />
      </div>
    </>
  )
}
