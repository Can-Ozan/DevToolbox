import { useState } from 'react'
import { Button, Message } from '../../components/ui'
import { usePreferences } from '../../storage/preferences'
import { FileOutputPanel, useFileJob, WorkspaceFilePicker } from '../../workspace/FileControls'
import ProcessingStatus from '../../workspace/ProcessingStatus'
import type { FileInput, FileOutput } from '../../workspace/workspaceTypes'
import { PDF_TYPES } from '../../workspace/workspaceUtils'

export default function PdfToImages() {
  const [file, setFile] = useState<FileInput>()
  const [selection, setSelection] = useState('all')
  const [pages, setPages] = useState('1')
  const [format, setFormat] = useState<'image/png' | 'image/jpeg'>('image/png')
  const [scale, setScale] = useState(1)
  const defaults = usePreferences()
  const [quality, setQuality] = useState(defaults.jpegQuality)
  const [progress, setProgress] = useState('Loading PDF renderer…')
  const job = useFileJob<FileOutput[]>()
  return (
    <>
      <WorkspaceFilePicker
        accepted={PDF_TYPES}
        disabled={job.busy}
        onSelect={([next]) => {
          job.reset()
          setFile(next)
        }}
      />
      <p className="helper-text">
        Local PDF rendering · unencrypted PDFs up to 100 MB / 500 pages. Render up to 30 pages and
        32 megapixels per batch; each page is limited to 16 megapixels and 8192 px per side.
        Rendering stops after 30 seconds. Additional renderer assets require a network connection
        the first time they are used.
      </p>
      {job.error && <Message kind="error">{job.error}</Message>}
      {file && (
        <>
          <p className="file-name">{file.name}</p>
          <fieldset className="file-options" disabled={job.busy}>
            <legend>Render options</legend>
            <div className="field-row">
              <label className="field">
                Page selection
                <select
                  value={selection}
                  onChange={(event) => {
                    setSelection(event.target.value)
                    job.reset()
                  }}
                >
                  <option value="all">All pages</option>
                  <option value="custom">Custom range</option>
                </select>
              </label>
              {selection === 'custom' && (
                <label className="field">
                  Page range
                  <input
                    value={pages}
                    placeholder="1-3,5,8"
                    onChange={(event) => {
                      setPages(event.target.value)
                      job.reset()
                    }}
                  />
                </label>
              )}
              <label className="field">
                Output format
                <select
                  value={format}
                  onChange={(event) => {
                    setFormat(event.target.value as typeof format)
                    job.reset()
                  }}
                >
                  <option value="image/png">PNG</option>
                  <option value="image/jpeg">JPEG</option>
                </select>
              </label>
              <label className="field">
                Resolution
                <select
                  value={scale}
                  onChange={(event) => {
                    setScale(Number(event.target.value))
                    job.reset()
                  }}
                >
                  <option value="1">1× (72 DPI)</option>
                  <option value="1.5">1.5× (108 DPI)</option>
                  <option value="2">2× (144 DPI)</option>
                </select>
              </label>
              {format === 'image/jpeg' && (
                <label className="field">
                  JPEG quality ({quality}%)
                  <input
                    aria-label="JPEG quality"
                    type="range"
                    min="10"
                    max="100"
                    value={quality}
                    onChange={(event) => {
                      setQuality(Number(event.target.value))
                      job.reset()
                    }}
                  />
                </label>
              )}
            </div>
          </fieldset>
          <div className="actions">
            <Button
              variant="primary"
              disabled={job.busy}
              onClick={() => {
                setProgress('Loading PDF renderer…')
                void job.run(async (signal, report) => {
                  if (selection === 'custom' && !pages.trim())
                    throw new Error('Enter a page range, such as 1-3,5.')
                  const { renderPdfImages } = await import('./pdfRenderer')
                  signal.throwIfAborted()
                  return renderPdfImages(
                    file,
                    {
                      pages: selection === 'all' ? '' : pages,
                      format,
                      quality: quality / 100,
                      scale,
                    },
                    signal,
                    report,
                    (text) => {
                      if (!signal.aborted) setProgress(text)
                    },
                  )
                })
              }}
            >
              Render images
            </Button>
            {job.busy && <Button onClick={job.reset}>Cancel processing</Button>}
          </div>
        </>
      )}
      {job.busy && <ProcessingStatus stage={job.stage} detail={progress} />}
      {job.output && (
        <div className="pdf-image-results">
          <p role="status">
            {job.output.length} image{job.output.length === 1 ? '' : 's'} ready. Download or save
            each image below.
          </p>
          {job.output.map((output) => (
            <FileOutputPanel key={output.name} output={output} image />
          ))}
        </div>
      )}
    </>
  )
}
