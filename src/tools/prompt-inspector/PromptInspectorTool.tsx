import { useMemo, useState } from 'react'
import { CopyButton, Editor, Message } from '../../components/ui'

const checks = [
  ['Role', /\b(role|act as|you are|sen bir|rol)\b/i],
  ['Context', /\b(context|background|project|repo|uygulama|proje|bağlam)\b/i],
  ['Requirements', /\b(requirements?|must|should|gereksinim|zorunlu|yapmalı)\b/i],
  ['Constraints', /\b(constraints?|do not|never|limit|kısıt|yapma|asla)\b/i],
  ['Output format', /\b(output|format|json|markdown|table|çıktı|biçim)\b/i],
] as const

export default function PromptInspectorTool() {
  const [prompt, setPrompt] = useState('')
  const analysis = useMemo(() => {
    const words = prompt.trim() ? prompt.trim().split(/\s+/).length : 0
    const lines = prompt ? prompt.split('\n').length : 0
    const estimatedTokens = Math.ceil(prompt.length / 4)
    const structure = checks.map(([label, pattern]) => ({ label, found: pattern.test(prompt) }))
    const missing = structure.filter((item) => !item.found).map((item) => item.label)
    const optimized = [
      '## Goal',
      prompt.trim() || '[Describe the task]',
      '',
      '## Context',
      '[Add the project/background information the model needs]',
      '',
      '## Requirements',
      '- [Requirement 1]',
      '- [Requirement 2]',
      '',
      '## Constraints',
      '- Preserve existing behavior unless explicitly changed',
      '- Prefer clear, maintainable output',
      '',
      '## Output',
      '[Specify the exact response or artifact format]',
    ].join('\n')
    return { words, lines, estimatedTokens, structure, missing, optimized }
  }, [prompt])

  return (
    <>
      <Editor
        label="Prompt"
        value={prompt}
        onChange={setPrompt}
        minHeight={250}
        placeholder="Paste a prompt for ChatGPT, Claude, Codex or another coding agent…"
      />
      <div className="workspace-stats">
        <div><strong>{prompt.length}</strong><span>characters</span></div>
        <div><strong>{analysis.words}</strong><span>words</span></div>
        <div><strong>~{analysis.estimatedTokens}</strong><span>estimated tokens</span></div>
        <div><strong>{analysis.lines}</strong><span>lines</span></div>
      </div>
      <div className="output-title"><h2>Structure check</h2></div>
      <dl className="data-table">
        {analysis.structure.map((item) => (
          <div key={item.label}>
            <dt>{item.label}</dt>
            <dd>{item.found ? '✓ Detected' : '○ Missing or unclear'}</dd>
          </div>
        ))}
      </dl>
      {prompt && (
        <Message kind={analysis.missing.length ? 'warning' : 'success'}>
          {analysis.missing.length
            ? `Consider adding: ${analysis.missing.join(', ')}.`
            : 'This prompt has the main structural signals for a clear technical request.'}
        </Message>
      )}
      <div className="output-title">
        <h2>Structured template</h2>
        <CopyButton text={analysis.optimized} label="Copy structured template" />
      </div>
      <pre className="code-output">{analysis.optimized}</pre>
      <p className="helper-text">Token count is an approximation; exact tokenization varies by model.</p>
    </>
  )
}
