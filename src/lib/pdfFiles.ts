import type { ReportStage } from './processing'
import {
  PDFDocument,
  PageSizes,
  clip,
  endPath,
  popGraphicsState,
  pushGraphicsState,
  rectangle,
} from 'pdf-lib'
import type { PdfRequest, PdfResult } from '../tools/pdf/pdfTypes'
import { FILE_LIMITS, PDF_TYPES, validateBatch } from '../workspace/workspaceUtils'

import { parsePageSelection } from './pdfPages'
export { parsePageSelection } from './pdfPages'

async function loadPdf(blob: Blob) {
  const header = new TextDecoder('latin1').decode(await blob.slice(0, 1024).arrayBuffer())
  if (!header.includes('%PDF-')) throw new Error('This file is not a valid PDF.')
  try {
    const document = await PDFDocument.load(await blob.arrayBuffer(), {
      updateMetadata: false,
      throwOnInvalidObject: true,
    })
    if (document.isEncrypted) throw new Error('encrypted')
    if (!document.getPageCount() || document.getPageCount() > FILE_LIMITS.pdfPages)
      throw new Error('page limit')
    return document
  } catch (error) {
    if (error instanceof Error && /encrypt/i.test(error.message))
      throw new Error(
        'Password-protected or encrypted PDFs are not supported. Use an unencrypted copy.',
        { cause: error },
      )
    if (error instanceof Error && error.message === 'page limit')
      throw new Error(`Choose a PDF containing 1–${FILE_LIMITS.pdfPages} pages.`, { cause: error })
    throw new Error('This PDF is damaged or unsupported. Try another PDF.', { cause: error })
  }
}

export async function processPdf(request: PdfRequest, report?: ReportStage): Promise<PdfResult> {
  report?.('validating')
  validateBatch(
    request.files.map((blob) => ({ name: 'PDF input', blob })),
    request.operation === 'images' ? ['image/png', 'image/jpeg'] : PDF_TYPES,
  )
  report?.('reading')
  if (request.operation === 'inspect')
    return { pageCount: (await loadPdf(request.files[0])).getPageCount() }
  const output = await PDFDocument.create()
  if (request.operation === 'images') {
    const margin = request.margin ?? 24
    if (!Number.isFinite(margin) || margin < 0 || margin > 100)
      throw new Error('Margins must be between 0 and 100 points.')
    for (const blob of request.files) {
      report?.('reading')
      const bytes = await blob.arrayBuffer()
      report?.('generating')
      const image =
        blob.type === 'image/png' ? await output.embedPng(bytes) : await output.embedJpg(bytes)
      const [short, long] = PageSizes.A4
      const [width, height] = request.orientation === 'landscape' ? [long, short] : [short, long]
      const availableWidth = width - margin * 2
      const availableHeight = height - margin * 2
      const scale =
        request.fit === 'cover'
          ? Math.max(availableWidth / image.width, availableHeight / image.height)
          : Math.min(availableWidth / image.width, availableHeight / image.height)
      const page = output.addPage([width, height])
      page.pushOperators(
        pushGraphicsState(),
        rectangle(margin, margin, availableWidth, availableHeight),
        clip(),
        endPath(),
      )
      page.drawImage(image, {
        x: (width - image.width * scale) / 2,
        y: (height - image.height * scale) / 2,
        width: image.width * scale,
        height: image.height * scale,
      })
      page.pushOperators(popGraphicsState())
    }
  } else {
    if (request.operation !== 'merge' && request.files.length !== 1)
      throw new Error('Choose one PDF.')
    if (request.operation === 'merge' && request.files.length < 2)
      throw new Error('Choose at least two PDFs to merge.')
    for (const file of request.files) {
      report?.('reading')
      const source = await loadPdf(file)
      report?.('generating')
      const indices =
        request.operation === 'merge'
          ? source.getPageIndices()
          : parsePageSelection(
              request.pages ?? '',
              source.getPageCount(),
              request.operation === 'extract',
            )
      if (output.getPageCount() + indices.length > FILE_LIMITS.pdfPages)
        throw new Error(`Output is limited to ${FILE_LIMITS.pdfPages} pages.`)
      for (const page of await output.copyPages(source, indices)) output.addPage(page)
    }
  }
  report?.('preparing')
  const bytes = await output.save()
  return {
    blob: new Blob([new Uint8Array(bytes)], { type: 'application/pdf' }),
    pageCount: output.getPageCount(),
  }
}
