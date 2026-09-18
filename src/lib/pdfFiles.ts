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

export function parsePageSelection(value: string, count: number, ranges = true) {
  if (!Number.isInteger(count) || count < 1 || count > FILE_LIMITS.pdfPages)
    throw new Error(`PDFs are limited to ${FILE_LIMITS.pdfPages} pages.`)
  if (!value.trim() || value.length > 5000)
    throw new Error('Enter page numbers, for example 1-3,5 or 1,3,2.')
  const pages: number[] = []
  for (const part of value.split(',')) {
    const match = part.trim().match(ranges ? /^(\d+)(?:\s*-\s*(\d+))?$/ : /^(\d+)$/)
    if (!match)
      throw new Error(
        ranges
          ? 'Use comma-separated pages or ascending ranges, such as 1-3,5.'
          : 'Use comma-separated page numbers, such as 1,3,2. Omit pages to remove them.',
      )
    const first = Number(match[1])
    const last = Number(match[2] ?? first)
    if (first < 1 || last < first || last > count)
      throw new Error(`Page numbers must be between 1 and ${count}; ranges must be ascending.`)
    for (let page = first; page <= last; page++) {
      if (pages.includes(page - 1))
        throw new Error(`Page ${page} appears more than once. Remove duplicate pages.`)
      pages.push(page - 1)
    }
  }
  return pages
}

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

export async function processPdf(request: PdfRequest): Promise<PdfResult> {
  validateBatch(
    request.files.map((blob) => ({ name: 'PDF input', blob })),
    request.operation === 'images' ? ['image/png', 'image/jpeg'] : PDF_TYPES,
  )
  if (request.operation === 'inspect')
    return { pageCount: (await loadPdf(request.files[0])).getPageCount() }
  const output = await PDFDocument.create()
  if (request.operation === 'images') {
    const margin = request.margin ?? 24
    if (!Number.isFinite(margin) || margin < 0 || margin > 100)
      throw new Error('Margins must be between 0 and 100 points.')
    for (const blob of request.files) {
      const bytes = await blob.arrayBuffer()
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
      const source = await loadPdf(file)
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
  const bytes = await output.save()
  return {
    blob: new Blob([new Uint8Array(bytes)], { type: 'application/pdf' }),
    pageCount: output.getPageCount(),
  }
}
