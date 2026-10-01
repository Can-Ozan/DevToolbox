import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { releases } from '../data/releases'
import { readWorkerRelease } from './releaseMessage'

describe('worker release metadata lifecycle', () => {
  let channel: {
    port1: {
      onmessage: ((event: { data: unknown }) => void) | null
      onmessageerror: (() => void) | null
      close: ReturnType<typeof vi.fn>
    }
    port2: { close: ReturnType<typeof vi.fn> }
  }
  beforeEach(() => {
    vi.useFakeTimers()
    channel = {
      port1: { onmessage: null, onmessageerror: null, close: vi.fn() },
      port2: { close: vi.fn() },
    }
    vi.stubGlobal(
      'MessageChannel',
      class {
        constructor() {
          return channel
        }
      },
    )
  })
  afterEach(() => {
    expect(channel.port1.close).toHaveBeenCalledOnce()
    expect(channel.port2.close).toHaveBeenCalledOnce()
    expect(channel.port1.onmessage).toBeNull()
    expect(vi.getTimerCount()).toBe(0)
    vi.useRealTimers()
    vi.unstubAllGlobals()
  })

  it('reads the incoming version, not the current tab version, and closes both ports', async () => {
    const postMessage = vi.fn()
    const pending = readWorkerRelease({ postMessage })
    expect(postMessage).toHaveBeenCalledWith({ type: 'DEVTOOLBOX_RELEASE_NOTES' }, [channel.port2])
    const incoming = { ...releases[0], version: '99.0.0' }
    channel.port1.onmessage!({ data: incoming })
    expect(await pending).toEqual(incoming)
  })
  it('settles without blocking updates when older workers do not respond', async () => {
    const pending = readWorkerRelease({ postMessage: vi.fn() })
    await vi.advanceTimersByTimeAsync(3000)
    expect(await pending).toBeUndefined()
  })
  it('handles invalid responses', async () => {
    const pending = readWorkerRelease({ postMessage: vi.fn() })
    channel.port1.onmessage!({ data: { features: 'malformed' } })
    expect(await pending).toBeUndefined()
  })
  it('cleans up on a structured clone error', async () => {
    const pending = readWorkerRelease({ postMessage: vi.fn() })
    channel.port1.onmessageerror!()
    expect(await pending).toBeUndefined()
  })
  it('cleans up if sending to a redundant worker throws', async () => {
    expect(
      await readWorkerRelease({
        postMessage: () => {
          throw new Error('redundant')
        },
      }),
    ).toBeUndefined()
  })
})
