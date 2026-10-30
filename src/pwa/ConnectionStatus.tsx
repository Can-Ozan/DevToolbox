import { useSyncExternalStore } from 'react'
import { useTranslation } from 'react-i18next'
function subscribe(listener: () => void) {
  window.addEventListener('online', listener)
  window.addEventListener('offline', listener)
  return () => {
    window.removeEventListener('online', listener)
    window.removeEventListener('offline', listener)
  }
}
export default function ConnectionStatus() {
  const { t } = useTranslation()
  const online = useSyncExternalStore(
    subscribe,
    () => navigator.onLine,
    () => true,
  )
  return (
    <p className="connection-status" role="status">
      <strong>{online ? t('pwa.online') : t('pwa.offline')}</strong> · {t('pwa.connectionHelp')}
    </p>
  )
}
