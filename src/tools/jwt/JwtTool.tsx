import { useState } from 'react'
import { Button, CopyButton, Editor, Message } from '../../components/ui'
import { decodeJwt, errorMessage } from '../../lib/encoding'
export default function JwtTool() {
  const [input, setInput] = useState('')
  const [result, setResult] = useState<ReturnType<typeof decodeJwt> | null>(null)
  const [error, setError] = useState('')
  const claims = result
    ? ['iss', 'sub', 'aud', 'exp', 'iat', 'nbf'].filter((key) => key in result.payload)
    : []
  return (
    <>
      <Message kind="warning">
        Decoding a JWT does not verify its signature or authenticity.
      </Message>
      <Editor
        label="JWT token"
        minHeight={130}
        value={input}
        onChange={(value) => {
          setInput(value)
          setResult(null)
          setError('')
        }}
        placeholder="eyJhbGciOiJIUzI1NiIs…"
      />
      <div className="actions">
        <Button
          variant="primary"
          onClick={() => {
            try {
              setResult(decodeJwt(input))
              setError('')
            } catch (error) {
              setResult(null)
              setError(errorMessage(error))
            }
          }}
        >
          Decode token
        </Button>
        <Button
          onClick={() => {
            setInput('')
            setResult(null)
            setError('')
          }}
        >
          Clear
        </Button>
      </div>
      {error && <Message kind="error">{error}</Message>}
      {result && (
        <>
          <div className="editor-grid">
            {(['header', 'payload'] as const).map((key) => (
              <div key={key}>
                <div className="output-title">
                  <h2>{key === 'header' ? 'Header' : 'Payload'}</h2>
                  <CopyButton text={JSON.stringify(result[key], null, 2)} label={`Copy ${key}`} />
                </div>
                <pre className="code-output">{JSON.stringify(result[key], null, 2)}</pre>
              </div>
            ))}
          </div>
          {claims.length > 0 && (
            <>
              <div className="output-title">
                <h2>Standard claims</h2>
              </div>
              <dl className="data-table">
                {claims.map((key) => {
                  const value = result.payload[key]
                  const isTimestamp = ['exp', 'iat', 'nbf'].includes(key)
                  const date = typeof value === 'number' ? new Date(value * 1000) : null
                  return (
                    <div key={key}>
                      <dt>{key}</dt>
                      <dd>
                        {JSON.stringify(value)}
                        {isTimestamp && (
                          <span>
                            {' '}
                            ·{' '}
                            {date && Number.isFinite(date.getTime())
                              ? date.toLocaleString()
                              : 'Invalid numeric timestamp'}
                          </span>
                        )}
                      </dd>
                    </div>
                  )
                })}
              </dl>
            </>
          )}
          <div className="output-title">
            <h2>Signature · not verified</h2>
            <CopyButton text={result.signature} label="Copy signature" />
          </div>
          <pre className="code-output">{result.signature || '(empty signature)'}</pre>
        </>
      )}
    </>
  )
}
