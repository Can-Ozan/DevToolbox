export type ProcessingStage = 'validating' | 'reading' | 'generating' | 'preparing'
export type ReportStage = (stage: ProcessingStage) => void
export const stageLabels: Record<ProcessingStage, string> = {
  validating: 'Validating input',
  reading: 'Reading files',
  generating: 'Generating output',
  preparing: 'Preparing result',
}
