export function parseTimestamp(value: string, unit: 'seconds' | 'milliseconds') {
  if (!/^-?\d+(?:\.\d+)?$/.test(value.trim()))
    throw new Error('Enter a numeric Unix timestamp, such as 1700000000.')
  const milliseconds = Number(value) * (unit === 'seconds' ? 1000 : 1)
  const date = new Date(milliseconds)
  if (!Number.isFinite(date.getTime()))
    throw new Error('This timestamp is outside the supported date range.')
  return date
}
export function dateDetails(date: Date) {
  if (!Number.isFinite(date.getTime())) throw new Error('Enter a valid date and time.')
  return {
    'Local time': date.toLocaleString(),
    UTC: date.toUTCString(),
    'ISO 8601': date.toISOString(),
    'Unix seconds': String(Math.floor(date.getTime() / 1000)),
    'Unix milliseconds': String(date.getTime()),
  }
}
