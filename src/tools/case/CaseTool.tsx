import { useState } from 'react'
import { Button, CopyButton, Editor } from '../../components/ui'
import { convertCases } from '../../lib/caseConverter'

export default function CaseTool() {
  const [input, setInput] = useState('')
  const results = convertCases(input)
  return (
    <>
      <Editor
        label="Text input"
        value={input}
        onChange={setInput}
        minHeight={140}
        placeholder="helloWorld, some_text, or a new idea…"
      />
      <div className="actions">
        <CopyButton
          text={
            input
              ? Object.entries(results)
                  .map(([name, value]) => `${name}: ${value}`)
                  .join('\n')
              : ''
          }
          label="Copy all"
        />
        <Button onClick={() => setInput('')}>Clear</Button>
      </div>
      <div className="result-list">
        {Object.entries(results).map(([name, value]) => (
          <section className="panel" key={name}>
            <div className="output-title" style={{ marginTop: 0 }}>
              <h2>{name}</h2>
              <CopyButton text={value} label={`Copy ${name}`} />
            </div>
            <pre className="code-output">{value || '—'}</pre>
          </section>
        ))}
      </div>
      <p className="helper-text">
        Identifier formats split spaces, punctuation, underscores, hyphens, and camelCase
        boundaries. Unicode letters and combining marks are retained; word boundaries in unspaced
        languages are not inferred.
      </p>
    </>
  )
}
