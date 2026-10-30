import { messageError } from '../../i18n/messages'
import { useMessageState } from '../../i18n/useMessageState'
import { useTranslation } from 'react-i18next'
import { useRef, useState } from 'react'
import { Button, CopyButton, Editor, Message } from '../../components/ui'
import { errorDescriptor } from '../../lib/encoding'
const algorithms = ['SHA-1', 'SHA-256', 'SHA-384', 'SHA-512'] as const
export default function HashTool() {
  const { t } = useTranslation()
  const [input, setInput] = useState('')
  const [results, setResults] = useState<{ algorithm: string; hash: string }[]>([])
  const [error, setError] = useMessageState()
  const [busy, setBusy] = useState(false)
  const generation = useRef(0)
  function change(value: string) {
    generation.current++
    setInput(value)
    setResults([])
    setError('')
    setBusy(false)
  }
  async function generate() {
    const current = ++generation.current
    setBusy(true)
    setError('')
    try {
      if (!crypto.subtle)
        throw messageError(
          'toolErrors.webCrypto',
          'Web Crypto requires HTTPS or localhost in a modern browser.',
        )
      const data = new TextEncoder().encode(input)
      const hashes = await Promise.all(
        algorithms.map(async (algorithm) => {
          const digest = await crypto.subtle.digest(algorithm, data)
          return {
            algorithm,
            hash: Array.from(new Uint8Array(digest), (byte) =>
              byte.toString(16).padStart(2, '0'),
            ).join(''),
          }
        }),
      )
      if (generation.current === current) setResults(hashes)
    } catch (error) {
      if (generation.current === current) setError(errorDescriptor(error))
    } finally {
      if (generation.current === current) setBusy(false)
    }
  }
  return (
    <>
      <Editor
        label={t('toolUi.textToHash')}
        value={input}
        onChange={change}
        minHeight={180}
        placeholder={t('toolUi.hashHint')}
      />
      <div className="actions">
        <Button variant="primary" disabled={busy} onClick={() => void generate()}>
          {busy ? t('toolUi.generating') : t('toolUi.generateHashes')}
        </Button>
        <Button onClick={() => change('')}>{t('toolUi.clear')}</Button>
      </div>
      {error && <Message kind="error">{error}</Message>}
      {results.map(({ algorithm, hash }) => (
        <section key={algorithm}>
          <div className="output-title">
            <h2>{algorithm}</h2>
            <CopyButton text={hash} label={t('toolUi.copyNamed', { name: algorithm })} />
          </div>
          <pre className="code-output">{hash}</pre>
        </section>
      ))}
      <Message>{t('toolUi.hashHelp')}</Message>
    </>
  )
}
