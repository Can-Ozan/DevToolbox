import { useSyncExternalStore } from 'react'

interface InstallPrompt extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}
let state = {
  ready: false,
  update: false,
  error: '',
  install: undefined as InstallPrompt | undefined,
}
const listeners = new Set<() => void>()
let registration: ServiceWorkerRegistration | undefined
let started = false
let reloadApproved = false
let updateActivated = false
function publish(patch: Partial<typeof state>) {
  state = { ...state, ...patch }
  listeners.forEach((listener) => listener())
}
export function supportsPwa() {
  return typeof window !== 'undefined' && window.isSecureContext && 'serviceWorker' in navigator
}
export function startPwa() {
  if (started || !supportsPwa()) return
  started = true
  window.addEventListener('beforeinstallprompt', (event) => {
    event.preventDefault()
    if (!window.matchMedia('(display-mode: standalone)').matches)
      publish({ install: event as InstallPrompt })
  })
  window.addEventListener('appinstalled', () => publish({ install: undefined }))
  if (!import.meta.env.PROD) return
  // These listeners belong to the application document, not an individual job/view.
  let controlled = !!navigator.serviceWorker.controller
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (controlled) {
      updateActivated = true
      if (reloadApproved) window.location.reload()
      else publish({ update: true })
    }
    controlled = true
    publish({ ready: true })
  })
  void navigator.serviceWorker
    .register(`${import.meta.env.BASE_URL}sw.js`, {
      scope: import.meta.env.BASE_URL,
      updateViaCache: 'none',
    })
    .then((value) => {
      registration = value
      const watch = () => {
        const worker = value.installing
        if (!worker) return
        const changed = () => {
          if (worker.state === 'installed' && navigator.serviceWorker.controller)
            publish({ update: true })
          if (worker.state === 'activated') publish({ ready: true })
          if (['activated', 'redundant'].includes(worker.state))
            worker.removeEventListener('statechange', changed)
        }
        worker.addEventListener('statechange', changed)
        changed()
      }
      if (value.waiting) publish({ update: true })
      if (value.active && navigator.serviceWorker.controller) publish({ ready: true })
      value.addEventListener('updatefound', watch)
      watch()
      window.addEventListener('focus', () => {
        if (navigator.onLine) void value.update().catch(() => {})
      })
    })
    .catch(() => publish({ error: 'Offline setup is unavailable. The app remains usable online.' }))
}
export function usePwa() {
  return useSyncExternalStore(
    (listener) => {
      listeners.add(listener)
      return () => {
        listeners.delete(listener)
      }
    },
    () => state,
  )
}
export async function installApp() {
  const prompt = state.install
  if (!prompt) return
  publish({ install: undefined })
  try {
    await prompt.prompt()
    await prompt.userChoice
  } catch {
    publish({
      error: 'Installation was not completed. You can keep using DevToolbox in this browser.',
    })
  }
}
export async function updateApp() {
  try {
    reloadApproved = true
    if (updateActivated) window.location.reload()
    else if (registration?.waiting) registration.waiting.postMessage({ type: 'SKIP_WAITING' })
    else {
      reloadApproved = false
      publish({ error: 'The update is not ready yet. Please retry.' })
    }
  } catch {
    publish({
      error: 'The update could not be applied. Download unsaved outputs, then reload when ready.',
    })
  }
}
