import { matchRegex } from '../../lib/regex'
import { errorMessage } from '../../lib/encoding'
self.onmessage = (event: MessageEvent<{ pattern: string; flags: string; text: string }>) => {
  const { pattern, flags, text } = event.data
  try {
    self.postMessage(matchRegex(pattern, flags, text))
  } catch (error) {
    self.postMessage({ matches: [], limited: false, error: errorMessage(error) })
  }
}
