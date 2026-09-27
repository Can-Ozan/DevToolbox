import { afterEach, expect, it, vi } from 'vitest'
import { getDocument } from 'pdfjs-dist'
import { renderPdfImages } from './pdfRenderer'

vi.mock('pdfjs-dist', () => ({ getDocument: vi.fn(), GlobalWorkerOptions: {} }))
afterEach(() => {
  vi.useRealTimers()
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})

it.each(
  (['image/png', 'image/jpeg'] as const).flatMap((format) =>
    (['success', 'render error', 'encoding error', 'cancel', 'timeout'] as const).map((mode) => ({
      format,
      mode,
    })),
  ),
)(
  'releases $format renderer resources and abort listener on $mode without creating a PDF URL',
  async ({ format, mode }) => {
    vi.useFakeTimers()
    const controller = new AbortController()
    const remove = vi.spyOn(controller.signal, 'removeEventListener')
    const createUrl = vi.spyOn(URL, 'createObjectURL')
    let rejectRender: (error: Error) => void = () => {}
    const render = {
      promise:
        mode === 'cancel' || mode === 'timeout'
          ? new Promise<void>((_, reject) => {
              rejectRender = reject
            })
          : Promise.resolve(),
      cancel: vi.fn(() => rejectRender(new Error('Rendering cancelled'))),
    }
    const page = {
      getViewport: () => ({ width: 80, height: 60 }),
      render: vi.fn(() => {
        if (mode === 'render error') throw new Error('Rendering failed')
        return render
      }),
      cleanup: vi.fn(),
    }
    const pdf = { numPages: 1, getMetadata: async () => ({ info: {} }), getPage: async () => page }
    const loading = { promise: Promise.resolve(pdf), destroy: vi.fn(async () => {}) }
    vi.mocked(getDocument).mockReturnValue(loading as unknown as ReturnType<typeof getDocument>)
    const canvas = {
      width: 0,
      height: 0,
      toBlob: (callback: BlobCallback) =>
        callback(mode === 'encoding error' ? null : new Blob(['image'], { type: format })),
    }
    vi.stubGlobal('document', { createElement: () => canvas })
    vi.stubGlobal('location', { origin: 'https://example.test' })
    // Observe rejection immediately, including cancellation and fake-clock timeouts.
    const outcome = renderPdfImages(
      { name: 'local.pdf', blob: new Blob(['%PDF-1.7'], { type: 'application/pdf' }) },
      { pages: '1', format, quality: 0.9, scale: 1 },
      controller.signal,
      vi.fn(),
      vi.fn(),
    ).then(
      (value) => ({ value }),
      (error) => ({ error }),
    )
    await vi.waitFor(() => expect(page.render).toHaveBeenCalledOnce())
    expect(page.render).toHaveBeenCalledWith({
      canvas,
      viewport: { width: 80, height: 60 },
      background: '#ffffff',
    })
    if (mode === 'cancel') controller.abort()
    if (mode === 'timeout') await vi.advanceTimersByTimeAsync(30_000)
    else await vi.advanceTimersByTimeAsync(0)
    const result = await outcome
    if (mode === 'success') {
      expect(result).toHaveProperty('value.0.blob.type', format)
      expect(result).toHaveProperty('value.0.detail', '80 × 60 px · page 1')
    } else expect(result).toHaveProperty('error')
    expect(loading.destroy).toHaveBeenCalled()
    expect(page.cleanup).toHaveBeenCalledOnce()
    expect(canvas.width).toBe(0)
    expect(canvas.height).toBe(0)
    expect(remove).toHaveBeenCalledWith('abort', expect.any(Function))
    expect(vi.getTimerCount()).toBe(0)
    expect(createUrl).not.toHaveBeenCalled()
    if (mode === 'cancel' || mode === 'timeout') expect(render.cancel).toHaveBeenCalledOnce()
  },
)
