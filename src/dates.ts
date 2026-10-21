export function localDateTime(value: string | null | undefined) {
  if (!value) return ''
  const date = new Date(value)
  if (!Number.isFinite(date.getTime())) return ''
  return new Date(date.getTime() - date.getTimezoneOffset() * 60_000).toISOString().slice(0, 16)
}

export function exactLocalDate(value: string): string | null {
  if (!value) return null
  const date = new Date(value)
  if (!Number.isFinite(date.getTime()) || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(value) || localDateTime(date.toISOString()) !== value) throw new Error('La fecha u hora no existe en tu zona horaria. Elige otra.')
  for (let minutes = -180; minutes <= 180; minutes++) {
    if (minutes && localDateTime(new Date(date.getTime() + minutes * 60000).toISOString()) === value) throw new Error('Esta hora se repite por un cambio de horario. Elige una hora no ambigua.')
  }
  return date.toISOString()
}
