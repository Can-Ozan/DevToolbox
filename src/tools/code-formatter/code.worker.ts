import { formatCode, type CodeLanguage } from '../../lib/codeFormat'
import { errorDescriptor } from '../../lib/encoding'
import { message } from '../../i18n/messages'
self.onmessage = async (
  event: MessageEvent<{ input: string; language: CodeLanguage; indent: string }>,
) => {
  try {
    self.postMessage({
      result: await formatCode(event.data.input, event.data.language, event.data.indent),
    })
  } catch (error) {
    self.postMessage({
      error:
        error instanceof Error
          ? errorDescriptor(error)
          : message('toolErrors.codeFailed', 'Formatting failed.'),
    })
  }
}
