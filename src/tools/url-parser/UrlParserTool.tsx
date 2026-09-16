import { useState } from 'react'
import { Button, CopyButton, Editor, Message } from '../../components/ui'
import { parseUrl } from '../../lib/urlParser'
import { errorMessage } from '../../lib/encoding'

export default function UrlParserTool() {
  const [input, setInput] = useState('')
  let parsed: ReturnType<typeof parseUrl> | null = null
  let error = ''
  if (input.trim()) {
    try {
      parsed = parseUrl(input)
    } catch (reason) {
      error = errorMessage(reason)
    }
  }
  const labels: Record<string, string> = {
    protocol: 'Protocol',
    username: 'Username',
    passwordPresent: 'Password present',
    host: 'Host',
    hostname: 'Hostname',
    port: 'Port',
    pathname: 'Pathname',
    queryString: 'Query string',
    fragment: 'Hash / fragment',
    origin: 'Origin',
  }
  return (
    <>
      <Editor
        label="URL to parse"
        value={input}
        onChange={setInput}
        minHeight={110}
        placeholder="https://example.com:8080/docs?q=hello&tag=one&tag=two#intro"
      />
      <div className="actions">
        <CopyButton text={parsed ? JSON.stringify(parsed, null, 2) : ''} label="Copy parsed JSON" />
        <Button onClick={() => setInput('')}>Clear</Button>
      </div>
      {error && <Message kind="error">{error}</Message>}
      {parsed && (
        <>
          <div className="result-list">
            {Object.entries(parsed)
              .filter(([key]) => key !== 'queryParameters')
              .map(([key, value]) => {
                const text = String(value)
                return (
                  <div className="panel" key={key}>
                    <div className="output-title" style={{ marginTop: 0 }}>
                      <h2>{labels[key]}</h2>
                      <CopyButton text={text} label={`Copy ${labels[key].toLowerCase()}`} />
                    </div>
                    <pre className="code-output">
                      {text || (key === 'port' ? '(default port or not specified)' : '(empty)')}
                    </pre>
                  </div>
                )
              })}
          </div>
          <div className="output-title">
            <h2>Query parameters</h2>
          </div>
          {parsed.queryParameters.length ? (
            <table className="matches-table">
              <thead>
                <tr>
                  <th>Key</th>
                  <th>Value</th>
                  <th>Copy</th>
                </tr>
              </thead>
              <tbody>
                {parsed.queryParameters.map(({ key, value }, index) => (
                  <tr key={index}>
                    <td>{key || '(empty)'}</td>
                    <td>{value || '(empty)'}</td>
                    <td>
                      <CopyButton text={value} label={`Copy parameter ${index + 1}`} iconOnly />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <p className="helper-text">No query parameters.</p>
          )}
        </>
      )}
      <p className="helper-text">
        Passwords in URL credentials are never displayed or copied. Common secret query parameters
        are redacted; query strings are normalized. Repeated query keys are preserved. Review
        arbitrary paths and fragments before sharing. Default ports are normalized by the browser
        URL API.
      </p>
    </>
  )
}
