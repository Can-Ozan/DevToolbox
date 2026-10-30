import { renderMessage } from '../../i18n/messages'
import { useTranslation } from 'react-i18next'
import { useState } from 'react'
import { Button, CopyButton, Editor, Message } from '../../components/ui'
import { parseUrl } from '../../lib/urlParser'
import { errorDescriptor } from '../../lib/encoding'

export default function UrlParserTool() {
  const { t } = useTranslation()
  const [input, setInput] = useState('')
  let parsed: ReturnType<typeof parseUrl> | null = null
  let error = ''
  if (input.trim()) {
    try {
      parsed = parseUrl(input)
    } catch (reason) {
      error = renderMessage(errorDescriptor(reason), t)
    }
  }
  const labels: Record<string, string> = {
    protocol: t('toolUi.protocol'),
    username: t('toolUi.username'),
    passwordPresent: t('toolUi.passwordPresent'),
    host: t('toolUi.host'),
    hostname: t('toolUi.hostname'),
    port: t('toolUi.port'),
    pathname: t('toolUi.pathname'),
    queryString: t('toolUi.queryString'),
    fragment: t('toolUi.fragment'),
    origin: t('toolUi.origin'),
  }
  return (
    <>
      <Editor
        label={t('toolUi.urlToParse')}
        value={input}
        onChange={setInput}
        minHeight={110}
        placeholder="https://example.com:8080/docs?q=hello&tag=one&tag=two#intro"
      />
      <div className="actions">
        <CopyButton
          text={parsed ? JSON.stringify(parsed, null, 2) : ''}
          label={t('toolUi.copyParsed')}
        />
        <Button onClick={() => setInput('')}>{t('toolUi.clear')}</Button>
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
                      <CopyButton
                        text={text}
                        label={t('toolUi.copyNamed', { name: labels[key].toLowerCase() })}
                      />
                    </div>
                    <pre className="code-output">
                      {text || (key === 'port' ? t('toolUi.defaultPort') : t('toolUi.empty'))}
                    </pre>
                  </div>
                )
              })}
          </div>
          <div className="output-title">
            <h2>{t('toolUi.queryParameters')}</h2>
          </div>
          {parsed.queryParameters.length ? (
            <table className="matches-table">
              <thead>
                <tr>
                  <th>{t('toolUi.key')}</th>
                  <th>{t('toolUi.value')}</th>
                  <th>{t('common.copy')}</th>
                </tr>
              </thead>
              <tbody>
                {parsed.queryParameters.map(({ key, value }, index) => (
                  <tr key={index}>
                    <td>{key || t('toolUi.empty')}</td>
                    <td>{value || t('toolUi.empty')}</td>
                    <td>
                      <CopyButton
                        text={value}
                        label={t('toolUi.copyParameter', { count: index + 1 })}
                        iconOnly
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <p className="helper-text">{t('toolUi.noParameters')}</p>
          )}
        </>
      )}
      <p className="helper-text">{t('toolUi.urlParserHelp')}</p>
    </>
  )
}
