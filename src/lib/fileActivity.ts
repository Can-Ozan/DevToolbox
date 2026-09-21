import { useSyncExternalStore } from 'react'

let active = 0
const listeners = new Set<() => void>()
export function beginFileActivity() {
  active++
  listeners.forEach((listener) => listener())
  let finished = false
  return () => {
    if (finished) return
    finished = true
    active--
    listeners.forEach((listener) => listener())
  }
}
export function useFileActivity() {
  return useSyncExternalStore(
    (listener) => {
      listeners.add(listener)
      return () => {
        listeners.delete(listener)
      }
    },
    () => active > 0,
  )
}
