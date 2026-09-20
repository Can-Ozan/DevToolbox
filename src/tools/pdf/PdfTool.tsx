import { useEffect, useRef, useState } from 'react'
import { Button, Message } from '../../components/ui'
import ProcessingStatus from '../../workspace/ProcessingStatus'
import { FileOutputPanel, useFileJob, WorkspaceFilePicker } from '../../workspace/FileControls'
import type { FileInput } from '../../workspace/workspaceTypes'
import {
  fileError,
  formatBytes,
  IMAGE_TYPES,
  outputFilename,
  PDF_TYPES,
  validateBatch,
} from '../../workspace/workspaceUtils'
import { imageDimensions, processImage } from '../../lib/imageFiles'
import { runPdf } from './pdfClient'

type Mode = 'merge' | 'extract' | 'reorder' | 'images'
const labels: Record<Mode, string> = {
  merge: 'Merge PDFs',
  extract: 'Extract pages',
  reorder: 'Reorder pages',
  images: 'Create PDF',
}
const ids: Record<Mode, string> = {
  merge: 'pdf-merger',
  extract: 'pdf-splitter',
  reorder: 'pdf-reorder',
  images: 'images-to-pdf',
}

function PdfTool({ mode }: { mode: Mode }) {
  const [files, setFiles] = useState<FileInput[]>([])
  const [pages, setPages] = useState('')
  const [pageCount, setPageCount] = useState<number>()
  const [reading, setReading] = useState(false)
  const [error, setError] = useState('')
  const [orientation, setOrientation] = useState<'portrait' | 'landscape'>('portrait')
  const [fit, setFit] = useState<'contain' | 'cover'>('contain')
  const [margin, setMargin] = useState(24)
  const dragging = useRef<number | undefined>(undefined)
  const job = useFileJob()
  const multiple = mode === 'merge' || mode === 'images'
  useEffect(() => {
    setPageCount(undefined)
    if (multiple || !files.length) return
    const controller = new AbortController()
    setReading(true)
    setError('')
    void runPdf({ operation: 'inspect', files: [files[0].blob] }, controller.signal)
      .then((result) => {
        if (!controller.signal.aborted) {
          setPageCount(result.pageCount)
          setPages(
            mode === 'extract'
              ? `1-${result.pageCount}`
              : Array.from({ length: result.pageCount }, (_, i) => i + 1).join(','),
          )
        }
      })
      .catch((reason) => {
        if (!controller.signal.aborted) setError(fileError(reason))
      })
      .finally(() => {
        if (!controller.signal.aborted) setReading(false)
      })
    return () => controller.abort()
  }, [files, multiple, mode])

  function move(from: number, to: number) {
    if (to < 0 || to >= files.length || from === to) return
    const next = [...files]
    next.splice(to, 0, next.splice(from, 1)[0])
    setFiles(next)
    job.reset()
  }
  return (
    <>
      <WorkspaceFilePicker
        accepted={mode === 'images' ? IMAGE_TYPES : PDF_TYPES}
        multiple={multiple}
        disabled={job.busy}
        onSelect={(incoming) => {
          try {
            const next = multiple ? [...files, ...incoming] : incoming
            validateBatch(next, mode === 'images' ? IMAGE_TYPES : PDF_TYPES)
            setFiles(next)
            setError('')
            job.reset()
          } catch (reason) {
            setError(fileError(reason))
          }
        }}
      />
      <p className="helper-text">
        {mode === 'images'
          ? 'PNG, JPEG or still WebP, up to 50 MB and 16 megapixels per image.'
          : 'Unencrypted PDFs up to 100 MB each; maximum 500 output pages.'}{' '}
        Up to 30 files and 150 MB combined. Processing stays local and stops after 30 seconds per
        PDF job.
      </p>
      {mode !== 'images' && (
        <p className="helper-text">
          Creates a new PDF from page content. Interactive forms, bookmarks, signatures and
          document-level features may not be preserved. Keep your originals.
        </p>
      )}
      {(error || job.error) && <Message kind="error">{error || job.error}</Message>}
      <ol className="file-order-list">
        {files.map((file, index) => (
          <li
            key={`${index}-${file.name}`}
            draggable={multiple && !job.busy}
            onDragStart={() => {
              dragging.current = index
            }}
            onDragEnd={() => {
              dragging.current = undefined
            }}
            onDragOver={(event) => event.preventDefault()}
            onDrop={(event) => {
              event.preventDefault()
              if (!job.busy && dragging.current !== undefined) move(dragging.current, index)
              dragging.current = undefined
            }}
          >
            <div>
              <strong className="file-name">
                {index + 1}. {file.name}
              </strong>
              <p className="helper-text">{formatBytes(file.blob.size)}</p>
            </div>
            <div className="actions">
              {multiple && (
                <>
                  <Button
                    disabled={job.busy || index === 0}
                    aria-label={`Move ${file.name} up`}
                    onClick={() => move(index, index - 1)}
                  >
                    Move up
                  </Button>
                  <Button
                    disabled={job.busy || index === files.length - 1}
                    aria-label={`Move ${file.name} down`}
                    onClick={() => move(index, index + 1)}
                  >
                    Move down
                  </Button>
                </>
              )}
              <Button
                disabled={job.busy}
                aria-label={`Remove ${file.name}`}
                onClick={() => {
                  setFiles(files.filter((_, i) => i !== index))
                  setError('')
                  setReading(false)
                  job.reset()
                }}
              >
                Remove
              </Button>
            </div>
          </li>
        ))}
      </ol>
      {multiple && !!files.length && (
        <p className="helper-text">Drag to reorder, or use the Move up / Move down buttons.</p>
      )}
      {reading && <p role="status">Reading PDF page count…</p>}
      {pageCount && <p className="helper-text">{pageCount} pages in input PDF.</p>}
      {!!files.length && (
        <>
          <fieldset className="file-options" disabled={job.busy || reading}>
            <legend>PDF options</legend>
            {!multiple && (
              <label className="field">
                {mode === 'extract' ? 'Page range' : 'Page order'}
                <input
                  type="text"
                  value={pages}
                  onChange={(event) => {
                    setPages(event.target.value)
                    job.reset()
                  }}
                  placeholder={mode === 'extract' ? '1-3,5,8-10' : '1,3,2,4,5'}
                />
                <span>
                  {mode === 'extract'
                    ? 'Extract these pages into one new PDF.'
                    : 'List pages in the desired order. Omit pages to remove them.'}
                </span>
              </label>
            )}
            {mode === 'images' && (
              <div className="field-row">
                <label className="field">
                  Page orientation
                  <select
                    value={orientation}
                    onChange={(event) => {
                      setOrientation(event.target.value as typeof orientation)
                      job.reset()
                    }}
                  >
                    <option value="portrait">A4 portrait</option>
                    <option value="landscape">A4 landscape</option>
                  </select>
                </label>
                <label className="field">
                  Fit mode
                  <select
                    value={fit}
                    onChange={(event) => {
                      setFit(event.target.value as typeof fit)
                      job.reset()
                    }}
                  >
                    <option value="contain">Fit entire image</option>
                    <option value="cover">Fill page (crop edges)</option>
                  </select>
                </label>
                <label className="field">
                  Margins (points)
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={margin}
                    onChange={(event) => {
                      setMargin(Number(event.target.value))
                      job.reset()
                    }}
                  />
                </label>
              </div>
            )}
            {mode === 'merge' && <p className="helper-text">Pages follow the file order above.</p>}
          </fieldset>
          <div className="actions">
            <Button
              variant="primary"
              disabled={job.busy || reading || (!multiple && !pageCount)}
              onClick={() => {
                setError('')
                void job.run(async (signal, report) => {
                  let inputs = files.map((file) => file.blob)
                  if (mode === 'images') {
                    inputs = []
                    for (const file of files) {
                      signal.throwIfAborted()
                      report('reading')
                      const dimensions = await imageDimensions(file.blob)
                      const normalized = await processImage(
                        file.blob,
                        {
                          ...dimensions,
                          format: file.blob.type === 'image/jpeg' ? 'image/jpeg' : 'image/png',
                          quality: 0.92,
                          background: '#ffffff',
                          rotation: 0,
                          flipX: false,
                          flipY: false,
                        },
                        signal,
                        report,
                      )
                      inputs.push(normalized)
                      validateBatch(inputs.map((blob) => ({ name: 'Normalized image', blob })))
                    }
                  }
                  const result = await runPdf(
                    { operation: mode, files: inputs, pages, orientation, fit, margin },
                    signal,
                    report,
                  )
                  if (!result.blob) throw new Error('No PDF output was produced.')
                  return {
                    name:
                      mode === 'merge'
                        ? 'merged.pdf'
                        : mode === 'images'
                          ? 'images.pdf'
                          : outputFilename(
                              files[0].name,
                              mode === 'extract' ? 'extracted' : 'reordered',
                              'pdf',
                            ),
                    blob: result.blob,
                    sourceTool: ids[mode],
                    originalName: files[0].originalName ?? files[0].name,
                    detail: `${result.pageCount} pages`,
                  }
                })
              }}
            >
              {job.busy ? 'Processing…' : labels[mode]}
            </Button>
            {job.busy && <Button onClick={job.reset}>Cancel processing</Button>}
          </div>
        </>
      )}
      {job.busy && <ProcessingStatus stage={job.stage} />}
      {job.output && <FileOutputPanel output={job.output} />}
    </>
  )
}
export const PdfMerger = () => <PdfTool mode="merge" />
export const PdfSplitter = () => <PdfTool mode="extract" />
export const PdfReorder = () => <PdfTool mode="reorder" />
export const ImagesToPdf = () => <PdfTool mode="images" />
