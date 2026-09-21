import { formatCode, type CodeLanguage } from '../../lib/codeFormat'
self.onmessage = async (
  event: MessageEvent<{ input: string; language: CodeLanguage; indent: string }>,
) => {
  try {
    self.postMessage({
      result: await formatCode(event.data.input, event.data.language, event.data.indent),
    })
  } catch (error) {
    self.postMessage({ error: error instanceof Error ? error.message : 'Formatting failed.' })
  }
}
