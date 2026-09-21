import { useState } from 'react'
import { Button, CopyButton, DownloadButton, Editor, Message } from '../../components/ui'
import { useFileJob } from '../../workspace/FileControls'
import type { CodeLanguage } from '../../lib/codeFormat'
import { runWorkerJob } from '../../lib/workerJob'
export default function CodeFormatter() {
  const [input, setInput] = useState(''), [language, setLanguage] = useState<CodeLanguage>('html'), [indent, setIndent] = useState('2')
  const job = useFileJob<string>()
  return <>
    <div className="filter-tabs" role="group" aria-label="Code language">{(['html','css','javascript'] as const).map(value => <button key={value} aria-pressed={language === value} className={language === value ? 'active' : ''} onClick={() => { job.reset(); setLanguage(value) }}>{value === 'javascript' ? 'JavaScript' : value.toUpperCase()}</button>)}</div>
    <div className="actions">
      <Button variant="primary" disabled={job.busy} onClick={() => void job.run(signal => runWorkerJob<string>(() => new Worker(new URL('./code.worker.ts', import.meta.url), {type:'module'}), {input, language, indent}, signal))}>Format code</Button>
      <label className="field">Indentation<select value={indent} onChange={e => { job.reset(); setIndent(e.target.value) }}><option value="2">2 spaces</option><option value="4">4 spaces</option><option value="tab">Tabs</option></select></label>
      <Button onClick={() => { job.reset(); setInput('') }}>Clear</Button>
      {job.busy && <Button onClick={job.reset}>Cancel formatting</Button>}
    </div>
    {job.busy && <p role="status">Formatting locally…</p>}
    {job.error && <Message kind="error">{job.error}</Message>}
    <div className="editor-grid"><Editor label="Code input" value={input} onChange={value => { job.reset(); setInput(value) }} placeholder="Paste HTML, CSS or JavaScript…" /><Editor label="Formatted code" value={job.output ?? ''} readOnly /></div>
    <div className="actions justify-end"><CopyButton text={job.output ?? ''} label="Copy output" /><DownloadButton text={job.output ?? ''} filename={`formatted.${language === 'javascript' ? 'js' : language}`} mimeType="text/plain;charset=utf-8" /></div>
    <p className="helper-text">Prettier runs in a local worker. Code is never executed or previewed. HTML text spacing is preserved; embedded scripts/styles are left unchanged. Up to 200,000 characters.</p>
  </>
}
