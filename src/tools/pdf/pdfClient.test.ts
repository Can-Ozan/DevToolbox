import { afterEach, describe, expect, it, vi } from 'vitest'
import { runPdf } from './pdfClient'

class TestWorker {
  static last: TestWorker
  terminate = vi.fn()
  postMessage = vi.fn()
  onmessage?: (event: { data: unknown }) => void
  onerror?: (event: { preventDefault: () => void }) => void
  constructor() {
    TestWorker.last = this
  }
}
afterEach(() => {
  vi.useRealTimers()
  vi.unstubAllGlobals()
})
describe('PDF worker lifecycle', () => {
  it('terminates the worker after success', async () => {
    vi.stubGlobal('Worker', TestWorker)
    const result = runPdf({ operation: 'inspect', files: [] }, new AbortController().signal)
    TestWorker.last.onmessage?.({ data: { result: { pageCount: 3 } } })
    await expect(result).resolves.toEqual({ pageCount: 3 })
    expect(TestWorker.last.terminate).toHaveBeenCalledOnce()
  })
  it('terminates when the user cancels or leaves the tool', async () => {
    vi.stubGlobal('Worker', TestWorker)
    const controller = new AbortController()
    const result = runPdf({ operation: 'inspect', files: [] }, controller.signal)
    const assertion = expect(result).rejects.toThrow('cancelled')
    controller.abort()
    await assertion
    expect(TestWorker.last.terminate).toHaveBeenCalledOnce()
  })
  it('stops a nonresponsive worker at the configured time limit', async () => {
    vi.useFakeTimers()
    vi.stubGlobal('Worker', TestWorker)
    const result = runPdf({ operation: 'inspect', files: [] }, new AbortController().signal)
    const assertion = expect(result).rejects.toThrow('exceeded 30 seconds')
    await vi.advanceTimersByTimeAsync(30_000)
    await assertion
    expect(TestWorker.last.terminate).toHaveBeenCalledOnce()
  })
})
