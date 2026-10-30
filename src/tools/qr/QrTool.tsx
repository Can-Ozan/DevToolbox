import { useMessageState } from '../../i18n/useMessageState'
import { useTranslation } from 'react-i18next'
import { useEffect, useState } from 'react'
import QRCode from 'qrcode'
import { message } from '../../i18n/messages'
import { Download } from 'lucide-react'
import { Button, CopyButton, Editor, Message, useToast } from '../../components/ui'

export default function QrTool() {
  const { t } = useTranslation()
  const [input, setInput] = useState('')
  const [mode, setMode] = useState('text')
  const [size, setSize] = useState(384)
  const [level, setLevel] = useState<'L' | 'M' | 'Q' | 'H'>('M')
  const [image, setImage] = useState('')
  const [error, setError] = useMessageState()
  const [busy, setBusy] = useState(false)
  const toast = useToast()
  useEffect(() => {
    setImage('')
    setError('')
    setBusy(false)
    if (!input) return
    let cancelled = false
    const timer = setTimeout(() => {
      try {
        if (mode === 'url') {
          const url = new URL(input)
          if (!['http:', 'https:'].includes(url.protocol))
            throw new Error('Use an HTTP or HTTPS URL.')
        }
        if (new TextEncoder().encode(input).length > 2953)
          throw new Error('Text exceeds the maximum QR byte capacity. Shorten it.')
      } catch {
        setError(
          mode === 'url'
            ? message('toolErrors.qrUrl', 'Enter a valid HTTP(S) URL within QR capacity.')
            : message(
                'toolErrors.qrCapacity',
                'Text exceeds the maximum QR byte capacity. Shorten it.',
              ),
        )
        return
      }
      setBusy(true)
      void QRCode.toDataURL(input, {
        width: size,
        margin: 4,
        errorCorrectionLevel: level,
        color: { dark: '#000000', light: '#ffffff' },
      })
        .then((url) => {
          if (!cancelled) setImage(url)
        })
        .catch(() => {
          if (!cancelled)
            setError(
              message(
                'toolErrors.qrLevel',
                'This input is too long for the selected correction level. Shorten it or choose a lower level.',
              ),
            )
        })
        .finally(() => {
          if (!cancelled) setBusy(false)
        })
    }, 180)
    return () => {
      cancelled = true
      clearTimeout(timer)
    }
  }, [input, mode, size, level, setError])
  return (
    <>
      <div className="field-row">
        <label className="field">
          {t('toolUi.inputType')}
          <select value={mode} onChange={(event) => setMode(event.target.value)}>
            <option value="text">{t('toolUi.plainText')}</option>
            <option value="url">URL</option>
          </select>
        </label>
        <label className="field">
          {t('toolUi.imageSize')}
          <select value={size} onChange={(event) => setSize(Number(event.target.value))}>
            {[256, 384, 512, 768, 1024].map((n) => (
              <option value={n} key={n}>
                {n} × {n} px
              </option>
            ))}
          </select>
        </label>
        <label className="field">
          {t('toolUi.errorCorrection')}
          <select
            value={level}
            onChange={(event) => {
              const value = event.target.value
              if (value === 'L' || value === 'M' || value === 'Q' || value === 'H') setLevel(value)
            }}
          >
            <option value="L">{t('toolUi.qrLow')}</option>
            <option value="M">{t('toolUi.qrMedium')}</option>
            <option value="Q">{t('toolUi.qrQuartile')}</option>
            <option value="H">{t('toolUi.qrHigh')}</option>
          </select>
        </label>
      </div>
      <div className="editor-grid">
        <Editor
          label={t('toolUi.qrInput')}
          minHeight={290}
          value={input}
          onChange={setInput}
          placeholder={mode === 'url' ? 'https://example.com' : t('toolUi.qrHint')}
        />
        <section className="panel">
          <h2>{t('toolUi.qrPreview')}</h2>
          <div className="flex min-h-64 items-center justify-center">
            {image ? (
              <img
                src={image}
                alt={t('toolUi.generatedQr')}
                width={size}
                height={size}
                style={{ width: Math.min(size, 320), maxWidth: '100%', height: 'auto' }}
              />
            ) : (
              <p className="helper-text" role="status">
                {busy ? t('toolUi.generating') : t('toolUi.qrEmpty')}
              </p>
            )}
          </div>
        </section>
      </div>
      {error && <Message kind="error">{error}</Message>}
      <div className="actions">
        <CopyButton text={input} label={t('toolUi.copyInput')} />
        <Button
          disabled={!image}
          onClick={() => {
            const anchor = document.createElement('a')
            anchor.href = image
            anchor.download = 'qrcode.png'
            anchor.click()
            toast(t('common.downloadStarted'))
          }}
        >
          <Download size={15} />
          {t('toolUi.downloadPng')}
        </Button>
        <Button onClick={() => setInput('')}>{t('toolUi.clear')}</Button>
      </div>
      <p className="helper-text">{t('toolUi.qrHelp')}</p>
    </>
  )
}
