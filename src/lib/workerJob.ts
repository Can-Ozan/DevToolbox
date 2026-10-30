import { MessageError, messageError, type AppMessage, type DisplayMessage } from '../i18n/messages'
// Each invocation owns one bundled same-origin worker, abort listener and timeout.
export function runWorkerJob<T>(
  create: () => Worker,
  request: unknown,
  signal: AbortSignal,
): Promise<T> {
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
      if (error) reject(error)
      else resolve(value as T)
    }
    const abort = () => finish(undefined, new DOMException('Processing cancelled.', 'AbortError'))
    const timer = setTimeout(
      () =>
        finish(
          undefined,
          messageError(
            'toolErrors.workerTimeout',
            'Processing exceeded 30 seconds. Try smaller inputs.',
          ),
        ),
      30_000,
    )
    signal.addEventListener('abort', abort, { once: true })
    worker.onmessage = (event: MessageEvent<{ result?: T; error?: DisplayMessage }>) => {
      const error = event.data.error
      finish(
        event.data.result,
        error
          ? typeof error === 'string'
            ? new Error(error)
            : new MessageError(normalizeMessage(error))
          : undefined,
      )
    }
    worker.onerror = (event) => {
      event.preventDefault()
      finish(
        undefined,
        messageError(
          'toolErrors.workerFailed',
          'The local worker could not run. Reload and retry.',
        ),
      )
    }
    try {
      worker.postMessage(request)
    } catch {
      finish(
        undefined,
        messageError('toolErrors.workerSend', 'Unable to send the input to the local worker.'),
      )
    }
  })
}

function normalizeMessage(value: DisplayMessage): AppMessage {
  if (
    typeof value === 'object' &&
    typeof value.key === 'string' &&
    typeof value.fallback === 'string' &&
    value.params &&
    typeof value.params === 'object'
  )
    return value
  return {
    key: 'toolErrors.generic',
    fallback: 'Something went wrong. Check your input and try again.',
    params: {},
  }
}
