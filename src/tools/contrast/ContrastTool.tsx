import { renderMessage } from '../../i18n/messages'
import { useTranslation } from 'react-i18next'
import { useState } from 'react'
import { ArrowLeftRight, Check, X } from 'lucide-react'
import { Button, CopyButton, Message } from '../../components/ui'
import { contrastChecks, contrastColor, contrastRatio } from '../../lib/contrast'
import { formatColor } from '../../lib/color'
import { errorDescriptor } from '../../lib/encoding'

export default function ContrastTool() {
  const { t } = useTranslation()
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
    error = renderMessage(errorDescriptor(reason), t)
  }
  return (
    <>
      <div className="field-row">
        <label className="field">
          {t('toolUi.foreground')}
          <input
            type="text"
            value={foreground}
            onChange={(event) => setForeground(event.target.value)}
            spellCheck={false}
            placeholder={t('toolUi.foregroundHint')}
          />
        </label>
        <label className="field">
          {t('toolUi.background')}
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
          {t('toolUi.swap')}
        </Button>
      </div>
      {error && <Message kind="error">{error}</Message>}
      {result && (
        <>
          <div className="editor-grid">
            <section
              className="panel"
              style={{ color: result.foreground, backgroundColor: result.background }}
              aria-label={t('toolUi.colorPreview')}
            >
              <h2 style={{ fontSize: 26 }}>{t('toolUi.contrastSample')}</h2>
              <p style={{ fontSize: 16 }}>{t('toolUi.contrastSampleHelp')}</p>
              <p style={{ fontSize: 14, marginTop: 30 }}>
                {t('toolUi.foregroundValue', { value: result.foreground })}
                <br />
                {t('toolUi.backgroundValue', { value: result.background })}
              </p>
            </section>
            <section className="panel">
              <h2>{t('toolUi.contrastRatio')}</h2>
              <p className="password-result" aria-label={t('toolUi.contrastRatio')}>
                {result.ratio.toFixed(2)}:1
              </p>
              <div className="actions">
                <CopyButton text={`${result.ratio.toFixed(2)}:1`} label={t('toolUi.copyRatio')} />
              </div>
            </section>
          </div>
          <div className="result-list" style={{ marginTop: 20 }}>
            {contrastChecks(result.ratio).map((check) => (
              <div className="result-row" key={check.label}>
                {check.passes ? <Check size={18} /> : <X size={18} />}
                <strong className="text-xs">
                  {
                    {
                      'AA normal text': t('toolUi.aaNormal'),
                      'AA large text': t('toolUi.aaLarge'),
                      'AAA normal text': t('toolUi.aaaNormal'),
                      'AAA large text': t('toolUi.aaaLarge'),
                    }[check.label]
                  }
                </strong>
                <span style={{ flex: 1, fontSize: 12 }}>
                  {t('toolUi.minimum', { value: check.minimum })}
                </span>
                <strong className="text-xs">
                  {check.passes ? t('toolUi.pass') : t('toolUi.fail')}
                </strong>
              </div>
            ))}
          </div>
        </>
      )}
      <p className="helper-text">{t('toolUi.contrastHelp')}</p>
      <p className="helper-text">
        {t('toolUi.calculatedUsing')}{' '}
        <a
          className="underline"
          href="https://www.w3.org/WAI/WCAG22/Understanding/contrast-minimum.html"
          target="_blank"
          rel="noopener noreferrer"
        >
          {t('toolUi.wcagDefinitions')}
        </a>
        .
      </p>
    </>
  )
}
