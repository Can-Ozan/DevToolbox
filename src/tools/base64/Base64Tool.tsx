import { useTranslation } from 'react-i18next'
import TransformTool from '../../components/TransformTool'
import { decodeBase64, encodeBase64 } from '../../lib/encoding'
export default function Base64Tool() {
  const { t } = useTranslation()
  return (
    <TransformTool encode={encodeBase64} decode={decodeBase64} inputHint={t('toolUi.base64Hint')} />
  )
}
