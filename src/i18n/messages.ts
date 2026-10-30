import type { ParseKeys, TFunction } from 'i18next'

export interface AppMessage {
  key: ParseKeys
  fallback: string
  params: Record<string, string | number | AppMessage>
}
export type DisplayMessage = AppMessage | string

export function message(
  key: ParseKeys,
  fallback: string,
  params: AppMessage['params'] = {},
): AppMessage {
  return { key, fallback, params }
}

// No runtime locale imports: this descriptor can also cross worker boundaries.
export class MessageError extends Error {
  constructor(
    readonly descriptor: AppMessage,
    options?: ErrorOptions,
  ) {
    super(englishMessage(descriptor), options)
  }
}

export function englishMessage(value: DisplayMessage): string {
  return typeof value === 'string'
    ? value
    : value.fallback.replace(/\{\{(\w+)\}\}/g, (match, key: string) => {
        const param = value.params[key]
        return typeof param === 'object' ? englishMessage(param) : String(param ?? match)
      })
}

export function messageError(
  key: ParseKeys,
  fallback: string,
  params: AppMessage['params'] = {},
  options?: ErrorOptions,
) {
  return new MessageError(message(key, fallback, params), options)
}

/** Return text only; React owns escaping, and user values are never translation keys. */
export function renderMessage(value: DisplayMessage, t: TFunction): string {
  return typeof value === 'string'
    ? value
    : t(value.key, {
        ...Object.fromEntries(
          Object.entries(value.params).map(([key, param]) => [
            key,
            typeof param === 'object' ? renderMessage(param, t) : param,
          ]),
        ),
        defaultValue: value.fallback,
        interpolation: { escapeValue: false },
      })
}
