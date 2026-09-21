import { useSyncExternalStore } from 'react'
function subscribe(listener:()=>void) {
  window.addEventListener('online', listener)
  window.addEventListener('offline', listener)
  return () => {window.removeEventListener('online',listener);window.removeEventListener('offline',listener)}
}
export default function ConnectionStatus() {
  const online = useSyncExternalStore(subscribe,()=>navigator.onLine,()=>true)
  return <p className="connection-status" role="status"><strong>{online ? 'Online' : 'Offline'}</strong> · Local tools and saved Workspace files can still work offline. Uncached assets need a connection.</p>
}
