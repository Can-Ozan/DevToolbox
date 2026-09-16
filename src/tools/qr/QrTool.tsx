import { useEffect, useState } from 'react'
import QRCode from 'qrcode'
import { Download } from 'lucide-react'
import { Button, CopyButton, Editor, Message, useToast } from '../../components/ui'

export default function QrTool() {
  const [input, setInput] = useState('')
  const [mode, setMode] = useState('text')
  const [size, setSize] = useState(384)
  const [level, setLevel] = useState<'L' | 'M' | 'Q' | 'H'>('M')
  const [image, setImage] = useState('')
  const [error, setError] = useState('')
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
            ? 'Enter a valid HTTP(S) URL within QR capacity.'
            : 'Text exceeds the maximum QR byte capacity. Shorten it.',
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
              'This input is too long for the selected correction level. Shorten it or choose a lower level.',
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
  }, [input, mode, size, level])
  return (
    <>
      <div className="field-row">
        <label className="field">
          Input type
          <select value={mode} onChange={(event) => setMode(event.target.value)}>
            <option value="text">Plain text</option>
            <option value="url">URL</option>
          </select>
        </label>
        <label className="field">
          Image size
          <select value={size} onChange={(event) => setSize(Number(event.target.value))}>
            {[256, 384, 512, 768, 1024].map((n) => (
              <option value={n} key={n}>
                {n} × {n} px
              </option>
            ))}
          </select>
        </label>
        <label className="field">
          Error correction
          <select
            value={level}
            onChange={(event) => {
              const value = event.target.value
              if (value === 'L' || value === 'M' || value === 'Q' || value === 'H') setLevel(value)
            }}
          >
            <option value="L">Low · L</option>
            <option value="M">Medium · M</option>
            <option value="Q">Quartile · Q</option>
            <option value="H">High · H</option>
          </select>
        </label>
      </div>
      <div className="editor-grid">
        <Editor
          label="QR input"
          minHeight={290}
          value={input}
          onChange={setInput}
          placeholder={mode === 'url' ? 'https://example.com' : 'Text to encode…'}
        />
        <section className="panel">
          <h2>QR preview</h2>
          <div className="flex min-h-64 items-center justify-center">
            {image ? (
              <img
                src={image}
                alt="Generated QR code"
                width={size}
                height={size}
                style={{ width: Math.min(size, 320), maxWidth: '100%', height: 'auto' }}
              />
            ) : (
              <p className="helper-text" role="status">
                {busy ? 'Generating…' : 'Enter text to generate a QR code.'}
              </p>
            )}
          </div>
        </section>
      </div>
      {error && <Message kind="error">{error}</Message>}
      <div className="actions">
        <CopyButton text={input} label="Copy input" />
        <Button
          disabled={!image}
          onClick={() => {
            const anchor = document.createElement('a')
            anchor.href = image
            anchor.download = 'qrcode.png'
            anchor.click()
            toast('Download started')
          }}
        >
          <Download size={15} />
          Download PNG
        </Button>
        <Button onClick={() => setInput('')}>Clear</Button>
      </div>
      <p className="helper-text">
        QR generation happens entirely in your browser. Higher error correction reduces available
        capacity. The image keeps a white quiet zone for reliable scanning.
      </p>
    </>
  )
}
