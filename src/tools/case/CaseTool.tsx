import { useTranslation } from 'react-i18next'
import { useState } from 'react'
import { Button, CopyButton, Editor } from '../../components/ui'
import { convertCases } from '../../lib/caseConverter'

export default function CaseTool() {
  const { t } = useTranslation()
  const [input, setInput] = useState('')
  const labels: Record<string, string> = {
    'Title Case': t('toolUi.titleCase'),
    'Sentence case': t('toolUi.sentenceCase'),
  }
  const results = convertCases(input)
  return (
    <>
      <Editor
        label={t('toolUi.textInput')}
        value={input}
        onChange={setInput}
        minHeight={140}
        placeholder={t('toolUi.caseHint')}
      />
      <div className="actions">
        <CopyButton
          text={
            input
              ? Object.entries(results)
                  .map(([name, value]) => `${name}: ${value}`)
                  .join('\n')
              : ''
          }
          label={t('toolUi.copyAll')}
        />
        <Button onClick={() => setInput('')}>{t('toolUi.clear')}</Button>
      </div>
      <div className="result-list">
        {Object.entries(results).map(([name, value]) => (
          <section className="panel" key={name}>
            <div className="output-title" style={{ marginTop: 0 }}>
              <h2>{labels[name] ?? name}</h2>
              <CopyButton
                text={value}
                label={t('toolUi.copyNamed', { name: labels[name] ?? name })}
              />
            </div>
            <pre className="code-output">{value || '—'}</pre>
          </section>
        ))}
      </div>
      <p className="helper-text">{t('toolUi.caseHelp')}</p>
    </>
  )
}
