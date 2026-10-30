import { useTranslation } from 'react-i18next'
import { ToolToolbar, ToolActions, ToolTabs } from '../../components/ToolLayout'
import { useState } from 'react'
import { Button, CopyButton, DownloadButton, Editor, Message } from '../../components/ui'
import { useFileJob } from '../../workspace/FileControls'
import type { CodeLanguage } from '../../lib/codeFormat'
import { runWorkerJob } from '../../lib/workerJob'
export default function CodeFormatter() {
  const { t } = useTranslation()
  const [input, setInput] = useState(''),
    [language, setLanguage] = useState<CodeLanguage>('html'),
    [indent, setIndent] = useState('2')
  const job = useFileJob<string>()
  return (
    <>
      <ToolTabs<CodeLanguage>
        label={t('toolUi.codeLanguage')}
        value={language}
        options={[
          { value: 'html', label: 'HTML' },
          { value: 'css', label: 'CSS' },
          { value: 'javascript', label: 'JavaScript' },
        ]}
        onChange={(value) => {
          job.reset()
          setLanguage(value)
        }}
      />
      <ToolToolbar>
        <Button
          variant="primary"
          disabled={job.busy}
          onClick={() =>
            void job.run((signal) =>
              runWorkerJob<string>(
                () => new Worker(new URL('./code.worker.ts', import.meta.url), { type: 'module' }),
                { input, language, indent },
                signal,
              ),
            )
          }
        >
          {t('toolUi.formatCode')}
        </Button>
        <label className="toolbar-field">
          {t('toolUi.indentation')}
          <select
            value={indent}
            onChange={(e) => {
              job.reset()
              setIndent(e.target.value)
            }}
          >
            <option value="2">{t('toolUi.spaces2')}</option>
            <option value="4">{t('toolUi.spaces4')}</option>
            <option value="tab">{t('toolUi.tabs')}</option>
          </select>
        </label>
        <Button
          onClick={() => {
            job.reset()
            setInput('')
          }}
        >
          {t('toolUi.clear')}
        </Button>
        {job.busy && <Button onClick={job.reset}>{t('toolUi.cancelFormat')}</Button>}
      </ToolToolbar>
      {job.busy && <p role="status">{t('toolUi.formatting')}</p>}
      {job.error && <Message kind="error">{job.error}</Message>}
      <div className="editor-grid">
        <Editor
          minHeight={360}
          label={t('toolUi.codeInput')}
          value={input}
          onChange={(value) => {
            job.reset()
            setInput(value)
          }}
          placeholder={t('toolUi.codeHint')}
        />
        <Editor
          minHeight={360}
          label={t('toolUi.formattedCode')}
          placeholder={t('toolUi.formattedHint')}
          value={job.output ?? ''}
          actions={
            <ToolActions label={t('toolUi.outputActions')}>
              <CopyButton
                text={job.output ?? ''}
                label={t('toolUi.copyOutput')}
                visibleLabel={t('common.copy')}
              />
              <DownloadButton
                text={job.output ?? ''}
                filename={`formatted.${language === 'javascript' ? 'js' : language}`}
                mimeType="text/plain;charset=utf-8"
              />
            </ToolActions>
          }
          readOnly
        />
      </div>

      <p className="helper-text">{t('toolUi.codeHelp')}</p>
    </>
  )
}
