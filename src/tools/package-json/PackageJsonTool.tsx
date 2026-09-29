import { useState } from 'react'
import { ToolToolbar } from '../../components/ToolLayout'
import { Button, CopyButton, DownloadButton, Editor, Message } from '../../components/ui'
import { JsonFileInput } from '../../workspace/JsonFileInput'
import { errorMessage } from '../../lib/encoding'
import { analyzePackage, packageSummary, type PackageAnalysis } from './analyzePackage'

export default function PackageJsonTool() {
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
      setError(errorMessage(reason))
    }
  }
  return (
    <>
      <JsonFileInput onText={analyze} />
      <ToolToolbar>
        <Button variant="primary" onClick={() => analyze(input)}>
          Analyze package.json
        </Button>
        <Button onClick={() => change('')}>Clear</Button>
        <CopyButton text={result ? packageSummary(result) : ''} label="Copy summary" />
        <DownloadButton
          text={result ? JSON.stringify(result, null, 2) : ''}
          filename="package-analysis.json"
          mimeType="application/json;charset=utf-8"
        />
      </ToolToolbar>
      <Editor
        label="package.json input"
        value={input}
        onChange={change}
        placeholder={'{ "name": "my-project", "version": "1.0.0", "private": true }'}
      />
      {error && <Message kind="error">{error}</Message>}
      {result && (
        <>
          <section className="panel file-output" aria-label="Project summary">
            <h2>Summary</h2>
            <dl className="result-stats">
              {result.overview.map(([key, value]) => (
                <div key={key}>
                  <dt>{key}</dt>
                  <dd>{value}</dd>
                </div>
              ))}
            </dl>
          </section>
          <section className="panel file-output" aria-label="Dependencies">
            <h2>Dependencies</h2>
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
                  <p className="helper-text">No declarations.</p>
                )}
              </details>
            ))}
          </section>
          <section className="panel file-output" aria-label="Scripts">
            <h2>Scripts</h2>
            {!result.scripts.length && <p className="helper-text">No scripts declared.</p>}
            <dl className="analysis-entries">
              {result.scripts.map((script) => (
                <div key={script.name}>
                  <dt>
                    {script.name || '(empty name)'}{' '}
                    {script.common && <span className="badge">Common script</span>}
                  </dt>
                  <dd>
                    <code>{script.command}</code>
                  </dd>
                </div>
              ))}
            </dl>
            <p className="helper-text">Commands are displayed as text and are never executed.</p>
          </section>
          <section className="panel file-output" aria-label="Diagnostics">
            <h2>Diagnostics ({result.diagnostics.length})</h2>
            <ul className="analysis-diagnostics">
              {result.diagnostics.map((item, index) => (
                <li key={index}>
                  <strong>{item.level.toUpperCase()}</strong> — {item.message}
                </li>
              ))}
            </ul>
          </section>
        </>
      )}
      <p className="helper-text">
        Local structural checks only. No npm lookup, installed-version resolution, freshness or
        vulnerability claims. Up to 200,000 characters, 1,000 dependency declarations and 200
        scripts.
      </p>
    </>
  )
}
