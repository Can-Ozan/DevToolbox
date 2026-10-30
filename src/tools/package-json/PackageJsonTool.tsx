import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { ToolToolbar } from '../../components/ToolLayout'
import { Button, CopyButton, DownloadButton, Editor, Message } from '../../components/ui'
import { JsonFileInput } from '../../workspace/JsonFileInput'
import { errorDescriptor } from '../../lib/encoding'
import { renderMessage } from '../../i18n/messages'
import { analyzePackage, packageSummary, type PackageAnalysis } from './analyzePackage'

export default function PackageJsonTool() {
  const { t } = useTranslation()
  const [input, setInput] = useState('')
  const [result, setResult] = useState<PackageAnalysis>()
  const [error, setError] = useState('')
  function change(text: string) {
    setInput(text)
    setResult(undefined)
    setError('')
  }
  function analyze(text: string) {
    setInput(text)
    try {
      setResult(analyzePackage(text))
      setError('')
    } catch (reason) {
      setResult(undefined)
      setError(renderMessage(errorDescriptor(reason), t))
    }
  }
  return (
    <>
      <JsonFileInput onText={analyze} />
      <ToolToolbar>
        <Button variant="primary" onClick={() => analyze(input)}>
          {t('inspection.analyze')}
        </Button>
        <Button onClick={() => change('')}>{t('toolUi.clear')}</Button>
        <CopyButton
          text={
            result
              ? packageSummary(result, {
                  title: t('inspection.summaryTitle'),
                  scripts: t('inspection.summaryScripts'),
                  diagnostics: t('inspection.summaryDiagnostics'),
                  help: t('inspection.summaryHelp'),
                  notDeclared: t('inspection.notDeclared'),
                })
              : ''
          }
          label={t('inspection.copySummary')}
        />
        <DownloadButton
          text={result ? JSON.stringify(result, null, 2) : ''}
          filename="package-analysis.json"
          mimeType="application/json;charset=utf-8"
        />
      </ToolToolbar>
      <Editor
        label={t('inspection.packageInput')}
        value={input}
        onChange={change}
        placeholder={'{ "name": "my-project", "version": "1.0.0", "private": true }'}
      />
      {error && <Message kind="error">{error}</Message>}
      {result && (
        <>
          <section className="panel file-output package-analysis" aria-label="Project summary">
            <h2>{t('inspection.summary')}</h2>
            <dl className="result-stats">
              {result.overview.map(([key, value]) => (
                <div key={key}>
                  <dt>{key}</dt>
                  <dd>{value}</dd>
                </div>
              ))}
            </dl>
          </section>
          <section
            className="panel file-output package-analysis"
            aria-label={t('inspection.dependencies')}
          >
            <h2>{t('inspection.dependencies')}</h2>
            {result.dependencies.map(({ group, entries }) => (
              <details key={group}>
                <summary>
                  {group} ({entries.length})
                </summary>
                {entries.length ? (
                  <dl className="analysis-entries">
                    {entries.map(([name, version]) => (
                      <div key={name}>
                        <dt>{name || '(empty name)'}</dt>
                        <dd>{version}</dd>
                      </div>
                    ))}
                  </dl>
                ) : (
                  <p className="helper-text">{t('inspection.noDeclarations')}</p>
                )}
              </details>
            ))}
          </section>
          <section
            className="panel file-output package-analysis"
            aria-label={t('inspection.scripts')}
          >
            <h2>{t('inspection.scripts')}</h2>
            {!result.scripts.length && <p className="helper-text">{t('inspection.noScripts')}</p>}
            <dl className="analysis-entries">
              {result.scripts.map((script) => (
                <div key={script.name}>
                  <dt>
                    {script.name || '(empty name)'}{' '}
                    {script.common && <span className="badge">{t('inspection.commonScript')}</span>}
                  </dt>
                  <dd>
                    <code>{script.command}</code>
                  </dd>
                </div>
              ))}
            </dl>
            <p className="helper-text">{t('inspection.commandsHelp')}</p>
          </section>
          <section
            className="panel file-output package-analysis"
            aria-label={t('inspection.diagnostics')}
          >
            <h2>{t('inspection.diagnosticCount', { count: result.diagnostics.length })}</h2>
            <ul className="analysis-diagnostics">
              {result.diagnostics.map((item, index) => (
                <li key={index}>
                  <strong>{t(`inspection.${item.level}` as const)}</strong> —{' '}
                  {renderMessage(result.presentation.diagnostics[index], t)}
                </li>
              ))}
            </ul>
          </section>
        </>
      )}
      <p className="helper-text">{t('inspection.packageHelp')}</p>
    </>
  )
}
