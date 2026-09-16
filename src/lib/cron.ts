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
      throw new Error(`${label}: use *, a value, a range (1-5), a list (1,3), or a step (*/5).`)
    for (const part of value.split(',')) {
      const [range, step] = part.split('/')
      const numbers = range === '*' ? [] : range.split('-').map(Number)
      if (
        numbers.some((n) => n < min || n > max) ||
        (numbers.length === 2 && numbers[0] > numbers[1]) ||
        (step !== undefined && (Number(step) < 1 || Number(step) > max - min + 1))
      )
        throw new Error(
          `${label}: values must be ${min}–${max}, ranges ascending, and intervals 1–${max - min + 1}.`,
        )
    }
  }
  return cronFields.map((field) => values[field.key]).join(' ')
}
export function describeCron(expression: string) {
  const [minute, hour, day, month, weekday] = expression.split(' ')
  if (expression === '* * * * *') return 'Every minute'
  if (/^\*\/\d+ \* \* \* \*$/.test(expression)) return `Every ${minute.slice(2)} minutes`
  if (/^\d+ \* \* \* \*$/.test(expression)) return `Every hour at minute ${minute}`
  const time =
    /^\d+$/.test(hour) && /^\d+$/.test(minute)
      ? `${hour.padStart(2, '0')}:${minute.padStart(2, '0')}`
      : null
  if (time && day === '*' && month === '*') {
    if (weekday === '*') return `Every day at ${time}`
    if (weekday === '1-5') return `Every weekday at ${time}`
    if (/^[0-6]$/.test(weekday))
      return `Every ${['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][Number(weekday)]} at ${time}`
  }
  if (time && /^\d+$/.test(day) && month === '*' && weekday === '*')
    return `On day ${day} of every month at ${time}`
  const explain = (value: string) =>
    value === '*'
      ? 'every value'
      : value.startsWith('*/')
        ? `every ${value.slice(2)} values, starting at the field minimum`
        : value.replaceAll(',', ', ').replaceAll('-', ' through ').replaceAll('/', ', stepping by ')
  return cronFields
    .map((field, index) => `${field.label}: ${explain([minute, hour, day, month, weekday][index])}`)
    .join('; ')
}
