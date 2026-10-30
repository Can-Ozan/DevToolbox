import { useTranslation } from 'react-i18next'
import { useEffect, useRef } from 'react'
import { Message } from '../components/ui'
import { WorkspaceFilePicker, useFileJob } from './FileControls'
import { readJsonFile } from '../lib/jsonFile'

/** Shared, bounded JSON input for tools that accept Workspace handoffs. */
export function JsonFileInput({ onText }: { onText: (text: string) => void }) {
  const { t } = useTranslation()
  const job = useFileJob<{ text: string }>()
  const callback = useRef(onText)
  useEffect(() => {
    callback.current = onText
  }, [onText])
  useEffect(() => {
    if (job.output) callback.current(job.output.text)
  }, [job.output])
  return (
    <>
      <WorkspaceFilePicker
        accepted={['application/json']}
        disabled={job.busy}
        onSelect={([file]) => {
          void job.run(async (signal) => ({ text: await readJsonFile(file, signal) }))
        }}
      />
      {job.busy && <p role="status">{t('workspace.readingJson')}</p>}
      {job.error && <Message kind="error">{job.error}</Message>}
    </>
  )
}
