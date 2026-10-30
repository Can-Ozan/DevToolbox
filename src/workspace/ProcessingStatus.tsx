import { useTranslation } from 'react-i18next'
import type { ProcessingStage } from '../lib/processing'

export default function ProcessingStatus({
  stage,
  detail,
}: {
  stage: ProcessingStage
  detail?: string
}) {
  const { t } = useTranslation()
  return (
    <div className="processing-status" role="status" aria-live="polite">
      <strong>{t('workspace.processing')}</strong>
      <span>{detail ?? `${t(`workspace.${stage}`)}…`}</span>
    </div>
  )
}
