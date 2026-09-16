import { useState } from 'react'
import { ArrowLeftRight, Check, X } from 'lucide-react'
import { Button, CopyButton, Message } from '../../components/ui'
import { contrastChecks, contrastColor, contrastRatio } from '../../lib/contrast'
import { formatColor } from '../../lib/color'
import { errorMessage } from '../../lib/encoding'

export default function ContrastTool() {
  const [foreground, setForeground] = useState('#292834')
  const [background, setBackground] = useState('#FFFFFF')
  let result: { ratio: number; foreground: string; background: string } | null = null
  let error = ''
  try {
    const fg = contrastColor(foreground)
    const bg = contrastColor(background)
    result = {
      ratio: contrastRatio(fg, bg),
      foreground: formatColor(fg).hex,
      background: formatColor(bg).hex,
    }
  } catch (reason) {
    error = errorMessage(reason)
  }
  return (
    <>
      <div className="field-row">
        <label className="field">
          Foreground color
          <input
            type="text"
            value={foreground}
            onChange={(event) => setForeground(event.target.value)}
            spellCheck={false}
            placeholder="#292834 or rgb(41, 40, 52)"
          />
        </label>
        <label className="field">
          Background color
          <input
            type="text"
            value={background}
            onChange={(event) => setBackground(event.target.value)}
            spellCheck={false}
            placeholder="#FFFFFF"
          />
        </label>
        <Button
          onClick={() => {
            setForeground(background)
            setBackground(foreground)
          }}
        >
          <ArrowLeftRight size={15} />
          Swap
        </Button>
      </div>
      {error && <Message kind="error">{error}</Message>}
      {result && (
        <>
          <div className="editor-grid">
            <section
              className="panel"
              style={{ color: result.foreground, backgroundColor: result.background }}
              aria-label="Color combination preview"
            >
              <h2 style={{ fontSize: 26 }}>A clear point of view.</h2>
              <p style={{ fontSize: 16 }}>
                This sample uses your chosen foreground and background colors.
              </p>
              <p style={{ fontSize: 14, marginTop: 30 }}>
                Foreground {result.foreground}
                <br />
                Background {result.background}
              </p>
            </section>
            <section className="panel">
              <h2>Contrast ratio</h2>
              <p className="password-result" aria-label="Contrast ratio">
                {result.ratio.toFixed(2)}:1
              </p>
              <div className="actions">
                <CopyButton text={`${result.ratio.toFixed(2)}:1`} label="Copy ratio" />
              </div>
            </section>
          </div>
          <div className="result-list" style={{ marginTop: 20 }}>
            {contrastChecks(result.ratio).map((check) => (
              <div className="result-row" key={check.label}>
                {check.passes ? <Check size={18} /> : <X size={18} />}
                <strong className="text-xs">{check.label}</strong>
                <span style={{ flex: 1, fontSize: 12 }}>{check.minimum}:1 minimum</span>
                <strong className="text-xs">{check.passes ? 'Pass' : 'Fail'}</strong>
              </div>
            ))}
          </div>
        </>
      )}
      <p className="helper-text">
        Large text means at least 24px regular or about 18.67px bold. Pass/fail uses the unrounded
        ratio. Opaque sRGB colors only; transparency is not supported.
      </p>
      <p className="helper-text">
        Calculated using the{' '}
        <a
          className="underline"
          href="https://www.w3.org/WAI/WCAG22/Understanding/contrast-minimum.html"
          target="_blank"
          rel="noopener noreferrer"
        >
          WCAG relative luminance and contrast definitions
        </a>
        .
      </p>
    </>
  )
}
