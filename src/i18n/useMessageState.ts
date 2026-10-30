import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { renderMessage, type DisplayMessage } from './messages'

/** Keep the descriptor so an in-flight operation or stored notice survives a locale switch. */
export function useMessageState(initial: DisplayMessage = '') {
  const { t } = useTranslation()
  const [value, setValue] = useState<DisplayMessage>(initial)
  return [renderMessage(value, t), setValue] as const
}
