import { stageLabels, type ProcessingStage } from '../lib/processing'

export default function ProcessingStatus({
  stage,
  detail,
}: {
  stage: ProcessingStage
  detail?: string
}) {
  return (
    <div className="processing-status" role="status" aria-live="polite">
      <strong>Processing locally</strong>
      <span>{detail ?? `${stageLabels[stage]}…`}</span>
    </div>
  )
}
