export interface PdfRequest {
  operation: 'inspect' | 'merge' | 'extract' | 'reorder' | 'images'
  files: Blob[]
  pages?: string
  orientation?: 'portrait' | 'landscape'
  fit?: 'contain' | 'cover'
  margin?: number
}
export interface PdfResult {
  blob?: Blob
  pageCount: number
}
