import { stageLabels, type ProcessingStage } from '../lib/processing'

export default function ProcessingStatus({ stage }: { stage: ProcessingStage }) {
  return (
    <div className="processing-status" role="status" aria-live="polite">
      <strong>Processing locally</strong>
      <span>{stageLabels[stage]}…</span>
    </div>
  )
}
