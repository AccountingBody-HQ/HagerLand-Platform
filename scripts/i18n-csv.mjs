// Jobs Phase 5: the small CSV reader and writer used by the Amharic review scripts (no extra packages).

/** One field, quoted when it holds a comma, quote or line break. */
export function csvField(value) {
  const s = String(value ?? '')
  return /[",\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
}

export function toCsv(rows) {
  return `${rows.map((r) => r.map(csvField).join(',')).join('\r\n')}\r\n`
}

/** Parses CSV (RFC 4180: quoted fields, doubled quotes, line breaks inside quotes). Strips a leading byte-order mark. */
export function parseCsv(text) {
  const src = text.replace(/^﻿/, '')
  const rows = []
  let row = []
  let field = ''
  let quoted = false
  for (let i = 0; i < src.length; i++) {
    const c = src[i]
    if (quoted) {
      if (c === '"' && src[i + 1] === '"') {
        field += '"'
        i++
      } else if (c === '"') quoted = false
      else field += c
    } else if (c === '"') quoted = true
    else if (c === ',') {
      row.push(field)
      field = ''
    } else if (c === '\n' || c === '\r') {
      if (c === '\r' && src[i + 1] === '\n') i++
      row.push(field)
      rows.push(row)
      row = []
      field = ''
    } else field += c
  }
  if (field !== '' || row.length) {
    row.push(field)
    rows.push(row)
  }
  return rows.filter((r) => r.some((f) => f !== ''))
}

/** The {placeholders} in a text, sorted (a translation must keep exactly the same ones). */
export function placeholders(text) {
  return Array.from(String(text).matchAll(/\{(\w+)\}/g), (m) => m[1]).sort()
}
