import type { Root, RootContent } from 'hast'

function visibleText(node: RootContent): string {
  if (node.type === 'text') return node.value
  if (node.type !== 'element') return '' // Raw HTML remains ignored by the preview.
  if (['input', 'ul', 'ol'].includes(node.tagName)) return ''
  if (node.tagName === 'img') return String(node.properties.alt ?? '')
  if (node.tagName === 'br') return ' '
  return node.children.map(visibleText).join('')
}

// Label GFM's generated, disabled checkboxes without changing preview markup or styles.
export function taskListLabels() {
  return (tree: Root) => {
    function visit(node: Root | RootContent) {
      if (!('children' in node)) return
      if (node.type === 'element' && node.tagName === 'li') {
        // Loose lists retain a paragraph; tight lists put the checkbox directly in the li.
        const content =
          node.children.find((child) => child.type === 'element' && child.tagName === 'p') ?? node
        if ('children' in content) {
          const checkbox = content.children.find(
            (child) =>
              child.type === 'element' &&
              child.tagName === 'input' &&
              child.properties.type === 'checkbox',
          )
          if (checkbox?.type === 'element')
            checkbox.properties.ariaLabel =
              content.children.map(visibleText).join('').replace(/\s+/g, ' ').trim() || 'Task item'
        }
      }
      node.children.forEach(visit)
    }
    visit(tree)
  }
}
