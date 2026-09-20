import { afterEach, expect, it, vi } from 'vitest'
import { downloadFile } from './workspaceUtils'

afterEach(() => {
  vi.useRealTimers()
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})
it.each([false, true])(
  'releases the download URL after browser initiation, including click failure=%s',
  async (fail) => {
    vi.useFakeTimers()
    const create = vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:test-download')
    const revoke = vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {})
    const click = vi.fn(() => {
      expect(revoke).not.toHaveBeenCalled()
      if (fail) throw new Error('Download blocked')
    })
    vi.stubGlobal('document', { createElement: () => ({ href: '', download: '', click }) })
    const download = () => downloadFile({ name: 'data.txt', blob: new Blob(['local']) })
    if (fail) expect(download).toThrow('Download blocked')
    else download()
    expect(create).toHaveBeenCalledOnce()
    expect(click).toHaveBeenCalledOnce()
    await vi.advanceTimersByTimeAsync(999)
    expect(revoke).not.toHaveBeenCalled()
    await vi.advanceTimersByTimeAsync(1)
    expect(revoke).toHaveBeenCalledExactlyOnceWith('blob:test-download')
    expect(vi.getTimerCount()).toBe(0)
  },
)
