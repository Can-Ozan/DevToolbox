import { afterEach, expect, it, vi } from 'vitest'
import { runWorkerJob } from './workerJob'
afterEach(() => {
  vi.useRealTimers()
  vi.restoreAllMocks()
})
it.each(['success', 'error', 'worker error', 'send error', 'cancel', 'timeout'] as const)(
  'cleans worker, listener and timer on %s',
  async (mode) => {
    vi.useFakeTimers()
    const controller = new AbortController(),
      remove = vi.spyOn(controller.signal, 'removeEventListener')
    const worker = {
      terminate: vi.fn(),
      postMessage: vi.fn(() => {
        if (mode === 'send error') throw new Error('send')
      }),
      onmessage: undefined as ((event: { data: unknown }) => void) | undefined,
      onerror: undefined as ((event: { preventDefault: () => void }) => void) | undefined,
    }
    const result = runWorkerJob(() => worker as unknown as Worker, {}, controller.signal).then(
      (value) => ({ value }),
      (error) => ({ error }),
    )
    if (mode === 'success') worker.onmessage?.({ data: { result: 'done' } })
    if (mode === 'error') worker.onmessage?.({ data: { error: 'bad input' } })
    if (mode === 'worker error') worker.onerror?.({ preventDefault: vi.fn() })
    if (mode === 'cancel') controller.abort()
    if (mode === 'timeout') await vi.advanceTimersByTimeAsync(30000)
    expect(await result).toHaveProperty(mode === 'success' ? 'value' : 'error')
    expect(worker.terminate).toHaveBeenCalledOnce()
    expect(remove).toHaveBeenCalledWith('abort', expect.any(Function))
    expect(vi.getTimerCount()).toBe(0)
  },
)
