import { renderMessage } from '../../i18n/messages'
import { useTranslation } from 'react-i18next'
import { ToolToolbar } from '../../components/ToolLayout'
import { Fragment, useMemo, useState } from 'react'
import { Button, Editor, Message } from '../../components/ui'
import { compareText } from '../../lib/diff'
import { errorDescriptor } from '../../lib/encoding'
export default function DiffTool() {
  const { t } = useTranslation()
  const [original, setOriginal] = useState('')
  const [modified, setModified] = useState('')
  const [mode, setMode] = useState('side')
  const result = useMemo(() => {
    try {
      return { changes: compareText(original, modified), error: '' }
    } catch (error) {
      return { changes: [], error: errorDescriptor(error) }
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
          label={t('toolUi.originalText')}
          value={original}
          onChange={setOriginal}
          placeholder={t('toolUi.originalHint')}
          minHeight={210}
        />
        <Editor
          label={t('toolUi.modifiedText')}
          value={modified}
          onChange={setModified}
          placeholder={t('toolUi.modifiedHint')}
          minHeight={210}
        />
      </div>
      <ToolToolbar>
        <Button
          onClick={() => {
            setOriginal('const project = "DevToolbox";\nconst version = 1;\nconst local = true;\n')
            setModified(
              'const project = "DevToolbox";\nconst version = 2;\nconst local = true;\nconst fast = true;\n',
            )
          }}
        >
          {t('toolUi.loadSample')}
        </Button>
        <Button
          variant="ghost"
          onClick={() => {
            setOriginal('')
            setModified('')
          }}
        >
          {t('toolUi.clear')}
        </Button>
        <label className="field push-right">
          <select
            aria-label={t('toolUi.diffView')}
            value={mode}
            onChange={(event) => setMode(event.target.value)}
          >
            <option value="side">{t('toolUi.sideBySide')}</option>
            <option value="unified">{t('toolUi.unified')}</option>
          </select>
        </label>
      </ToolToolbar>
      {result.error && <Message kind="error">{renderMessage(result.error, t)}</Message>}
      {(original || modified) && !result.error && (
        <>
          <Message kind={additions || removals ? 'info' : 'success'}>
            {additions || removals
              ? t('toolUi.diffChanges', { added: additions, removed: removals })
              : t('toolUi.identical')}
          </Message>
          <div className="diff-preview">
            {mode === 'unified' ? (
              lines.map(lineView)
            ) : (
              <div className="diff-side">
                <h3>{t('toolUi.originalRemoved')}</h3>
                <h3>{t('toolUi.modifiedAdded')}</h3>
                {left.map((line, index) => (
                  <Fragment key={index}>
                    {lineView(line, index * 2)}
                    {lineView(right[index], index * 2 + 1)}
                  </Fragment>
                ))}
              </div>
            )}
          </div>
          <p className="helper-text">{t('toolUi.diffWhitespace')}</p>
          {original.endsWith('\n') !== modified.endsWith('\n') && (
            <p className="helper-text">
              {t('toolUi.newline', {
                original: original.endsWith('\n') ? t('toolUi.present') : t('toolUi.absent'),
                modified: modified.endsWith('\n') ? t('toolUi.present') : t('toolUi.absent'),
              })}
            </p>
          )}
        </>
      )}
      {!original && !modified && (
        <div className="empty-state compact">
          <h3>{t('toolUi.diffEmpty')}</h3>
          <p>{t('toolUi.diffEmptyHelp')}</p>
        </div>
      )}
    </>
  )
}
