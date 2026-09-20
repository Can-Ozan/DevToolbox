import { useWorkspace } from './workspaceStore'
import { formatBytes } from './workspaceUtils'

export default function StorageMeter() {
  const { files, estimate, error, loading } = useWorkspace()
  const quota = estimate?.quota
  const usage = estimate?.usage
  return (
    <section className="storage-meter" aria-label="Browser storage">
      <div>
        <strong>
          Browser storage <span className="helper-text">(approximate, whole origin)</span>
        </strong>
        <span>
          {quota !== undefined && usage !== undefined
            ? `${formatBytes(usage)} / ${formatBytes(quota)}`
            : 'Estimate unavailable'}
        </span>
      </div>
      {quota !== undefined && quota > 0 && usage !== undefined && (
        <meter
          aria-label="Approximate browser storage used"
          min={0}
          max={quota}
          value={Math.min(usage, quota)}
        />
      )}
      <p className="helper-text">
        Workspace ·{' '}
        {error
          ? 'Storage unavailable'
          : loading
            ? 'Loading…'
            : `${files.length} ${files.length === 1 ? 'file' : 'files'} · ${formatBytes(files.reduce((sum, file) => sum + file.size, 0))}`}
      </p>
    </section>
  )
}
