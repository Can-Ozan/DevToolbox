import { useMessageState } from '../../i18n/useMessageState'
import { useTranslation } from 'react-i18next'
import { useState } from 'react'
import { Button, CopyButton, Editor, Message } from '../../components/ui'
import { decodeJwt, errorDescriptor } from '../../lib/encoding'
export default function JwtTool() {
  const { t } = useTranslation()
  const [input, setInput] = useState('')
  const [result, setResult] = useState<ReturnType<typeof decodeJwt> | null>(null)
  const [error, setError] = useMessageState()
  const claims = result
    ? ['iss', 'sub', 'aud', 'exp', 'iat', 'nbf'].filter((key) => key in result.payload)
    : []
  return (
    <>
      <Message kind="warning">{t('toolUi.jwtWarning')}</Message>
      <Editor
        label={t('toolUi.jwtToken')}
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
              setError(errorDescriptor(error))
            }
          }}
        >
          {t('toolUi.decodeToken')}
        </Button>
        <Button
          onClick={() => {
            setInput('')
            setResult(null)
            setError('')
          }}
        >
          {t('toolUi.clear')}
        </Button>
      </div>
      {error && <Message kind="error">{error}</Message>}
      {result && (
        <>
          <div className="editor-grid">
            {(['header', 'payload'] as const).map((key) => (
              <div key={key}>
                <div className="output-title">
                  <h2>{key === 'header' ? t('toolUi.header') : t('toolUi.payload')}</h2>
                  <CopyButton
                    text={JSON.stringify(result[key], null, 2)}
                    label={t('toolUi.copyNamed', { name: t(`toolUi.${key}`).toLowerCase() })}
                  />
                </div>
                <pre className="code-output">{JSON.stringify(result[key], null, 2)}</pre>
              </div>
            ))}
          </div>
          {claims.length > 0 && (
            <>
              <div className="output-title">
                <h2>{t('toolUi.claims')}</h2>
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
                              : t('toolUi.invalidTimestamp')}
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
            <h2>{t('toolUi.signature')}</h2>
            <CopyButton text={result.signature} label={t('toolUi.copySignature')} />
          </div>
          <pre className="code-output">{result.signature || t('toolUi.emptySignature')}</pre>
        </>
      )}
    </>
  )
}
