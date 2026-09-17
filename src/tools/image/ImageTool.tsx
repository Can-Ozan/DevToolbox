import { useEffect, useState } from 'react'
import { Button, Message } from '../../components/ui'
import {
  FileOutputPanel,
  useFileJob,
  useObjectURL,
  WorkspaceFilePicker,
} from '../../workspace/FileControls'
import type { FileInput } from '../../workspace/workspaceTypes'
import { fileError, formatBytes, IMAGE_TYPES, outputFilename } from '../../workspace/workspaceUtils'
import {
  aspectResize,
  imageDimensions,
  processImage,
  type ImageDimensions,
  type ImageFormat,
} from '../../lib/imageFiles'

type Mode = 'convert' | 'compress' | 'resize' | 'rotate' | 'metadata'
const actions: Record<Mode, string> = {
  convert: 'Convert image',
  compress: 'Compress image',
  resize: 'Resize image',
  rotate: 'Apply rotation / flip',
  metadata: 'Read metadata',
}
const ids: Record<Mode, string> = {
  convert: 'image-converter',
  compress: 'image-compressor',
  resize: 'image-resizer',
  rotate: 'image-rotate',
  metadata: 'image-metadata',
}

function ImageTool({ mode }: { mode: Mode }) {
  const [file, setFile] = useState<FileInput>()
  const [info, setInfo] = useState<ImageDimensions>()
  const [error, setError] = useState('')
  const [reading, setReading] = useState(false)
  const [format, setFormat] = useState<ImageFormat>(
    mode === 'compress' ? 'image/jpeg' : 'image/png',
  )
  const [quality, setQuality] = useState(80)
  const [background, setBackground] = useState('#ffffff')
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
        if (active) setError(fileError(reason))
      })
      .finally(() => {
        if (active) setReading(false)
      })
    return () => {
      active = false
    }
  }, [file])
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
        setError(fileError(reason))
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
      <p className="helper-text">
        PNG, JPEG or still WebP · up to 50 MB, 16 megapixels and 8192 px per side. Output
        re-encoding removes embedded metadata; animation is not preserved.
      </p>
      {reading && <p role="status">Reading image…</p>}
      {(error || job.error) && <Message kind="error">{error || job.error}</Message>}
      {file && info && (
        <>
          <section className="panel">
            <h2>Input</h2>
            <p className="file-name">{file.name}</p>
            <p className="helper-text">
              {formatBytes(file.blob.size)} · {info.width} × {info.height} px
            </p>
            {preview && <img className="file-preview" src={preview} alt="Input preview" />}
          </section>
          {mode === 'metadata' ? (
            <section className="panel">
              <h2>Image metadata</h2>
              <dl className="file-metadata">
                <dt>Filename</dt>
                <dd>{file.name}</dd>
                <dt>MIME</dt>
                <dd>{file.blob.type}</dd>
                <dt>File size</dt>
                <dd>{formatBytes(file.blob.size)}</dd>
                <dt>Width</dt>
                <dd>{info.width} px</dd>
                <dt>Height</dt>
                <dd>{info.height} px</dd>
                <dt>Aspect ratio</dt>
                <dd>{(info.width / info.height).toFixed(3)}:1</dd>
              </dl>
              <p className="helper-text">
                Basic browser-readable metadata only. EXIF, camera, date taken and GPS data are not
                parsed.
              </p>
            </section>
          ) : (
            <>
              <fieldset className="file-options" disabled={job.busy}>
                <legend>Output options</legend>
                <div className="field-row">
                  <label className="field">
                    Output format
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
                      Quality ({quality}%)
                      <input
                        aria-label="Quality"
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
                      JPEG background
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
                {mode === 'compress' && (
                  <p className="helper-text">
                    Produces lossy JPEG or WebP. Savings depend on the input; output can be larger.
                    This is not lossless PNG compression.
                  </p>
                )}
                {mode === 'resize' && (
                  <>
                    <div className="field-row">
                      <label className="field">
                        Width
                        <input
                          type="number"
                          min="1"
                          max="8192"
                          value={width || ''}
                          onChange={(event) => changeSize('width', Number(event.target.value))}
                        />
                      </label>
                      <label className="field">
                        Height
                        <input
                          type="number"
                          min="1"
                          max="8192"
                          value={height || ''}
                          onChange={(event) => changeSize('height', Number(event.target.value))}
                        />
                      </label>
                      <label className="field">
                        Percentage
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
                              setError(fileError(reason))
                            }
                          }
                        }}
                      />
                      Maintain aspect ratio
                    </label>
                    <label className="field">
                      Common presets
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
                            setError(fileError(reason))
                          }
                          event.target.value = ''
                        }}
                      >
                        <option value="">Choose a width (keeps aspect ratio)</option>
                        <option value="320">320 px thumbnail</option>
                        <option value="1280">1280 px web image</option>
                        <option value="1920">1920 px full HD width</option>
                      </select>
                    </label>
                  </>
                )}
                {mode === 'rotate' && (
                  <>
                    <label className="field">
                      Rotation
                      <select
                        value={rotation}
                        onChange={(event) => {
                          job.reset()
                          setRotation(Number(event.target.value))
                        }}
                      >
                        <option value="0">0°</option>
                        <option value="90">90° clockwise</option>
                        <option value="180">180°</option>
                        <option value="270">270° clockwise</option>
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
                        Flip horizontal
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
                        Flip vertical
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
                    void job.run(async (signal) => {
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
                      )
                      const saved = (1 - blob.size / file.blob.size) * 100
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
                        originalName: file.originalName ?? file.name,
                        detail:
                          mode === 'compress'
                            ? `Original ${formatBytes(file.blob.size)} · ${Math.abs(saved).toFixed(1)}% ${saved >= 0 ? 'smaller' : 'larger'}`
                            : `${mode === 'rotate' && rotation % 180 ? height : width} × ${mode === 'rotate' && rotation % 180 ? width : height} px`,
                      }
                    })
                  }}
                >
                  {job.busy ? 'Processing…' : actions[mode]}
                </Button>
                {job.busy && <Button onClick={job.reset}>Cancel processing</Button>}
              </div>
            </>
          )}
        </>
      )}
      {job.output && <FileOutputPanel output={job.output} image />}
    </>
  )
}

export const ImageConverter = () => <ImageTool mode="convert" />
export const ImageCompressor = () => <ImageTool mode="compress" />
export const ImageResizer = () => <ImageTool mode="resize" />
export const ImageRotate = () => <ImageTool mode="rotate" />
export const ImageMetadata = () => <ImageTool mode="metadata" />
