import { useState } from 'react'
import { Button, CopyButton, Editor, Message } from '../../components/ui'

type ApiResult = {
  status: number
  statusText: string
  duration: number
  body: string
  contentType: string
}

function parseHeaders(input: string) {
  const headers = new Headers()
  for (const line of input.split('\n')) {
    const index = line.indexOf(':')
    if (index > 0) headers.set(line.slice(0, index).trim(), line.slice(index + 1).trim())
  }
  return headers
}

export default function ApiPlaygroundTool() {
  const [method, setMethod] = useState('GET')
  const [url, setUrl] = useState('https://api.github.com/repos/Can-Ozan/DevToolbox')
  const [headers, setHeaders] = useState('Accept: application/vnd.github+json')
  const [body, setBody] = useState('')
  const [result, setResult] = useState<ApiResult | null>(null)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  async function send() {
    setBusy(true)
    setError('')
    setResult(null)
    const started = performance.now()
    try {
      const response = await fetch(url, {
        method,
        headers: parseHeaders(headers),
        body: ['GET', 'HEAD'].includes(method) ? undefined : body,
      })
      const text = await response.text()
      let formatted = text
      try { formatted = JSON.stringify(JSON.parse(text), null, 2) } catch { /* keep raw body */ }
      setResult({
        status: response.status,
        statusText: response.statusText,
        duration: Math.round(performance.now() - started),
        body: formatted,
        contentType: response.headers.get('content-type') ?? 'unknown',
      })
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? `${requestError.message}. The target API may block browser requests with CORS.`
          : 'Request failed.',
      )
    } finally {
      setBusy(false)
    }
  }

  return (
    <>
      <Message kind="info">
        Requests run directly from your browser. DevToolbox does not proxy or store them.
      </Message>
      <div className="field-row">
        <label className="field">
          Method
          <select value={method} onChange={(event) => setMethod(event.target.value)}>
            {['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'HEAD'].map((item) => <option key={item}>{item}</option>)}
          </select>
        </label>
        <label className="field" style={{ flex: 5 }}>
          Request URL
          <input value={url} onChange={(event) => setUrl(event.target.value)} placeholder="https://api.example.com/users" />
        </label>
      </div>
      <div className="editor-grid">
        <Editor label="Headers" value={headers} onChange={setHeaders} minHeight={150} placeholder="Authorization: Bearer …" />
        <Editor label="Request body" value={body} onChange={setBody} minHeight={150} placeholder='{"name":"DevToolbox"}' />
      </div>
      <div className="actions">
        <Button variant="primary" onClick={() => void send()} disabled={busy || !url.trim()}>
          {busy ? 'Sending…' : 'Send request'}
        </Button>
        <Button onClick={() => { setResult(null); setError('') }}>Clear response</Button>
      </div>
      {error && <Message kind="error">{error}</Message>}
      {result && (
        <>
          <Message kind={result.status >= 200 && result.status < 400 ? 'success' : 'warning'}>
            HTTP {result.status} {result.statusText} · {result.duration} ms · {result.contentType}
          </Message>
          <div className="output-title">
            <h2>Response</h2>
            <CopyButton text={result.body} label="Copy response" />
          </div>
          <pre className="code-output">{result.body || '(empty response)'}</pre>
        </>
      )}
    </>
  )
}
