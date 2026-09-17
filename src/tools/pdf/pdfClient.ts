import { FILE_LIMITS } from '../../workspace/workspaceUtils'
import type { PdfRequest, PdfResult } from './pdfTypes'

export function runPdf(request: PdfRequest, signal: AbortSignal): Promise<PdfResult> {
  signal.throwIfAborted()
  return new Promise((resolve, reject) => {
    const worker = new Worker(new URL('./pdf.worker.ts', import.meta.url), { type: 'module' })
    const finish = (result?: PdfResult, error?: Error) => {
      worker.terminate()
      clearTimeout(timer)
      signal.removeEventListener('abort', abort)
      if (error) reject(error)
      else if (result) resolve(result)
    }
    const abort = () => finish(undefined, new DOMException('Processing cancelled.', 'AbortError'))
    const timer = setTimeout(
      () =>
        finish(
          undefined,
          new Error(
            'PDF processing exceeded 30 seconds and was stopped. Try smaller files or fewer pages.',
          ),
        ),
      FILE_LIMITS.processingMs,
    )
    signal.addEventListener('abort', abort, { once: true })
    worker.onmessage = (event: MessageEvent<{ result?: PdfResult; error?: string }>) =>
      finish(event.data.result, event.data.error ? new Error(event.data.error) : undefined)
    worker.onerror = (event) => {
      event.preventDefault()
      finish(undefined, new Error('PDF processing could not start. Refresh the page and retry.'))
    }
    try {
      worker.postMessage(request)
    } catch {
      finish(
        undefined,
        new Error('Unable to send this file to the local PDF worker. Try a smaller file.'),
      )
    }
  })
}
