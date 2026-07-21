export function nowIsoString(): string {
  return new Date().toISOString()
}

export function toDateStamp(value: Date = new Date()): string {
  const timestamp = Number.isNaN(value.getTime()) ? new Date() : value
  const year = timestamp.getFullYear().toString().padStart(4, '0')
  const month = (timestamp.getMonth() + 1).toString().padStart(2, '0')
  const day = timestamp.getDate().toString().padStart(2, '0')

  return `${year}-${month}-${day}`
}
