import type { ToolCategory, ToolDefinition } from '../registry/tools'
import { i18n } from './index'
import { isLanguage, type Language } from './language'

export function currentLanguage(): Language {
  return isLanguage(i18n.resolvedLanguage) ? i18n.resolvedLanguage : 'en'
}

export function getToolText(tool: ToolDefinition, language: Language) {
  const value: unknown = i18n.isInitialized
    ? i18n.getResource(language, 'translation', `tools.metadata.${tool.id}`)
    : undefined
  const text = value && typeof value === 'object' ? (value as Record<string, unknown>) : {}
  return {
    name: typeof text.name === 'string' && text.name ? text.name : tool.name,
    description:
      typeof text.description === 'string' && text.description
        ? text.description
        : tool.description,
    keywords:
      typeof text.keywords === 'string' && text.keywords
        ? text.keywords.split(/\s+/)
        : tool.keywords,
  }
}

export function getCategoryLabel(category: ToolCategory, language: Language): string {
  const value: unknown = i18n.isInitialized
    ? i18n.getResource(language, 'translation', `tools.categories.${category}`)
    : undefined
  return typeof value === 'string' && value ? value : category
}
