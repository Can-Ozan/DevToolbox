import { useEffect, useState, type ReactNode } from 'react'
import { Button, Editor, Message } from '../../components/ui'
import type { RegexResult } from '../../lib/regex'

export default function RegexTool() {
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
            error:
              'This pattern took too long. Testing stopped after 1 second; try a simpler expression or shorter text.',
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
            error: 'The regex worker could not run. Reload the page and try again.',
          })
          setBusy(false)
          worker?.terminate()
        }
        worker.postMessage({ pattern, flags, text })
      } catch {
        setResult({
          matches: [],
          limited: false,
          error: 'This browser could not start a worker for safe pattern testing.',
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
      <mark key={i} title={`Match ${i + 1}, index ${match.index}`}>
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
          Regular expression
          <input
            className="regex-pattern"
            type="text"
            value={pattern}
            onChange={(event) => setPattern(event.target.value)}
            placeholder="e.g. (\w+)@(\w+\.\w+)"
          />
        </label>
        <label className="field">
          Flags
          <input
            className="regex-pattern"
            type="text"
            value={flags}
            onChange={(event) => setFlags(event.target.value)}
            placeholder="gimsuy"
          />
        </label>
      </div>
      <p className="helper-text">
        g: all matches · i: ignore case · m: multiline · s: dot matches newlines · u: Unicode · y:
        sticky. Enter a pattern without surrounding slashes.
      </p>
      <Editor
        label="Test text"
        minHeight={160}
        value={text}
        onChange={setText}
        placeholder="Paste text to test your regular expression…"
      />
      <div className="actions">
        <Button
          onClick={() => {
            setPattern('([\\w.+-]+)@([\\w.-]+\\.[a-zA-Z]{2,})')
            setFlags('g')
            setText('Reach us at hello@example.com or support@devtoolbox.local.')
          }}
        >
          Load sample
        </Button>
        <Button
          variant="ghost"
          onClick={() => {
            setPattern('')
            setText('')
            setFlags('g')
          }}
        >
          Clear
        </Button>
      </div>
      {result.error && <Message kind="error">{result.error}</Message>}
      {result.limited && (
        <Message kind="warning">
          Showing the first 1,000 matches. Narrow your pattern to inspect fewer results.
        </Message>
      )}
      <div className="output-title">
        <h2>Match preview</h2>
        <span className="count-pill" role="status">
          {busy ? 'Testing…' : `${result.matches.length}${result.limited ? '+' : ''} matches`}
        </span>
      </div>
      <div className="match-preview">
        {text ? (
          highlighted
        ) : (
          <span className="helper-text">Matches will be highlighted here.</span>
        )}
      </div>
      {result.matches.length > 0 && (
        <table className="matches-table">
          <thead>
            <tr>
              <th>Match</th>
              <th>Value</th>
              <th>Index</th>
              <th>Capture groups</th>
            </tr>
          </thead>
          <tbody>
            {result.matches.map((match, index) => (
              <tr key={index}>
                <td>{index + 1}</td>
                <td>
                  <code>{match.value || '(empty match)'}</code>
                </td>
                <td>{match.index}</td>
                <td>
                  {match.groups.length ? JSON.stringify(match.groups) : 'None'}
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
