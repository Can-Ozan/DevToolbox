import { useMessageState } from '../../i18n/useMessageState'
import { useTranslation } from 'react-i18next'
import { ToolToolbar, ToolActions } from '../../components/ToolLayout'
import { useState } from 'react'
import { ArrowLeftRight } from 'lucide-react'
import { Button, CopyButton, DownloadButton, Editor, Message } from '../../components/ui'
import { convertJsonYaml } from '../../lib/jsonYaml'
import { errorDescriptor } from '../../lib/encoding'
import { JsonFileInput } from '../../workspace/JsonFileInput'

export default function JsonYamlTool() {
  const { t } = useTranslation()
  const [direction, setDirection] = useState<'json-yaml' | 'yaml-json'>('json-yaml')
  const [input, setInput] = useState('')
  const [output, setOutput] = useState('')
  const [error, setError] = useMessageState()
  const toYaml = direction === 'json-yaml'
  return (
    <>
      <JsonFileInput
        onText={(text) => {
          setInput(text)
          setDirection('json-yaml')
          setOutput('')
          setError('')
        }}
      />
      <ToolToolbar>
        <Button
          variant="primary"
          onClick={() => {
            try {
              setOutput(convertJsonYaml(input, direction))
              setError('')
            } catch (error) {
              setOutput('')
              setError(errorDescriptor(error))
            }
          }}
        >
          {t(toYaml ? 'toolUi.toYaml' : 'toolUi.toJsonYaml')}
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
          {t('toolUi.swapDirection')}
        </Button>
        <Button
          onClick={() => {
            setInput('')
            setOutput('')
            setError('')
          }}
        >
          {t('toolUi.clear')}
        </Button>
      </ToolToolbar>
      {error && <Message kind="error">{error}</Message>}
      <div className="editor-grid">
        <Editor
          label={toYaml ? t('toolUi.jsonInput') : t('toolUi.yamlInput')}
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
          label={toYaml ? t('toolUi.yamlOutput') : t('toolUi.jsonOutput')}
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
                filename={toYaml ? 'converted.yaml' : 'converted.json'}
                mimeType={
                  toYaml ? 'application/yaml;charset=utf-8' : 'application/json;charset=utf-8'
                }
              />
            </ToolActions>
          }
          readOnly
          placeholder={t('toolUi.convertedHint')}
        />
      </div>

      <p className="helper-text">{t('toolUi.yamlHelp')}</p>
    </>
  )
}
