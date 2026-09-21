import { useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Button, Message } from '../../components/ui'
import { FileOutputPanel, useFileJob, WorkspaceFilePicker } from '../../workspace/FileControls'
import type { FileInput, FileOutput } from '../../workspace/workspaceTypes'
import { formatBytes, fileError } from '../../workspace/workspaceUtils'
import { workspace } from '../../workspace/workspaceStore'
import { ZIP_TYPES, type ArchiveEntry } from '../../lib/archiveTypes'
import { runArchive } from './archiveClient'

export default function ZipTool() {
  const [params] = useSearchParams()
  const [mode, setMode] = useState<'create'|'extract'>(params.has('file') ? 'extract' : 'create')
  const [files, setFiles] = useState<FileInput[]>([]), [archive, setArchive] = useState<FileInput>()
  const [name, setName] = useState('archive.zip'), [selected, setSelected] = useState<number[]>([])
  const [saving, setSaving] = useState(false), [message, setMessage] = useState(''), [error, setError] = useState('')
  const create = useFileJob<FileOutput>(), inspect = useFileJob<ArchiveEntry[]>(), extract = useFileJob<FileInput[]>()
  const busy = create.busy || inspect.busy || extract.busy || saving
  function clear() { create.reset(); inspect.reset(); extract.reset(); setSelected([]); setMessage(''); setError('') }
  const available = inspect.output?.filter(entry=>!entry.directory) ?? []
  return <>
    <div className="filter-tabs" role="group" aria-label="ZIP operation">{(['create','extract'] as const).map(value => <button key={value} disabled={busy} className={mode === value ? 'active' : ''} aria-pressed={mode === value} onClick={()=>{ clear(); setMode(value) }}>{value === 'create' ? 'Create ZIP' : 'Extract ZIP'}</button>)}</div>
    <p className="helper-text">Local ZIP processing. Up to 500 files / 1,000 entries, 150 MB expanded, 100 MB per archive/file and 200:1 expansion. Device batches accept 30 files. Encrypted, ZIP64 and multi-disk archives are unsupported. Extracted paths become safe flat filenames.</p>
    {mode === 'create' ? <>
      <WorkspaceFilePicker multiple disabled={busy} onSelect={value=>{ clear(); setFiles(value) }} />
      <label className="field">ZIP filename<input value={name} disabled={busy} maxLength={170} onChange={e=>{create.reset(); setName(e.target.value)}} /></label>
      <ul className="archive-input-list">{files.map((file,index)=><li key={index}><span>{file.name} · {formatBytes(file.blob.size)}</span><Button disabled={busy} aria-label={`Remove ${file.name}`} onClick={()=>{create.reset();setFiles(files.filter((_,i)=>i!==index))}}>Remove</Button></li>)}</ul>
      <Button variant="primary" disabled={busy || !files.length} onClick={()=>void create.run(signal=>runArchive({action:'create',files,name:name.trim() || 'archive.zip'},signal))}>Generate ZIP</Button>
    </> : <>
      <WorkspaceFilePicker accepted={ZIP_TYPES} disabled={busy} onSelect={([file])=>{clear();setArchive(file)}} />
      {archive && <p className="file-name">{archive.name}</p>}
      <Button disabled={busy || !archive} onClick={()=>{ clear(); void inspect.run(signal=>runArchive({action:'list',file:archive!},signal)) }}>Inspect ZIP</Button>
      {inspect.output && <section aria-label="ZIP entries" className="panel">
        <h2>{inspect.output.length} archive entries</h2>
        <div className="actions"><Button disabled={busy || !available.length} onClick={()=>{extract.reset();setSelected(available.map(entry=>entry.id))}}>Select all entries</Button><Button disabled={busy} onClick={()=>{extract.reset();setSelected([])}}>Clear entry selection</Button></div>
        <div className="archive-entry-list">{inspect.output.map(entry=><label key={entry.id} className="archive-entry"><input type="checkbox" aria-label={'Extract '+entry.path} disabled={busy || entry.directory} checked={selected.includes(entry.id)} onChange={e=>{extract.reset();setSelected(e.target.checked ? [...selected,entry.id] : selected.filter(id=>id!==entry.id))}} /><span className="file-name">{entry.path}<small>{entry.directory ? 'Directory' : 'File'} · {formatBytes(entry.compressedSize)} compressed · {formatBytes(entry.size)} expanded</small></span></label>)}</div>
        <Button variant="primary" disabled={busy || !selected.length} onClick={()=>{setMessage('');setError('');void extract.run(signal=>runArchive({action:'extract',file:archive!,selected},signal))}}>Extract selected ({selected.length})</Button>
      </section>}
    </>}
    <div className="actions"><Button disabled={saving} onClick={()=>{clear();setFiles([]);setArchive(undefined)}}>Clear</Button>{(create.busy || inspect.busy || extract.busy) && <Button onClick={clear}>Cancel processing</Button>}</div>
    {busy && <p role="status">{saving ? 'Saving files to Workspace…' : 'Processing ZIP locally…'}</p>}
    {(create.error || inspect.error || extract.error || error) && <Message kind="error">{create.error || inspect.error || extract.error || error}</Message>}
    {message && <Message kind="success">{message}</Message>}
    {create.output && <FileOutputPanel output={create.output} />}
    {extract.output && <>
      <div className="actions"><Button disabled={busy} onClick={async()=>{setSaving(true);setError('');try {await workspace.add(extract.output!,{bulk:true});setMessage(`${extract.output!.length} files saved to Workspace.`)} catch(reason){setError(fileError(reason))} finally{setSaving(false)}}}>Save extracted files to Workspace</Button></div>
      <p className="helper-text">Nothing is saved automatically. Empty files can be downloaded but Workspace requires non-empty files.</p>
      {extract.output.map((file,index)=><FileOutputPanel key={index} output={file} />)}
    </>}
  </>
}
