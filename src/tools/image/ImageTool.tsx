import { useMessageState } from '../../i18n/useMessageState'
import { useTranslation } from 'react-i18next'
import { useEffect, useState } from 'react'
import { Button, Message } from '../../components/ui'
import { usePreferences } from '../../storage/preferences'
import ProcessingStatus from '../../workspace/ProcessingStatus'
import {
  FileOutputPanel,
  useFileJob,
  useObjectURL,
  WorkspaceFilePicker,
} from '../../workspace/FileControls'
import type { FileInput } from '../../workspace/workspaceTypes'
import {
  fileMessage,
  formatBytes,
  IMAGE_TYPES,
  outputFilename,
} from '../../workspace/workspaceUtils'
import {
  aspectResize,
  imageDimensions,
  processImage,
  type ImageDimensions,
  type ImageFormat,
} from '../../lib/imageFiles'

type Mode = 'convert' | 'compress' | 'resize' | 'rotate' | 'metadata'
const ids: Record<Mode, string> = {
  convert: 'image-converter',
  compress: 'image-compressor',
  resize: 'image-resizer',
  rotate: 'image-rotate',
  metadata: 'image-metadata',
}

function ImageTool({ mode }: { mode: Mode }) {
  const { t } = useTranslation()
  const actions: Record<Mode, string> = {
    convert: t('fileUi.convert'),
    compress: t('fileUi.compress'),
    resize: t('fileUi.resize'),
    rotate: t('fileUi.rotate'),
    metadata: t('fileUi.metadata'),
  }

  const [file, setFile] = useState<FileInput>()
  const [info, setInfo] = useState<ImageDimensions>()
  const [error, setError] = useMessageState()
  const [reading, setReading] = useState(false)
  const [format, setFormat] = useState<ImageFormat>(
    mode === 'compress' ? 'image/jpeg' : 'image/png',
  )
  const defaults = usePreferences()
  const [quality, setQuality] = useState(defaults.jpegQuality)
  const [background, setBackground] = useState(defaults.jpegBackground)
  const [width, setWidth] = useState(0)
  const [height, setHeight] = useState(0)
  const [ratio, setRatio] = useState(true)
  const [percentage, setPercentage] = useState(100)
  const [rotation, setRotation] = useState(0)
  const [flipX, setFlipX] = useState(false)
  const [flipY, setFlipY] = useState(false)
  const job = useFileJob()
  const preview = useObjectURL(info ? file?.blob : undefined)
  useEffect(() => {
    if (!file) return
    let active = true
    setReading(true)
    setInfo(undefined)
    setError('')
    void imageDimensions(file.blob)
      .then((dimensions) => {
        if (active) {
          setInfo(dimensions)
          setWidth(dimensions.width)
          setHeight(dimensions.height)
          setPercentage(100)
        }
      })
      .catch((reason) => {
        if (active) setError(fileMessage(reason))
      })
      .finally(() => {
        if (active) setReading(false)
      })
    return () => {
      active = false
    }
  }, [file, setError])
  function changeSize(side: 'width' | 'height', value: number) {
    job.reset()
    setError('')
    if (side === 'width') setWidth(value)
    else setHeight(value)
    if (ratio && info) {
      try {
        const dimensions = aspectResize(info, side, value)
        setWidth(dimensions.width)
        setHeight(dimensions.height)
      } catch (reason) {
        setError(fileMessage(reason))
      }
    }
  }
  return (
    <>
      <WorkspaceFilePicker
        accepted={IMAGE_TYPES}
        disabled={job.busy}
        onSelect={([next]) => {
          job.reset()
          setInfo(undefined)
          setFile(next)
        }}
      />
      <p className="helper-text">{t('fileUi.imageHelp')}</p>
      {reading && <p role="status">{t('fileUi.readingImage')}</p>}
      {(error || job.error) && <Message kind="error">{error || job.error}</Message>}
      {file && info && (
        <>
          <section className="panel">
            <h2>{t('toolUi.input')}</h2>
            <p className="file-name">{file.name}</p>
            <p className="helper-text">
              {formatBytes(file.blob.size)} · {info.width} × {info.height} px
            </p>
            {preview && <img className="file-preview" src={preview} alt={t('fileUi.preview')} />}
          </section>
          {mode === 'metadata' ? (
            <section className="panel">
              <h2>{t('fileUi.imageMetadata')}</h2>
              <dl className="file-metadata">
                <dt>{t('workspace.filename')}</dt>
                <dd>{file.name}</dd>
                <dt>MIME</dt>
                <dd>{file.blob.type}</dd>
                <dt>{t('fileUi.fileSize')}</dt>
                <dd>{formatBytes(file.blob.size)}</dd>
                <dt>{t('fileUi.width')}</dt>
                <dd>{info.width} px</dd>
                <dt>{t('fileUi.height')}</dt>
                <dd>{info.height} px</dd>
                <dt>{t('fileUi.ratio')}</dt>
                <dd>{(info.width / info.height).toFixed(3)}:1</dd>
              </dl>
              <p className="helper-text">{t('fileUi.metadataHelp')}</p>
            </section>
          ) : (
            <>
              <fieldset className="file-options" disabled={job.busy}>
                <legend>{t('fileUi.outputOptions')}</legend>
                <div className="field-row">
                  <label className="field">
                    {t('fileUi.format')}
                    <select
                      value={format}
                      onChange={(event) => {
                        job.reset()
                        setFormat(event.target.value as ImageFormat)
                      }}
                    >
                      {mode !== 'compress' && <option value="image/png">PNG</option>}
                      <option value="image/jpeg">JPEG</option>
                      <option value="image/webp">WebP</option>
                    </select>
                  </label>
                  {format !== 'image/png' && (
                    <label className="field">
                      {t('fileUi.qualityValue', { value: quality })}
                      <input
                        aria-label={t('fileUi.quality')}
                        type="range"
                        min="10"
                        max="100"
                        value={quality}
                        onChange={(event) => {
                          job.reset()
                          setQuality(Number(event.target.value))
                        }}
                      />
                    </label>
                  )}
                  {format === 'image/jpeg' && (
                    <label className="field">
                      {t('fileUi.jpegBackground')}
                      <input
                        type="color"
                        value={background}
                        onChange={(event) => {
                          job.reset()
                          setBackground(event.target.value)
                        }}
                      />
                    </label>
                  )}
                </div>
                {mode === 'compress' && <p className="helper-text">{t('fileUi.compressHelp')}</p>}
                {mode === 'resize' && (
                  <>
                    <div className="field-row">
                      <label className="field">
                        {t('fileUi.width')}
                        <input
                          type="number"
                          min="1"
                          max="8192"
                          value={width || ''}
                          onChange={(event) => changeSize('width', Number(event.target.value))}
                        />
                      </label>
                      <label className="field">
                        {t('fileUi.height')}
                        <input
                          type="number"
                          min="1"
                          max="8192"
                          value={height || ''}
                          onChange={(event) => changeSize('height', Number(event.target.value))}
                        />
                      </label>
                      <label className="field">
                        {t('fileUi.percentage')}
                        <input
                          type="number"
                          min="1"
                          max="800"
                          value={percentage || ''}
                          onChange={(event) => {
                            const value = Number(event.target.value)
                            setPercentage(value)
                            job.reset()
                            setError('')
                            setWidth(Math.round((info.width * value) / 100))
                            setHeight(Math.round((info.height * value) / 100))
                          }}
                        />
                      </label>
                    </div>
                    <label className="checkbox-label">
                      <input
                        type="checkbox"
                        checked={ratio}
                        onChange={(event) => {
                          setRatio(event.target.checked)
                          job.reset()
                          if (event.target.checked) {
                            try {
                              const size = aspectResize(info, 'width', width)
                              setHeight(size.height)
                              setError('')
                            } catch (reason) {
                              setError(fileMessage(reason))
                            }
                          }
                        }}
                      />
                      {t('fileUi.maintainRatio')}
                    </label>
                    <label className="field">
                      {t('toolUi.presets')}
                      <select
                        defaultValue=""
                        onChange={(event) => {
                          if (!event.target.value) return
                          try {
                            const size = aspectResize(info, 'width', Number(event.target.value))
                            setWidth(size.width)
                            setHeight(size.height)
                            setPercentage(Math.round((size.width / info.width) * 100))
                            job.reset()
                            setError('')
                          } catch (reason) {
                            setError(fileMessage(reason))
                          }
                          event.target.value = ''
                        }}
                      >
                        <option value="">{t('fileUi.chooseWidth')}</option>
                        <option value="320">{t('fileUi.thumbnail')}</option>
                        <option value="1280">{t('fileUi.webImage')}</option>
                        <option value="1920">{t('fileUi.fullHd')}</option>
                      </select>
                    </label>
                  </>
                )}
                {mode === 'rotate' && (
                  <>
                    <label className="field">
                      {t('fileUi.rotation')}
                      <select
                        value={rotation}
                        onChange={(event) => {
                          job.reset()
                          setRotation(Number(event.target.value))
                        }}
                      >
                        <option value="0">0°</option>
                        <option value="90">{t('fileUi.clockwise90')}</option>
                        <option value="180">180°</option>
                        <option value="270">{t('fileUi.clockwise270')}</option>
                      </select>
                    </label>
                    <div className="actions">
                      <label className="checkbox-label">
                        <input
                          type="checkbox"
                          checked={flipX}
                          onChange={(event) => {
                            job.reset()
                            setFlipX(event.target.checked)
                          }}
                        />
                        {t('fileUi.flipHorizontal')}
                      </label>
                      <label className="checkbox-label">
                        <input
                          type="checkbox"
                          checked={flipY}
                          onChange={(event) => {
                            job.reset()
                            setFlipY(event.target.checked)
                          }}
                        />
                        {t('fileUi.flipVertical')}
                      </label>
                    </div>
                  </>
                )}
              </fieldset>
              <div className="actions">
                <Button
                  variant="primary"
                  disabled={job.busy}
                  onClick={() => {
                    setError('')
                    void job.run(async (signal, report) => {
                      const blob = await processImage(
                        file.blob,
                        {
                          width,
                          height,
                          format,
                          quality: quality / 100,
                          background,
                          rotation: mode === 'rotate' ? rotation : 0,
                          flipX: mode === 'rotate' && flipX,
                          flipY: mode === 'rotate' && flipY,
                        },
                        signal,
                        report,
                      )
                      return {
                        name: outputFilename(
                          file.name,
                          mode === 'convert'
                            ? 'converted'
                            : mode === 'compress'
                              ? 'compressed'
                              : mode === 'resize'
                                ? 'resized'
                                : 'rotated',
                          format === 'image/jpeg' ? 'jpg' : format.split('/')[1],
                        ),
                        blob,
                        sourceTool: ids[mode],
                        originalSize: mode === 'compress' ? file.blob.size : undefined,
                        originalName: file.originalName ?? file.name,
                        detail: `${mode === 'rotate' && rotation % 180 ? height : width} × ${mode === 'rotate' && rotation % 180 ? width : height} px`,
                      }
                    })
                  }}
                >
                  {job.busy ? t('fileUi.processing') : actions[mode]}
                </Button>
                {job.busy && <Button onClick={job.reset}>{t('fileUi.cancel')}</Button>}
              </div>
            </>
          )}
        </>
      )}
      {job.busy && <ProcessingStatus stage={job.stage} />}
      {job.output && <FileOutputPanel output={job.output} image />}
    </>
  )
}

export const ImageConverter = () => <ImageTool mode="convert" />
export const ImageCompressor = () => <ImageTool mode="compress" />
export const ImageResizer = () => <ImageTool mode="resize" />
export const ImageRotate = () => <ImageTool mode="rotate" />
export const ImageMetadata = () => <ImageTool mode="metadata" />
