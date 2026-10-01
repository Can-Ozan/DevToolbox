import { isRelease, type Release } from '../data/releases'

// Ask the incoming worker, not this tab's older bundled changelog. No fetch is needed:
// the worker's versioned release script is installed with it and stays available offline.
export function readWorkerRelease(worker: Pick<ServiceWorker, 'postMessage'>) {
  return new Promise<Release | undefined>((resolve) => {
    const channel = new MessageChannel()
    const finish = (release?: Release) => {
      clearTimeout(timer)
      channel.port1.onmessage = null
      channel.port1.onmessageerror = null
      channel.port1.close()
      channel.port2.close()
      resolve(release)
    }
    // Older workers may not implement the protocol. Keep updating available regardless.
    const timer = setTimeout(() => finish(), 3000)
    channel.port1.onmessage = (event: MessageEvent<unknown>) =>
      finish(isRelease(event.data) ? event.data : undefined)
    channel.port1.onmessageerror = () => finish()
    try {
      worker.postMessage({ type: 'DEVTOOLBOX_RELEASE_NOTES' }, [channel.port2])
    } catch {
      finish()
    }
  })
}
