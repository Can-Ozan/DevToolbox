export type CodeLanguage = 'html' | 'css' | 'javascript'
export async function formatCode(input: string, language: CodeLanguage, indent = '2') {
  if (!input.trim()) throw new Error('Enter code to format.')
  if (input.length > 200_000) throw new Error('Code is limited to 200,000 characters.')
  if (!['2', '4', 'tab'].includes(indent)) throw new Error('Choose a supported indentation.')
  const prettier = await import('prettier/standalone')
  const options = { tabWidth: indent === '4' ? 4 : 2, useTabs: indent === 'tab', embeddedLanguageFormatting: 'off' as const, htmlWhitespaceSensitivity: 'strict' as const }
  if (language === 'html') return prettier.format(input, { ...options, parser: 'html', plugins: [await import('prettier/plugins/html')] })
  if (language === 'css') return prettier.format(input, { ...options, parser: 'css', plugins: [await import('prettier/plugins/postcss')] })
  if (language === 'javascript') return prettier.format(input, { ...options, parser: 'babel', plugins: [await import('prettier/plugins/babel'), await import('prettier/plugins/estree')] })
  throw new Error('Choose HTML, CSS or JavaScript.')
}
