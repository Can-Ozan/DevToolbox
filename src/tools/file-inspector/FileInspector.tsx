import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import { Button, Message } from '../../components/ui'
import { WorkspaceFilePicker, useFileJob } from '../../workspace/FileControls'
import type { FileInput } from '../../workspace/workspaceTypes'
import { workspace } from '../../workspace/workspaceStore'
import { formatBytes } from '../../workspace/workspaceUtils'
import { errorDescriptor } from '../../lib/encoding'
import { renderMessage } from '../../i18n/messages'
import { currentLanguage, getToolText } from '../../i18n/toolLabels'
import { inspectFile, type Inspection } from './inspection'
import { inspectionTools } from '../../registry/discovery'

export default function FileInspector() {
  const { t } = useTranslation()
  const [file, setFile] = useState<FileInput>()
  const job = useFileJob<Inspection>()
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const current = useRef<FileInput | undefined>(undefined)
  const navigate = useNavigate()
  useEffect(
    () => () => {
      current.current = undefined
    },
    [],
  )
  function clear() {
    current.current = undefined
    setFile(undefined)
    setError('')
    job.reset()
  }
  async function open(path: string) {
    if (!file || !job.output?.valid || saving) return
    const version = file
    setSaving(true)
    setError('')
    try {
      // Reuse persisted input when its MIME is already correct. Signature-detected
      // files with a different reported MIME get an explicit, compatible copy.
      let id =
        'id' in file && typeof file.id === 'string' && file.blob.type === job.output.mimeType
          ? file.id
          : undefined
      if (!id) {
        const [saved] = await workspace.add([
          { ...file, blob: file.blob.slice(0, file.blob.size, job.output.mimeType) },
        ])
        id = saved.id
      }
      if (current.current === version) navigate(`${path}?file=${encodeURIComponent(id)}`)
    } catch (reason) {
      if (current.current === version) setError(renderMessage(errorDescriptor(reason), t))
    } finally {
      setSaving(false)
    }
  }
  const result = job.output
  const recommendations =
    file && result
      ? inspectionTools(file.name, result).map(({ tool }) => ({
          tool,
          reason: t('inspection.accepts', {
            mime: result.mimeType,
            description: getToolText(tool, currentLanguage()).description,
          }),
        }))
      : []
  return (
    <>
      <WorkspaceFilePicker
        disabled={job.busy || saving}
        onSelect={([selected]) => {
          current.current = selected
          setFile(selected)
          setError('')
          void job.run((signal) => inspectFile(selected, signal))
        }}
      />
      {file && (
        <div className="actions">
          <Button disabled={saving} onClick={clear}>
            {job.busy ? t('inspection.cancelInspect') : t('inspection.clearFile')}
          </Button>
        </div>
      )}
      {job.busy && <p role="status">{t('inspection.inspecting')}</p>}
      {(error || job.error) && <Message kind="error">{error || job.error}</Message>}
      {file && (
        <section className="panel file-output" aria-label={t('inspection.fileInspection')}>
          <h2>{t('inspection.fileDetails')}</h2>
          <dl className="result-stats">
            {(
              [
                [t('workspace.filename'), file.name],
                [
                  t('inspection.extension'),
                  /\.([^.]+)$/.exec(file.name)?.[1].toLowerCase() ?? 'None',
                ],
                [t('inspection.reportedMime'), file.blob.type || t('inspection.notProvided')],
                [
                  'Size',
                  t('inspection.byteSize', {
                    size: formatBytes(file.blob.size),
                    count: file.blob.size,
                  }),
                ],
                [
                  'Last modified',
                  file.lastModified &&
                  Number.isFinite(file.lastModified) &&
                  file.lastModified <= 8.64e15
                    ? new Date(file.lastModified).toLocaleString()
                    : t('inspection.notAvailable'),
                ],
                ...(result
                  ? [
                      [t('inspection.detected'), result.mimeType],
                      ...result.details.map(([label, value]) => [
                        label === 'Dimensions'
                          ? t('inspection.dimensions')
                          : label === 'Pages'
                            ? t('inspection.pages')
                            : label === 'ZIP entries'
                              ? t('inspection.zipEntries')
                              : label === 'Files'
                                ? t('inspection.files')
                                : label === 'JSON structure'
                                  ? t('inspection.jsonStructure')
                                  : label === 'Top-level entries'
                                    ? t('inspection.topEntries')
                                    : label,
                        value,
                      ]),
                    ]
                  : []),
              ] as [string, string][]
            ).map(([label, value]) => (
              <div key={label}>
                <dt>{label}</dt>
                <dd>{value}</dd>
              </div>
            ))}
          </dl>
          {result && (
            <p className="helper-text">
              {result.detection === 'JSON filename/MIME hint; validated below'
                ? t('inspection.jsonHint')
                : result.detection === 'Binary file signature; validated below'
                  ? t('inspection.signatureHint')
                  : t('inspection.unsupportedHint')}
            </p>
          )}
          {result?.warning && <Message kind="warning">{result.warning}</Message>}
          {result?.valid && <Message kind="success">{t('inspection.complete')}</Message>}
        </section>
      )}
      {!!recommendations.length && (
        <section className="panel file-output" aria-label={t('inspection.recommended')}>
          <h2>{t('inspection.continueTool')}</h2>
          <p className="helper-text">{t('inspection.handoffHelp')}</p>
          {recommendations.map(({ tool, reason }) => (
            <div className="inspection-recommendation" key={tool.id}>
              <Button
                disabled={saving}
                onClick={() => {
                  void open(tool.path)
                }}
              >
                {t('inspection.openTool', { name: tool.name })}
              </Button>
              <p className="helper-text">{reason}</p>
            </div>
          ))}
        </section>
      )}
      <p className="helper-text">{t('inspection.inspectHelp')}</p>
    </>
  )
}
