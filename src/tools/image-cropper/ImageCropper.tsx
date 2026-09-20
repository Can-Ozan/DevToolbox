import { useEffect, useRef, useState, type PointerEvent } from 'react'
import { Button, Message } from '../../components/ui'
import { centeredCrop, normalizeCrop, type CropRect } from '../../lib/crop'
import {
  imageDimensions,
  processImage,
  type ImageDimensions,
  type ImageFormat,
} from '../../lib/imageFiles'
import { usePreferences } from '../../storage/preferences'
import {
  FileOutputPanel,
  useFileJob,
  useObjectURL,
  WorkspaceFilePicker,
} from '../../workspace/FileControls'
import ProcessingStatus from '../../workspace/ProcessingStatus'
import type { FileInput } from '../../workspace/workspaceTypes'
import { fileError, IMAGE_TYPES, outputFilename } from '../../workspace/workspaceUtils'

const ratios = { Free: undefined, '1:1': 1, '4:3': 4 / 3, '16:9': 16 / 9, '3:2': 3 / 2 }
export default function ImageCropper() {
  const [file, setFile] = useState<FileInput>()
  const [info, setInfo] = useState<ImageDimensions>()
  const [crop, setCrop] = useState<CropRect>({ x: 0, y: 0, width: 1, height: 1 })
  const [ratio, setRatio] = useState<keyof typeof ratios>('Free')
  const [format, setFormat] = useState<ImageFormat>('image/png')
  const defaults = usePreferences()
  const [quality, setQuality] = useState(defaults.jpegQuality)
  const [background, setBackground] = useState(defaults.jpegBackground)
  const [error, setError] = useState('')
  const stage = useRef<HTMLDivElement>(null)
  const drag = useRef<{ x: number; y: number; rect: CropRect; resize: boolean } | null>(null)
  const job = useFileJob()
  const preview = useObjectURL(info ? file?.blob : undefined)
  useEffect(() => {
    if (!file) return
    let active = true
    setInfo(undefined)
    setError('')
    void imageDimensions(file.blob)
      .then((size) => {
        if (active) {
          setInfo(size)
          setCrop(centeredCrop(size))
          setRatio('Free')
          setFormat(file.blob.type as ImageFormat)
        }
      })
      .catch((reason) => {
        if (active) setError(fileError(reason))
      })
    return () => {
      active = false
    }
  }, [file])
  function change(rect: CropRect) {
    if (!info || job.busy) return
    job.reset()
    setCrop(normalizeCrop(rect, info, ratios[ratio]))
  }
  function move(rect: CropRect, dx: number, dy: number) {
    if (!info) return rect
    return {
      ...rect,
      x: Math.max(0, Math.min(info.width - rect.width, rect.x + dx)),
      y: Math.max(0, Math.min(info.height - rect.height, rect.y + dy)),
    }
  }
  function pointerStart(event: PointerEvent<HTMLDivElement>) {
    if (job.busy || event.button !== 0) return
    event.preventDefault()
    event.currentTarget.focus()
    event.currentTarget.setPointerCapture(event.pointerId)
    drag.current = {
      x: event.clientX,
      y: event.clientY,
      rect: crop,
      resize: (event.target as HTMLElement).closest('[data-resize]') !== null,
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
        PNG, JPEG or still WebP · up to 50 MB, 16 megapixels and 8192 px per side. Cropping
        re-encodes pixels; metadata and animation are not preserved.
      </p>
      {(error || job.error) && <Message kind="error">{error || job.error}</Message>}
      {file && !info && !error && <p role="status">Reading image…</p>}
      {file && info && (
        <>
          <section className="panel">
            <h2>Crop selection</h2>
            <p className="file-name">{file.name}</p>
            <p className="helper-text" id="crop-help">
              Drag the selection to move it, or drag its bottom-right handle to resize. Use the
              labeled fields below, or focus the selection and use arrow keys to move; Shift +
              arrows resize.
            </p>
            {preview && (
              <div className="crop-stage" ref={stage}>
                <img src={preview} alt="Input preview" draggable={false} />
                <div
                  className="crop-selection"
                  role="group"
                  aria-label="Selected crop region"
                  aria-describedby="crop-help"
                  tabIndex={job.busy ? -1 : 0}
                  style={{
                    left: `${(crop.x / info.width) * 100}%`,
                    top: `${(crop.y / info.height) * 100}%`,
                    width: `${(crop.width / info.width) * 100}%`,
                    height: `${(crop.height / info.height) * 100}%`,
                  }}
                  onPointerDown={pointerStart}
                  onPointerMove={(event) => {
                    if (!drag.current || !stage.current) return
                    const bounds = stage.current.getBoundingClientRect()
                    const dx = ((event.clientX - drag.current.x) * info.width) / bounds.width
                    const dy = ((event.clientY - drag.current.y) * info.height) / bounds.height
                    const start = drag.current.rect
                    change(
                      drag.current.resize
                        ? { ...start, width: start.width + dx, height: start.height + dy }
                        : move(start, dx, dy),
                    )
                  }}
                  onPointerUp={() => {
                    drag.current = null
                  }}
                  onPointerCancel={() => {
                    drag.current = null
                  }}
                  onLostPointerCapture={() => {
                    drag.current = null
                  }}
                  onKeyDown={(event) => {
                    const directions: Record<string, [number, number]> = {
                      ArrowLeft: [-1, 0],
                      ArrowRight: [1, 0],
                      ArrowUp: [0, -1],
                      ArrowDown: [0, 1],
                    }
                    const delta = directions[event.key]
                    if (!delta || job.busy) return
                    event.preventDefault()
                    const [dx, dy] = delta
                    change(
                      event.shiftKey
                        ? {
                            ...crop,
                            width: crop.width + (ratios[ratio] && dy ? dy * ratios[ratio]! : dx),
                            height: crop.height + dy,
                          }
                        : move(crop, dx, dy),
                    )
                  }}
                >
                  <span className="crop-handle" data-resize aria-hidden="true">
                    ↘
                  </span>
                </div>
              </div>
            )}
          </section>
          <fieldset className="file-options" disabled={job.busy}>
            <legend>Crop and output options</legend>
            <div className="field-row">
              <label className="field">
                Aspect ratio
                <select
                  value={ratio}
                  onChange={(event) => {
                    const next = event.target.value as keyof typeof ratios
                    setRatio(next)
                    setCrop(centeredCrop(info, ratios[next]))
                    job.reset()
                  }}
                >
                  {Object.keys(ratios).map((value) => (
                    <option key={value}>{value}</option>
                  ))}
                </select>
              </label>
              {(['x', 'y', 'width', 'height'] as const).map((key) => (
                <label className="field" key={key}>
                  {`Crop ${key === 'x' || key === 'y' ? key.toUpperCase() : key}`}
                  <input
                    type="number"
                    step="1"
                    min={key === 'x' || key === 'y' ? 0 : 1}
                    max={key === 'x' || key === 'width' ? info.width : info.height}
                    value={crop[key]}
                    disabled={key === 'height' && !!ratios[ratio]}
                    onChange={(event) => change({ ...crop, [key]: Number(event.target.value) })}
                  />
                </label>
              ))}
              <label className="field">
                Output format
                <select
                  value={format}
                  onChange={(event) => {
                    setFormat(event.target.value as ImageFormat)
                    job.reset()
                  }}
                >
                  <option value="image/png">PNG</option>
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
                      setQuality(Number(event.target.value))
                      job.reset()
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
                      setBackground(event.target.value)
                      job.reset()
                    }}
                  />
                </label>
              )}
            </div>
            <Button
              onClick={() => {
                setCrop(centeredCrop(info, ratios[ratio]))
                job.reset()
              }}
            >
              Reset crop
            </Button>
          </fieldset>
          <div className="actions">
            <Button
              variant="primary"
              disabled={job.busy}
              onClick={() =>
                void job.run(async (signal, report) => ({
                  name: outputFilename(
                    file.name,
                    'cropped',
                    format === 'image/jpeg' ? 'jpg' : format.split('/')[1],
                  ),
                  blob: await processImage(
                    file.blob,
                    {
                      ...crop,
                      crop,
                      format,
                      quality: quality / 100,
                      background,
                      rotation: 0,
                      flipX: false,
                      flipY: false,
                    },
                    signal,
                    report,
                  ),
                  sourceTool: 'image-cropper',
                  originalName: file.originalName ?? file.name,
                  originalSize: file.blob.size,
                  detail: `${info.width} × ${info.height} → ${crop.width} × ${crop.height} px · ${ratio} crop`,
                }))
              }
            >
              Crop image
            </Button>
            {job.busy && <Button onClick={job.reset}>Cancel processing</Button>}
          </div>
        </>
      )}
      {job.busy && <ProcessingStatus stage={job.stage} />}
      {job.output && <FileOutputPanel output={job.output} image />}
    </>
  )
}
