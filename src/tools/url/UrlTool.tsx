import { useState } from 'react'
import TransformTool from '../../components/TransformTool'
export default function UrlTool() {
  const [mode, setMode] = useState('component')
  return (
    <TransformTool
      encode={mode === 'component' ? encodeURIComponent : encodeURI}
      decode={mode === 'component' ? decodeURIComponent : decodeURI}
      inputHint="Paste a URL, query value, or encoded text…"
    >
      <label className="field">
        Encoding mode
        <select value={mode} onChange={(event) => setMode(event.target.value)}>
          <option value="component">URL component — encodeURIComponent</option>
          <option value="url">Full URL — encodeURI (preserves URL separators)</option>
        </select>
      </label>
    </TransformTool>
  )
}
