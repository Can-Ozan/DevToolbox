import { ToolToolbar, ToolActions, ToolTabs } from '../../components/ToolLayout'
import { useState } from 'react'
import { Button, CopyButton, DownloadButton, Editor, Message } from '../../components/ui'
import { useFileJob } from '../../workspace/FileControls'
import type { CodeLanguage } from '../../lib/codeFormat'
import { runWorkerJob } from '../../lib/workerJob'
export default function CodeFormatter() {
  const [input, setInput] = useState(''),
    [language, setLanguage] = useState<CodeLanguage>('html'),
    [indent, setIndent] = useState('2')
  const job = useFileJob<string>()
  return (
    <>
      <ToolTabs<CodeLanguage>
        label="Code language"
        value={language}
        options={[
          { value: 'html', label: 'HTML' },
          { value: 'css', label: 'CSS' },
          { value: 'javascript', label: 'JavaScript' },
        ]}
        onChange={(value) => {
          job.reset()
          setLanguage(value)
        }}
      />
      <ToolToolbar>
        <Button
          variant="primary"
          disabled={job.busy}
          onClick={() =>
            void job.run((signal) =>
              runWorkerJob<string>(
                () => new Worker(new URL('./code.worker.ts', import.meta.url), { type: 'module' }),
                { input, language, indent },
                signal,
              ),
            )
          }
        >
          Format code
        </Button>
        <label className="toolbar-field">
          Indentation
          <select
            value={indent}
            onChange={(e) => {
              job.reset()
              setIndent(e.target.value)
            }}
          >
            <option value="2">2 spaces</option>
            <option value="4">4 spaces</option>
            <option value="tab">Tabs</option>
          </select>
        </label>
        <Button
          onClick={() => {
            job.reset()
            setInput('')
          }}
        >
          Clear
        </Button>
        {job.busy && <Button onClick={job.reset}>Cancel formatting</Button>}
      </ToolToolbar>
      {job.busy && <p role="status">Formatting locally…</p>}
      {job.error && <Message kind="error">{job.error}</Message>}
      <div className="editor-grid">
        <Editor
          minHeight={360}
          label="Code input"
          value={input}
          onChange={(value) => {
            job.reset()
            setInput(value)
          }}
          placeholder="Paste HTML, CSS or JavaScript…"
        />
        <Editor
          minHeight={360}
          label="Formatted code"
          placeholder="Formatted code will appear here…"
          value={job.output ?? ''}
          actions={
            <ToolActions label="Output actions">
              <CopyButton text={job.output ?? ''} label="Copy output" visibleLabel="Copy" />
              <DownloadButton
                text={job.output ?? ''}
                filename={`formatted.${language === 'javascript' ? 'js' : language}`}
                mimeType="text/plain;charset=utf-8"
              />
            </ToolActions>
          }
          readOnly
        />
      </div>

      <p className="helper-text">
        Prettier runs in a local worker. Code is never executed or previewed. HTML text spacing is
        preserved; embedded scripts/styles are left unchanged. Up to 200,000 characters.
      </p>
    </>
  )
}
