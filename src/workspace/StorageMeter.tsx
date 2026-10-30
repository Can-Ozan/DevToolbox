import { useTranslation } from 'react-i18next'
import { useWorkspace } from './workspaceStore'
import { formatBytes } from './workspaceUtils'

export default function StorageMeter() {
  const { t } = useTranslation()
  const { files, estimate, error, loading } = useWorkspace()
  const quota = estimate?.quota
  const usage = estimate?.usage
  return (
    <section className="storage-meter" aria-label={t('workspace.storage')}>
      <div>
        <strong>
          {t('workspace.storage')} <span className="helper-text">{t('workspace.approximate')}</span>
        </strong>
        <span>
          {quota !== undefined && usage !== undefined
            ? `${formatBytes(usage)} / ${formatBytes(quota)}`
            : t('workspace.estimateUnavailable')}
        </span>
      </div>
      {quota !== undefined && quota > 0 && usage !== undefined && (
        <meter
          aria-label={t('workspace.storageUsed')}
          min={0}
          max={quota}
          value={Math.min(usage, quota)}
        />
      )}
      <p className="helper-text">
        {t('shell.workspace')} ·{' '}
        {error
          ? t('workspace.storageUnavailable')
          : loading
            ? t('common.loading')
            : `${t('workspace.files', { count: files.length })} · ${formatBytes(files.reduce((sum, file) => sum + file.size, 0))}`}
      </p>
    </section>
  )
}
