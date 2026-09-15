import { Fragment, useMemo, useState } from 'react'
import { Button, Editor, Message } from '../../components/ui'
import { compareText } from '../../lib/diff'
import { errorMessage } from '../../lib/encoding'
export default function DiffTool() {
  const [original, setOriginal] = useState('')
  const [modified, setModified] = useState('')
  const [mode, setMode] = useState('side')
  const result = useMemo(() => {
    try {
      return { changes: compareText(original, modified), error: '' }
    } catch (error) {
      return { changes: [], error: errorMessage(error) }
    }
  }, [original, modified])
  const lines = result.changes.flatMap((part) => {
    const values = part.value.split('\n')
    if (values.at(-1) === '') values.pop()
    return values.map((text) => ({
      text,
      kind: part.added ? 'added' : part.removed ? 'removed' : 'same',
    }))
  })
  const additions = lines.filter((line) => line.kind === 'added').length
  const removals = lines.filter((line) => line.kind === 'removed').length
  const lineView = (line: (typeof lines)[number] | null, index: number) => (
    <div className={`diff-line ${line?.kind ?? 'same'}`} key={index}>
      <span>{line?.kind === 'added' ? '+' : line?.kind === 'removed' ? '−' : ' '}</span>
      <code>{line?.text || ' '}</code>
    </div>
  )
  // Pair each contiguous removal/addition block so unchanged lines stay aligned.
  const left: ((typeof lines)[number] | null)[] = []
  const right: ((typeof lines)[number] | null)[] = []
  for (let i = 0; i < lines.length;) {
    if (lines[i].kind === 'same') {
      left.push(lines[i])
      right.push(lines[i])
      i++
      continue
    }
    const removed: typeof lines = []
    const added: typeof lines = []
    while (i < lines.length && lines[i].kind !== 'same') {
      ;(lines[i].kind === 'removed' ? removed : added).push(lines[i])
      i++
    }
    for (let j = 0; j < Math.max(removed.length, added.length); j++) {
      left.push(removed[j] ?? null)
      right.push(added[j] ?? null)
    }
  }
  return (
    <>
      <div className="editor-grid">
        <Editor
          label="Original text"
          value={original}
          onChange={setOriginal}
          placeholder="Paste the original text…"
          minHeight={210}
        />
        <Editor
          label="Modified text"
          value={modified}
          onChange={setModified}
          placeholder="Paste the updated text…"
          minHeight={210}
        />
      </div>
      <div className="actions">
        <Button
          onClick={() => {
            setOriginal('const project = "DevToolbox";\nconst version = 1;\nconst local = true;\n')
            setModified(
              'const project = "DevToolbox";\nconst version = 2;\nconst local = true;\nconst fast = true;\n',
            )
          }}
        >
          Load sample
        </Button>
        <Button
          variant="ghost"
          onClick={() => {
            setOriginal('')
            setModified('')
          }}
        >
          Clear
        </Button>
        <label className="field push-right">
          <select
            aria-label="Diff view"
            value={mode}
            onChange={(event) => setMode(event.target.value)}
          >
            <option value="side">Side by side</option>
            <option value="unified">Unified view</option>
          </select>
        </label>
      </div>
      {result.error && <Message kind="error">{result.error}</Message>}
      {(original || modified) && !result.error && (
        <>
          <Message kind={additions || removals ? 'info' : 'success'}>
            {additions || removals
              ? `${additions} added lines · ${removals} removed lines. Changed lines appear as a removal and an addition.`
              : 'Both texts are identical.'}
          </Message>
          <div className="diff-preview">
            {mode === 'unified' ? (
              lines.map(lineView)
            ) : (
              <div className="diff-side">
                <h3>Original · − removed</h3>
                <h3>Modified · + added</h3>
                {left.map((line, index) => (
                  <Fragment key={index}>
                    {lineView(line, index * 2)}
                    {lineView(right[index], index * 2 + 1)}
                  </Fragment>
                ))}
              </div>
            )}
          </div>
          <p className="helper-text">
            Comparison includes whitespace and final newline differences.
          </p>
          {original.endsWith('\n') !== modified.endsWith('\n') && (
            <p className="helper-text">
              Final newline: original {original.endsWith('\n') ? 'present' : 'absent'} · modified{' '}
              {modified.endsWith('\n') ? 'present' : 'absent'}.
            </p>
          )}
        </>
      )}
      {!original && !modified && (
        <div className="empty-state compact">
          <h3>See what changed</h3>
          <p>Paste both versions to compare them as you type, or load the sample.</p>
        </div>
      )}
    </>
  )
}
