export async function api<T>(path: string, options: RequestInit = {}): Promise<T> {
  let response: Response
  try {
    response = await fetch(`/api${path}`, {
      ...options, headers: { 'Content-Type': 'application/json', ...options.headers },
    })
  } catch {
    throw new Error('No se pudo conectar con Jarvis. Comprueba que el servidor esté encendido y vuelve a intentar.')
  }
  let body
  try { body = await response.json() }
  catch { throw new Error('El servidor no devolvió una respuesta válida. Comprueba que la API esté disponible.') }
  if (!response.ok) throw new Error(body.error ?? 'No se pudo completar la operación.')
  return body as T
}

export const json = (value: unknown) => JSON.stringify(value)
export const readableDate = (value: string) => new Intl.DateTimeFormat('es', {
  day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit',
}).format(new Date(value))
export const isDue = (value: string | null) => !value || new Date(value).getTime() <= Date.now()
export function localDay(date = new Date()) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}
export const dayLabel = (day: string, options: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'long' }) =>
  new Intl.DateTimeFormat('es', { ...options, timeZone: 'UTC' }).format(new Date(`${day}T12:00:00Z`))
export function shiftDay(day: string, count: number) {
  const date = new Date(`${day}T12:00:00Z`)
  date.setUTCDate(date.getUTCDate() + count)
  return date.toISOString().slice(0, 10)
}
