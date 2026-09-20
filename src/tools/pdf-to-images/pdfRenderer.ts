import { getDocument, GlobalWorkerOptions, type RenderTask } from 'pdfjs-dist'
import workerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url'
import { validateDimensions } from '../../lib/imageFiles'
import { parsePageSelection } from '../../lib/pdfPages'
import type { ReportStage } from '../../lib/processing'
import type { FileInput, FileOutput } from '../../workspace/workspaceTypes'
import {
  FILE_LIMITS,
  PDF_TYPES,
  outputFilename,
  validateFile,
} from '../../workspace/workspaceUtils'

GlobalWorkerOptions.workerSrc = workerUrl
export interface RenderOptions {
  pages: string
  format: 'image/png' | 'image/jpeg'
  quality: number
  scale: number
}
export async function renderPdfImages(
  file: FileInput,
  options: RenderOptions,
  signal: AbortSignal,
  report: ReportStage,
  progress: (text: string) => void,
): Promise<FileOutput[]> {
  report('validating')
  validateFile(file, PDF_TYPES)
  if (
    ![1, 1.5, 2].includes(options.scale) ||
    !['image/png', 'image/jpeg'].includes(options.format) ||
    !Number.isFinite(options.quality) ||
    options.quality < 0.1 ||
    options.quality > 1
  )
    throw new Error('Choose valid image output settings.')
  const header = new TextDecoder('latin1').decode(await file.blob.slice(0, 1024).arrayBuffer())
  if (!header.includes('%PDF-')) throw new Error('This file is not a valid PDF.')
  signal.throwIfAborted()
  report('reading')
  progress('Loading PDF…')
  const data = new Uint8Array(await file.blob.arrayBuffer())
  signal.throwIfAborted()
  const assets = new URL(
    `${import.meta.env.BASE_URL}${import.meta.env.DEV ? 'node_modules/pdfjs-dist/' : 'pdf-assets/'}`,
    location.origin,
  ).href
  const loading = getDocument({
    data,
    cMapUrl: `${assets}cmaps/`,
    standardFontDataUrl: `${assets}standard_fonts/`,
    wasmUrl: `${assets}wasm/`,
    iccUrl: `${assets}iccs/`,
    stopAtErrors: true,
    maxImageSize: FILE_LIMITS.imagePixels,
    canvasMaxAreaInBytes: FILE_LIMITS.imagePixels * 4,
    enableXfa: false,
  })
  let render: RenderTask | undefined
  let timedOut = false
  let encrypted = false
  const cancel = () => {
    render?.cancel()
    void loading.destroy().catch(() => {})
  }
  loading.onPassword = () => {
    encrypted = true
    cancel()
  }
  const timer = setTimeout(() => {
    timedOut = true
    cancel()
  }, FILE_LIMITS.processingMs)
  signal.addEventListener('abort', cancel, { once: true })
  try {
    const pdf = await loading.promise
    signal.throwIfAborted()
    if (!pdf.numPages || pdf.numPages > FILE_LIMITS.pdfPages)
      throw new Error(`Choose a PDF with 1–${FILE_LIMITS.pdfPages} pages.`)
    // Even PDFs with an empty password are encrypted; keep the same policy as the PDF editors.
    const metadata = await pdf.getMetadata()
    if ((metadata.info as { EncryptFilterName?: string }).EncryptFilterName)
      throw new Error('Encrypted PDFs are not supported. Use an unencrypted copy.')
    const selected = parsePageSelection(options.pages || `1-${pdf.numPages}`, pdf.numPages)
    if (selected.length > FILE_LIMITS.batchCount)
      throw new Error('Render at most 30 pages at a time. Choose a smaller page range.')
    const outputs: FileOutput[] = []
    let pixels = 0,
      bytes = 0
    for (const [index, pageIndex] of selected.entries()) {
      signal.throwIfAborted()
      report('generating')
      progress(`Rendering page ${pageIndex + 1} (${index + 1} of ${selected.length})…`)
      const page = await pdf.getPage(pageIndex + 1)
      const viewport = page.getViewport({ scale: options.scale })
      const size = validateDimensions(Math.ceil(viewport.width), Math.ceil(viewport.height))
      pixels += size.width * size.height
      if (pixels > 32_000_000)
        throw new Error(
          'Output exceeds 32 megapixels in total. Reduce the scale or select fewer pages.',
        )
      const canvas = document.createElement('canvas')
      canvas.width = size.width
      canvas.height = size.height
      try {
        render = page.render({
          canvas,
          viewport,
          background: options.format === 'image/jpeg' ? '#ffffff' : 'rgba(0,0,0,0)',
        })
        await render.promise
        signal.throwIfAborted()
        report('preparing')
        progress(`Encoding page ${pageIndex + 1}…`)
        const blob = await new Promise<Blob>((resolve, reject) =>
          canvas.toBlob(
            (value) =>
              value?.type === options.format
                ? resolve(value)
                : reject(new Error('This browser could not encode the image.')),
            options.format,
            options.quality,
          ),
        )
        signal.throwIfAborted()
        if (timedOut) throw new Error('Rendering timed out.')
        bytes += blob.size
        if (bytes > FILE_LIMITS.batchBytes || blob.size > FILE_LIMITS.imageBytes)
          throw new Error(
            'Rendered images exceed the file size limit. Select fewer pages or a lower scale.',
          )
        outputs.push({
          name: outputFilename(
            file.name,
            `page-${pageIndex + 1}`,
            options.format === 'image/jpeg' ? 'jpg' : 'png',
          ),
          blob,
          sourceTool: 'pdf-to-images',
          originalName: file.originalName ?? file.name,
          detail: `${size.width} × ${size.height} px · page ${pageIndex + 1}`,
        })
      } finally {
        render = undefined
        canvas.width = 0
        canvas.height = 0
        page.cleanup()
      }
      // Give input and cancellation events a turn between pages.
      await new Promise((resolve) => setTimeout(resolve, 0))
    }
    signal.throwIfAborted()
    return outputs
  } catch (error) {
    if (signal.aborted) signal.throwIfAborted()
    if (encrypted || (error instanceof Error && error.name === 'PasswordException'))
      throw new Error(
        'Password-protected or encrypted PDFs are not supported. Use an unencrypted copy.',
        { cause: error },
      )
    if (timedOut)
      throw new Error(
        'PDF rendering exceeded 30 seconds. Reduce the scale or select fewer pages.',
        { cause: error },
      )
    if (
      error instanceof Error &&
      ['InvalidPDFException', 'UnknownErrorException'].includes(error.name)
    )
      throw new Error('This PDF is damaged or unsupported. Try another PDF.', { cause: error })
    throw error
  } finally {
    clearTimeout(timer)
    signal.removeEventListener('abort', cancel)
    await loading.destroy().catch(() => {})
  }
}
