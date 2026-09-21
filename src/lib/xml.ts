export type XmlMode = 'format' | 'minify' | 'validate'
export function formatXml(input: string, mode: XmlMode = 'format', indent = '2') {
  if (!input.trim()) throw new Error('Enter XML to get started.')
  if (input.length > 200_000) throw new Error('XML is limited to 200,000 characters.')
  if (/<!\s*(?:DOCTYPE|ENTITY)\b/i.test(input))
    throw new Error('DTD and entity declarations are disabled. External resources are never resolved.')
  if (!['2', '4', 'tab'].includes(indent)) throw new Error('Choose a supported indentation.')
  const doc = new DOMParser().parseFromString(input, 'application/xml')
  const error = doc.getElementsByTagNameNS('http://www.mozilla.org/newlayout/xml/parsererror.xml', 'parsererror')[0]
    ?? doc.getElementsByTagNameNS('http://www.w3.org/1999/xhtml', 'parsererror')[0]
  if (error || !doc.documentElement) throw new Error(error?.textContent?.trim() || 'Invalid XML document.')
  const serializer = new XMLSerializer()
  const unit = indent === 'tab' ? '\t' : ' '.repeat(Number(indent))
  const declaration = input.match(/^\uFEFF?(<\?xml\s[\s\S]*?\?>)/)?.[1] ?? ''
  const escape = (value: string) => value.replaceAll('&', '&amp;').replaceAll('"', '&quot;').replaceAll('<', '&lt;').replaceAll('\r', '&#13;').replaceAll('\n', '&#10;').replaceAll('\t', '&#9;')
  function render(node: Node, depth: number, inherited = false): string {
    if (depth > 100) throw new Error('XML nesting is limited to 100 levels.')
    if (node.nodeType !== 1) return serializer.serializeToString(node)
    const element = node as Element
    const children = Array.from(element.childNodes)
    // Mixed content and xml:space may contain meaningful whitespace. Preserve it verbatim.
    const preserve = element.getAttribute('xml:space') === 'preserve' || (inherited && element.getAttribute('xml:space') !== 'default')
    if (preserve || children.some(child => child.nodeType === 4 || (child.nodeType === 3 && child.textContent?.trim())))
      return serializer.serializeToString(element)
    const attributes = Array.from(element.attributes).map(attr => ` ${attr.name}="${escape(attr.value)}"`).join('')
    const opening = `<${element.tagName}${attributes}`
    const content = children.filter(child => child.nodeType !== 3 || child.textContent?.trim())
    if (!content.length) return opening + '/>'
    const pretty = mode === 'format'
    const body = content.map(child => (pretty ? unit.repeat(depth + 1) : '') + render(child, depth + 1, preserve)).join(pretty ? '\n' : '')
    return `${opening}>${pretty ? '\n' : ''}${body}${pretty ? '\n' + unit.repeat(depth) : ''}</${element.tagName}>`
  }
  // Check depth even inside mixed content that is serialized intact.
  const stack: [Node, number][] = [[doc.documentElement, 0]]
  while (stack.length) {
    const [node, depth] = stack.pop()!
    if (depth > 100) throw new Error('XML nesting is limited to 100 levels.')
    for (const child of Array.from(node.childNodes)) if (child.nodeType === 1) stack.push([child, depth + 1])
  }
  if (mode === 'validate') return input
  return [declaration, ...Array.from(doc.childNodes).filter(node => node.nodeType !== 3 && !(node.nodeType === 7 && node.nodeName === 'xml')).map(node => render(node, 0))].filter(Boolean).join(mode === 'format' ? '\n' : '')
}
