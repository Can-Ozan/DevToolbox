// Each invocation owns one bundled same-origin worker, abort listener and timeout.
export function runWorkerJob<T>(create: () => Worker, request: unknown, signal: AbortSignal): Promise<T> {
  signal.throwIfAborted()
  return new Promise((resolve, reject) => {
    const worker = create()
    let ended = false
    const finish = (value?: T, error?: Error) => {
      if (ended) return
      ended = true
      clearTimeout(timer)
      signal.removeEventListener('abort', abort)
      worker.terminate()
      if (error) reject(error); else resolve(value as T)
    }
    const abort = () => finish(undefined, new DOMException('Processing cancelled.', 'AbortError'))
    const timer = setTimeout(() => finish(undefined, new Error('Processing exceeded 30 seconds. Try smaller inputs.')), 30_000)
    signal.addEventListener('abort', abort, { once: true })
    worker.onmessage = (event: MessageEvent<{result?: T; error?: string}>) => finish(event.data.result, event.data.error ? new Error(event.data.error) : undefined)
    worker.onerror = event => { event.preventDefault(); finish(undefined, new Error('The local worker could not run. Reload and retry.')) }
    try { worker.postMessage(request) } catch { finish(undefined, new Error('Unable to send the input to the local worker.')) }
  })
}
