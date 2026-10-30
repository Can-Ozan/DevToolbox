import { useTranslation } from 'react-i18next'
import { ToolToolbar } from '../../components/ToolLayout'
import { useState } from 'react'
import Markdown, { defaultUrlTransform } from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { taskListLabels } from './taskListLabels'
import { Button, CopyButton, DownloadButton, Editor, Message } from '../../components/ui'
import './markdown.css'

const localImage = /^data:image\/(?:png|jpeg|gif|webp);base64,[a-z\d+/=\s]+$/i
const sample =
  '# Hello, DevToolbox\n\nWrite **Markdown**, see the result instantly.\n\n- [x] Private by default\n- [ ] Build something useful\n\n| Tool | Runs |\n| --- | --- |\n| Markdown | Locally |\n\n> Small tools, less friction.\n\n```js\nconst hello = "world";\n```'
export default function MarkdownTool() {
  const { t } = useTranslation()
  const [input, setInput] = useState('')
  const tooLarge = input.length > 100000
  return (
    <>
      <ToolToolbar>
        <Button onClick={() => setInput(sample)}>{t('toolUi.loadSample')}</Button>
        <Button onClick={() => setInput('')}>{t('toolUi.clear')}</Button>
        <CopyButton text={input} label={t('toolUi.copyMarkdown')} />
        <DownloadButton
          text={input}
          filename="document.md"
          mimeType="text/markdown;charset=utf-8"
        />
      </ToolToolbar>
      <div className="editor-grid">
        <Editor
          label={t('toolUi.markdownInput')}
          value={input}
          onChange={setInput}
          minHeight={360}
          placeholder={t('toolUi.markdownHint')}
        />
        <section className="editor">
          <div className="editor-heading">{t('toolUi.livePreview')}</div>
          <div className="markdown-preview">
            {tooLarge ? (
              <Message kind="error">{t('toolUi.markdownLimit')}</Message>
            ) : (
              <Markdown
                skipHtml
                remarkPlugins={[remarkGfm]}
                rehypePlugins={[taskListLabels]}
                urlTransform={(url, key) =>
                  key === 'src' ? (localImage.test(url) ? url : '') : defaultUrlTransform(url)
                }
                components={{
                  a: ({ href, children }) => (
                    <a
                      href={href}
                      target="_blank"
                      rel="noopener noreferrer"
                      referrerPolicy="no-referrer"
                    >
                      {children}
                    </a>
                  ),
                  img: ({ src, alt }) =>
                    src ? (
                      <img src={src} alt={alt ?? ''} />
                    ) : (
                      <span className="helper-text">
                        {t('toolUi.blockedImage', { name: alt || t('toolUi.remoteSource') })}
                      </span>
                    ),
                }}
              >
                {input || t('toolUi.markdownEmpty')}
              </Markdown>
            )}
          </div>
        </section>
      </div>
      <p className="helper-text">{t('toolUi.markdownHelp')}</p>
    </>
  )
}
