import { englishMessage, message, messageError, type AppMessage } from '../i18n/messages'
export const cronFields = [
  { key: 'minute', label: 'Minute', min: 0, max: 59 },
  { key: 'hour', label: 'Hour', min: 0, max: 23 },
  { key: 'day', label: 'Day of month', min: 1, max: 31 },
  { key: 'month', label: 'Month', min: 1, max: 12 },
  { key: 'weekday', label: 'Day of week', min: 0, max: 6 },
] as const
export type CronKey = (typeof cronFields)[number]['key']
export type CronValues = Record<CronKey, string>
export const cronPresets = [
  { label: 'Every minute', expression: '* * * * *' },
  { label: 'Every 5 minutes', expression: '*/5 * * * *' },
  { label: 'Every hour', expression: '0 * * * *' },
  { label: 'Every day', expression: '0 9 * * *' },
  { label: 'Every weekday', expression: '0 9 * * 1-5' },
  { label: 'Every week', expression: '0 9 * * 0' },
  { label: 'Every month', expression: '0 9 1 * *' },
] as const
export function cronValues(expression: string): CronValues {
  const [minute, hour, day, month, weekday] = expression.split(' ')
  return { minute, hour, day, month, weekday }
}
export function buildCron(values: CronValues) {
  for (const { key, label, min, max } of cronFields) {
    const value = values[key]
    if (!/^(?:\*|\d+(?:-\d+)?)(?:\/\d+)?(?:,(?:\d+(?:-\d+)?)(?:\/\d+)?)*$/.test(value))
      throw messageError(
        'toolErrors.cronSyntax',
        '{{field}}: use *, a value, a range (1-5), a list (1,3), or a step (*/5).',
        { field: message(`toolUi.${key}`, label) },
      )
    for (const part of value.split(',')) {
      const [range, step] = part.split('/')
      const numbers = range === '*' ? [] : range.split('-').map(Number)
      if (
        numbers.some((n) => n < min || n > max) ||
        (numbers.length === 2 && numbers[0] > numbers[1]) ||
        (step !== undefined && (Number(step) < 1 || Number(step) > max - min + 1))
      )
        throw messageError(
          'toolErrors.cronRange',
          '{{field}}: values must be {{min}}–{{max}}, ranges ascending, and intervals 1–{{interval}}.',
          { field: message(`toolUi.${key}`, label), min, max, interval: max - min + 1 },
        )
    }
  }
  return cronFields.map((field) => values[field.key]).join(' ')
}
export function describeCron(
  expression: string,
  render: (value: AppMessage) => string = englishMessage,
) {
  const say = (key: AppMessage['key'], fallback: string, params: AppMessage['params'] = {}) =>
    render(message(key, fallback, params))
  const [minute, hour, day, month, weekday] = expression.split(' ')
  if (expression === '* * * * *') return say('toolUi.everyMinute', 'Every minute')
  if (/^\*\/\d+ \* \* \* \*$/.test(expression))
    return say('toolUi.cronMinutes', 'Every {{value}} minutes', { value: minute.slice(2) })
  if (/^\d+ \* \* \* \*$/.test(expression))
    return say('toolUi.cronHour', 'Every hour at minute {{value}}', { value: minute })
  const time =
    /^\d+$/.test(hour) && /^\d+$/.test(minute)
      ? `${hour.padStart(2, '0')}:${minute.padStart(2, '0')}`
      : null
  if (time && day === '*' && month === '*') {
    if (weekday === '*') return say('toolUi.cronDaily', 'Every day at {{time}}', { time })
    if (weekday === '1-5') return say('toolUi.cronWeekdays', 'Every weekday at {{time}}', { time })
    if (/^[0-6]$/.test(weekday)) {
      const day = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][
        Number(weekday)
      ]
      const keys = [
        'sunday',
        'monday',
        'tuesday',
        'wednesday',
        'thursday',
        'friday',
        'saturday',
      ] as const
      return say('toolUi.cronWeekly', 'Every {{day}} at {{time}}', {
        day: message(`toolUi.${keys[Number(weekday)]}`, day),
        time,
      })
    }
  }
  if (time && /^\d+$/.test(day) && month === '*' && weekday === '*')
    return say('toolUi.cronMonthly', 'On day {{day}} of every month at {{time}}', { day, time })
  const explain = (value: string) =>
    value === '*'
      ? say('toolUi.cronAll', 'every value')
      : value.startsWith('*/')
        ? say('toolUi.cronStep', 'every {{value}} values, starting at the field minimum', {
            value: value.slice(2),
          })
        : value
            .replaceAll(',', ', ')
            .replaceAll('-', say('toolUi.cronThrough', ' through '))
            .replaceAll('/', say('toolUi.cronStepping', ', stepping by '))
  return cronFields
    .map(
      (field, index) =>
        `${say(`toolUi.${field.key}`, field.label)}: ${explain([minute, hour, day, month, weekday][index])}`,
    )
    .join('; ')
}
