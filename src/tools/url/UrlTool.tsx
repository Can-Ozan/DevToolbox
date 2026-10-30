import { useTranslation } from 'react-i18next'
import { useState } from 'react'
import TransformTool from '../../components/TransformTool'
export default function UrlTool() {
  const { t } = useTranslation()
  const [mode, setMode] = useState('component')
  return (
    <TransformTool
      encode={mode === 'component' ? encodeURIComponent : encodeURI}
      decode={mode === 'component' ? decodeURIComponent : decodeURI}
      inputHint={t('toolUi.urlHint')}
    >
      <label className="field">
        {t('toolUi.encodingMode')}
        <select value={mode} onChange={(event) => setMode(event.target.value)}>
          <option value="component">{t('toolUi.urlComponent')}</option>
          <option value="url">{t('toolUi.fullUrl')}</option>
        </select>
      </label>
    </TransformTool>
  )
}
