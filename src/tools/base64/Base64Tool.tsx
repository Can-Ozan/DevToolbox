import TransformTool from '../../components/TransformTool'
import { decodeBase64, encodeBase64 } from '../../lib/encoding'
export default function Base64Tool() {
  return (
    <TransformTool
      encode={encodeBase64}
      decode={decodeBase64}
      inputHint="Paste text to encode, or Base64 to decode…"
    />
  )
}
