import { useState } from 'react'
import Markdown, { defaultUrlTransform } from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { Button, CopyButton, DownloadButton, Editor, Message } from '../../components/ui'
import './markdown.css'

const localImage = /^data:image\/(?:png|jpeg|gif|webp);base64,[a-z\d+/=\s]+$/i
const sample =
  '# Hello, DevToolbox\n\nWrite **Markdown**, see the result instantly.\n\n- [x] Private by default\n- [ ] Build something useful\n\n| Tool | Runs |\n| --- | --- |\n| Markdown | Locally |\n\n> Small tools, less friction.\n\n```js\nconst hello = "world";\n```'
export default function MarkdownTool() {
  const [input, setInput] = useState('')
  const tooLarge = input.length > 100000
  return (
    <>
      <div className="actions">
        <Button onClick={() => setInput(sample)}>Load sample</Button>
        <Button onClick={() => setInput('')}>Clear</Button>
        <CopyButton text={input} label="Copy Markdown" />
        <DownloadButton
          text={input}
          filename="document.md"
          mimeType="text/markdown;charset=utf-8"
        />
      </div>
      <div className="editor-grid">
        <Editor
          label="Markdown input"
          value={input}
          onChange={setInput}
          minHeight={420}
          placeholder="# Write something useful…"
        />
        <section className="editor">
          <div className="editor-heading">Live preview</div>
          <div className="markdown-preview">
            {tooLarge ? (
              <Message kind="error">
                Preview is limited to 100,000 characters. Shorten the input to continue.
              </Message>
            ) : (
              <Markdown
                skipHtml
                remarkPlugins={[remarkGfm]}
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
                        [Image blocked: {alt || 'remote source'}. Use an embedded PNG, JPEG, GIF, or
                        WebP data URL.]
                      </span>
                    ),
                }}
              >
                {input || '*Your preview will appear here.*'}
              </Markdown>
            )}
          </div>
        </section>
      </div>
      <p className="helper-text">
        Raw HTML is ignored. Remote images are blocked to keep previewing private; embedded raster
        images are supported. Links open only when clicked.
      </p>
    </>
  )
}
