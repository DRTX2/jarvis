import { useState } from 'react'

// Por pestaña: navegación y recarga, sin enviar borradores al servidor.
export function useDraft<T>(key: string, initial: T) {
  const storageKey = `jarvis:draft:${key}`
  const [warning, setWarning] = useState('')
  const [value, setValue] = useState<T>(() => {
    try {
      const raw = sessionStorage.getItem(storageKey)
      if (!raw || raw.length > 30000) return initial
      const parsed: unknown = JSON.parse(raw)
      if (typeof initial === 'string') return typeof parsed === 'string' ? parsed as T : initial
      if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return initial
      const defaults = initial as Record<string, unknown>
      const saved = parsed as Record<string, unknown>
      if (!Object.entries(defaults).every(([name, item]) => name in saved && (item == null ? saved[name] == null || typeof saved[name] === 'string' : typeof saved[name] === typeof item))) return initial
      return Object.fromEntries(Object.keys(defaults).map((name) => [name, saved[name]])) as T
    } catch { return initial }
  })
  function change(next: T) {
    setValue(next)
    try { sessionStorage.setItem(storageKey, JSON.stringify(next)); setWarning('') }
    catch { setWarning('No se pudo conservar el borrador en este navegador. No recargues antes de guardar.') }
  }
  function clear() {
    setValue(initial)
    try { sessionStorage.removeItem(storageKey) } catch { /* No revertir un guardado. */ }
  }
  return { value, change, clear, warning }
}
