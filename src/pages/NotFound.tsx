import { ArrowLeft, Compass } from 'lucide-react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
export default function NotFound() {
  const { t } = useTranslation()
  return (
    <div className="empty-state not-found">
      <Compass size={42} />
      <span className="eyebrow">{t('shell.notFoundEyebrow')}</span>
      <h1>{t('shell.notFoundTitle')}</h1>
      <p>{t('shell.notFoundDescription')}</p>
      <Link to="/" className="button button-primary">
        <ArrowLeft size={16} />
        {t('shell.backDashboard')}
      </Link>
    </div>
  )
}
