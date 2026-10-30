import { processPdf } from '../../lib/pdfFiles'
import type { PdfRequest } from './pdfTypes'
import { errorDescriptor } from '../../lib/encoding'
import { message } from '../../i18n/messages'

self.onmessage = async (event: MessageEvent<PdfRequest>) => {
  try {
    self.postMessage({
      result: await processPdf(event.data, (stage) => self.postMessage({ stage })),
    })
  } catch (error) {
    self.postMessage({
      error:
        error instanceof Error
          ? errorDescriptor(error)
          : message('fileErrors.pdfFailed', 'PDF processing failed. Try another file.'),
    })
  }
}
