import { message, messageError } from '../../i18n/messages'
import { useMessageState } from '../../i18n/useMessageState'
import { useTranslation } from 'react-i18next'
import { useState } from 'react'
import { Button, Message } from '../../components/ui'
import { usePreferences } from '../../storage/preferences'
import { FileOutputPanel, useFileJob, WorkspaceFilePicker } from '../../workspace/FileControls'
import ProcessingStatus from '../../workspace/ProcessingStatus'
import type { FileInput, FileOutput } from '../../workspace/workspaceTypes'
import { PDF_TYPES } from '../../workspace/workspaceUtils'

export default function PdfToImages() {
  const { t } = useTranslation()
  const [file, setFile] = useState<FileInput>()
  const [selection, setSelection] = useState('all')
  const [pages, setPages] = useState('1')
  const [format, setFormat] = useState<'image/png' | 'image/jpeg'>('image/png')
  const [scale, setScale] = useState(1)
  const defaults = usePreferences()
  const [quality, setQuality] = useState(defaults.jpegQuality)
  const [progress, setProgress] = useMessageState(
    message('fileUi.loadingRenderer', 'Loading PDF renderer…'),
  )
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
      <p className="helper-text">{t('fileUi.renderHelp')}</p>
      {job.error && <Message kind="error">{job.error}</Message>}
      {file && (
        <>
          <p className="file-name">{file.name}</p>
          <fieldset className="file-options" disabled={job.busy}>
            <legend>{t('fileUi.renderOptions')}</legend>
            <div className="field-row">
              <label className="field">
                {t('fileUi.pageSelection')}
                <select
                  value={selection}
                  onChange={(event) => {
                    setSelection(event.target.value)
                    job.reset()
                  }}
                >
                  <option value="all">{t('fileUi.allPages')}</option>
                  <option value="custom">{t('fileUi.customRange')}</option>
                </select>
              </label>
              {selection === 'custom' && (
                <label className="field">
                  {t('fileUi.pageRange')}
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
                {t('fileUi.format')}
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
                {t('fileUi.resolution')}
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
                  {t('fileUi.jpegQualityValue', { value: quality })}
                  <input
                    aria-label={t('fileUi.jpegQuality')}
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
                setProgress(message('fileUi.loadingRenderer', 'Loading PDF renderer…'))
                void job.run(async (signal, report) => {
                  if (selection === 'custom' && !pages.trim())
                    throw messageError('fileErrors.pageRange', 'Enter a page range, such as 1-3,5.')
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
              {t('fileUi.render')}
            </Button>
            {job.busy && <Button onClick={job.reset}>{t('fileUi.cancel')}</Button>}
          </div>
        </>
      )}
      {job.busy && <ProcessingStatus stage={job.stage} detail={progress} />}
      {job.output && (
        <div className="pdf-image-results">
          <p role="status">{t('fileUi.imagesReady', { count: job.output.length })}</p>
          {job.output.map((output) => (
            <FileOutputPanel key={output.name} output={output} image />
          ))}
        </div>
      )}
    </>
  )
}
