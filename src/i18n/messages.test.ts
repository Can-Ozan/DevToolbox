import { afterAll, beforeAll, expect, it } from 'vitest'
import { initializeI18n, changeAppLanguage, disposeI18n, i18n } from './index'
import { message, messageError, renderMessage } from './messages'
import { fileMessage, validateFile } from '../workspace/workspaceUtils'

beforeAll(initializeI18n)
afterAll(disposeI18n)

it('keeps a serializable message and resolves it in the current language', async () => {
  const notice = JSON.parse(
    JSON.stringify(
      message('workspace.imported', '{{count}} files imported. Existing files were preserved.', {
        count: 2,
      }),
    ),
  )
  await changeAppLanguage('en')
  expect(renderMessage(notice, i18n.t)).toContain('2 files imported')
  await changeAppLanguage('tr')
  expect(renderMessage(notice, i18n.t)).toContain('2 dosya içe aktarıldı')
})

it('preserves user text as interpolation data and unknown errors verbatim', async () => {
  await changeAppLanguage('de')
  const name = '<img onerror=alert(1)> {{shell.settings}}'
  expect(renderMessage(message('workspace.selectName', 'Select {{name}}', { name }), i18n.t)).toBe(
    `${name} auswählen`,
  )
  expect(renderMessage(fileMessage(new Error(name)), i18n.t)).toBe(name)
})

it('uses the supplied English fallback for unknown message keys', () => {
  const unknown = {
    key: 'future.message',
    fallback: 'Keep {{name}}',
    params: { name: 'user.json' },
  }
  // Incoming message keys can belong to a newer worker than this tab.
  expect(renderMessage(unknown as ReturnType<typeof message>, i18n.t)).toBe('Keep user.json')
})

it('retains canonical Error messages while localizing known errors and storage denial', async () => {
  const error = messageError('workspace.errors.oneFile', 'Choose one file for this tool.')
  expect(error.message).toBe('Choose one file for this tool.')
  await changeAppLanguage('es')
  expect(renderMessage(fileMessage(error), i18n.t)).toBe('Elige un archivo para esta herramienta.')
  expect(renderMessage(fileMessage(new DOMException('', 'QuotaExceededError')), i18n.t)).toContain(
    'almacenamiento',
  )
  try {
    validateFile({ name: 'empty.json', blob: new Blob([]) })
    throw new Error('Expected validation failure')
  } catch (reason) {
    expect(renderMessage(fileMessage(reason), i18n.t)).toBe('Elige un archivo que no esté vacío.')
  }
})
