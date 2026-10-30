import { useTranslation } from 'react-i18next'
import { ToolSection, ToolToolbar } from '../../components/ToolLayout'
import { useEffect, useState, type ReactNode } from 'react'
import { Button, Editor, Message } from '../../components/ui'
import type { RegexResult } from '../../lib/regex'
import { message, renderMessage } from '../../i18n/messages'

export default function RegexTool() {
  const { t } = useTranslation()
  const [pattern, setPattern] = useState('')
  const [flags, setFlags] = useState('g')
  const [text, setText] = useState('')
  const [result, setResult] = useState<RegexResult>({ matches: [], limited: false })
  const [busy, setBusy] = useState(false)
  useEffect(() => {
    setResult({ matches: [], limited: false })
    setBusy(false)
    if (!pattern) return
    let worker: Worker | undefined
    let timeout: ReturnType<typeof setTimeout> | undefined
    const debounce = setTimeout(() => {
      setBusy(true)
      try {
        worker = new Worker(new URL('./regex.worker.ts', import.meta.url), { type: 'module' })
        timeout = setTimeout(() => {
          worker?.terminate()
          setResult({
            matches: [],
            limited: false,
            error: message(
              'toolErrors.regexTimeout',
              'This pattern took too long. Testing stopped after 1 second; try a simpler expression or shorter text.',
            ),
          })
          setBusy(false)
        }, 1000)
        worker.onmessage = (event: MessageEvent<RegexResult>) => {
          clearTimeout(timeout)
          setResult(event.data)
          setBusy(false)
          worker?.terminate()
        }
        worker.onerror = () => {
          clearTimeout(timeout)
          setResult({
            matches: [],
            limited: false,
            error: message(
              'toolErrors.regexWorker',
              'The regex worker could not run. Reload the page and try again.',
            ),
          })
          setBusy(false)
          worker?.terminate()
        }
        worker.postMessage({ pattern, flags, text })
      } catch {
        clearTimeout(timeout)
        worker?.terminate()
        setResult({
          matches: [],
          limited: false,
          error: message(
            'toolErrors.regexStart',
            'This browser could not start a worker for safe pattern testing.',
          ),
        })
        setBusy(false)
      }
    }, 250)
    return () => {
      clearTimeout(debounce)
      clearTimeout(timeout)
      worker?.terminate()
    }
  }, [pattern, flags, text])
  const highlighted: ReactNode[] = []
  let lastIndex = 0
  result.matches.forEach((match, i) => {
    highlighted.push(text.slice(lastIndex, match.index))
    highlighted.push(
      <mark key={i} title={t('toolUi.matchTitle', { count: i + 1, index: match.index })}>
        {match.value || '▏'}
      </mark>,
    )
    lastIndex = match.index + match.value.length
  })
  highlighted.push(text.slice(lastIndex))
  return (
    <>
      <div className="field-row">
        <label className="field" style={{ flex: 4 }}>
          {t('toolUi.regexPattern')}
          <input
            className="regex-pattern"
            type="text"
            value={pattern}
            onChange={(event) => setPattern(event.target.value)}
            placeholder={t('toolUi.regexExample')}
          />
        </label>
        <label className="field">
          {t('toolUi.flags')}
          <input
            className="regex-pattern"
            type="text"
            value={flags}
            onChange={(event) => setFlags(event.target.value)}
            placeholder="gimsuy"
          />
        </label>
      </div>
      <p className="helper-text">{t('toolUi.regexFlagsHelp')}</p>
      <ToolToolbar>
        <Button
          onClick={() => {
            setPattern('([\\w.+-]+)@([\\w.-]+\\.[a-zA-Z]{2,})')
            setFlags('g')
            setText('Reach us at hello@example.com or support@devtoolbox.local.')
          }}
        >
          {t('toolUi.loadSample')}
        </Button>
        <Button
          variant="ghost"
          onClick={() => {
            setPattern('')
            setText('')
            setFlags('g')
          }}
        >
          {t('toolUi.clear')}
        </Button>
      </ToolToolbar>
      {result.error && <Message kind="error">{renderMessage(result.error, t)}</Message>}
      {result.limited && <Message kind="warning">{t('toolUi.regexLimit')}</Message>}
      <div className="editor-grid">
        <Editor
          label={t('toolUi.testText')}
          minHeight={260}
          value={text}
          onChange={setText}
          placeholder={t('toolUi.regexHint')}
        />

        <ToolSection
          title={t('toolUi.matchPreview')}
          actions={
            <span className="count-pill" role="status">
              {busy
                ? t('toolUi.testing')
                : t('toolUi.matches', {
                    count: result.matches.length,
                    suffix: result.limited ? '+' : '',
                  })}
            </span>
          }
        >
          <div className="match-preview">
            {text ? highlighted : <span className="helper-text">{t('toolUi.matchEmpty')}</span>}
          </div>
        </ToolSection>
      </div>
      {result.matches.length > 0 && (
        <table className="matches-table">
          <thead>
            <tr>
              <th>{t('toolUi.match')}</th>
              <th>{t('toolUi.value')}</th>
              <th>{t('toolUi.index')}</th>
              <th>{t('toolUi.captureGroups')}</th>
            </tr>
          </thead>
          <tbody>
            {result.matches.map((match, index) => (
              <tr key={index}>
                <td>{index + 1}</td>
                <td>
                  <code>{match.value || t('toolUi.emptyMatch')}</code>
                </td>
                <td>{match.index}</td>
                <td>
                  {match.groups.length ? JSON.stringify(match.groups) : t('toolUi.none')}
                  {match.namedGroups && <div>{JSON.stringify(match.namedGroups)}</div>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </>
  )
}
