import { processPdf } from '../../lib/pdfFiles'
import type { PdfRequest } from './pdfTypes'

self.onmessage = async (event: MessageEvent<PdfRequest>) => {
  try {
    self.postMessage({ result: await processPdf(event.data) })
  } catch (error) {
    self.postMessage({
      error: error instanceof Error ? error.message : 'PDF processing failed. Try another file.',
    })
  }
}
