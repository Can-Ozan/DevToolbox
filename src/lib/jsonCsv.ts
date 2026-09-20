export type Delimiter = ',' | ';' | '\t'
export const CSV_LIMITS = { characters: 200_000, rows: 10_000, columns: 200, cells: 100_000 }

function checkInput(input: string, delimiter: Delimiter) {
  if (![',', ';', '\t'].includes(delimiter)) throw new Error('Choose comma, semicolon or tab.')
  if (!input.trim()) throw new Error('Enter data to convert.')
  if (input.length > CSV_LIMITS.characters)
    throw new Error('Input is limited to 200,000 characters.')
}
function checkSize(rows: number, columns: number) {
  if (rows > CSV_LIMITS.rows || columns > CSV_LIMITS.columns || rows * columns > CSV_LIMITS.cells)
    throw new Error('Use at most 10,000 rows, 200 columns and 100,000 cells.')
}

export function jsonToCsv(input: string, delimiter: Delimiter = ',') {
  checkInput(input, delimiter)
  const data: unknown = JSON.parse(input.replace(/^\uFEFF/, ''))
  if (!Array.isArray(data) || !data.length)
    throw new Error('JSON must be a non-empty array of flat objects.')
  const columns = new Set<string>()
  for (const row of data) {
    if (!row || typeof row !== 'object' || Array.isArray(row))
      throw new Error('Each JSON row must be a flat object.')
    for (const [key, value] of Object.entries(row)) {
      if (!key.trim()) throw new Error('Column names must not be empty.')
      if (value !== null && typeof value === 'object')
        throw new Error(
          `Nested objects and arrays are not supported (column "${key}"). Flatten them first.`,
        )
      if (typeof value === 'number' && !Number.isFinite(value))
        throw new Error('Numbers must be finite.')
      columns.add(key)
    }
    checkSize(data.length, columns.size)
  }
  if (!columns.size) throw new Error('Include at least one named column.')
  const headers = [...columns]
  const escape = (value: unknown) => {
    const text = value === null || value === undefined ? '' : String(value)
    return text.includes(delimiter) || /["\r\n]/.test(text)
      ? `"${text.replaceAll('"', '""')}"`
      : text
  }
  const output = [
    headers.map(escape).join(delimiter),
    ...data.map((row) =>
      headers.map((key) => escape(Object.hasOwn(row, key) ? row[key] : '')).join(delimiter),
    ),
  ].join('\r\n')
  return { output, rows: data.length, columns: headers.length }
}

// RFC 4180-style state machine: quoted fields can contain delimiters and line breaks.
export function parseCsv(input: string, delimiter: Delimiter = ','): string[][] {
  checkInput(input, delimiter)
  const source = input.replace(/^\uFEFF/, '')
  const rows: string[][] = []
  let row: string[] = [],
    field = '',
    state: 'plain' | 'quoted' | 'closed' = 'plain',
    touched = false
  function finishField() {
    row.push(field)
    field = ''
    state = 'plain'
    if (row.length > CSV_LIMITS.columns) throw new Error('Use at most 200 columns.')
  }
  function finishRow() {
    finishField()
    if (touched) {
      rows.push(row)
      checkSize(Math.max(0, rows.length - 1), row.length)
    }
    row = []
    touched = false
  }
  for (let i = 0; i < source.length; i++) {
    const char = source[i]
    if (state === 'quoted') {
      if (char !== '"') field += char
      else if (source[i + 1] === '"') {
        field += '"'
        i++
      } else state = 'closed'
    } else if (char === delimiter) {
      touched = true
      finishField()
    } else if (char === '\n' || char === '\r') {
      if (char === '\r' && source[i + 1] === '\n') i++
      finishRow()
    } else if (char === '"' && !field && state === 'plain') {
      touched = true
      state = 'quoted'
    } else {
      if (state === 'closed' || char === '"')
        throw new Error('Malformed CSV: quotes must enclose an entire field.')
      touched = true
      field += char
    }
  }
  if (state === 'quoted') throw new Error('Malformed CSV: a quoted field is not closed.')
  if (touched || field || row.length) finishRow()
  return rows
}

export function csvToJson(input: string, delimiter: Delimiter = ',') {
  const [headers, ...data] = parseCsv(input, delimiter)
  if (!headers?.length || headers.some((header) => !header.trim()))
    throw new Error('The first row must contain non-empty column headers.')
  if (new Set(headers).size !== headers.length) throw new Error('Column headers must be unique.')
  checkSize(data.length, headers.length)
  const rows = data.map((row, index) => {
    if (row.length !== headers.length)
      throw new Error(`Row ${index + 2} has ${row.length} fields; expected ${headers.length}.`)
    return Object.fromEntries(headers.map((header, i) => [header, row[i]]))
  })
  return { output: JSON.stringify(rows, null, 2), rows: rows.length, columns: headers.length }
}
