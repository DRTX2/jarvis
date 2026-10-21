import { z } from 'zod'

export const problem = (message, status = 400) => Object.assign(new Error(message), { status })
export function validDay(value) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false
  const date = new Date(`${value}T00:00:00.000Z`)
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value
    && value >= '2000-01-01' && value <= '2100-12-31'
}
export function validTimeZone(value) {
  try { new Intl.DateTimeFormat('en', { timeZone: value }).format(); return true }
  catch { return false }
}
export const daySchema = z.string().refine(validDay)
export const timeZoneSchema = z.string().min(1).max(80).refine(validTimeZone)
const timeSchema = z.string().regex(/^(?:[01]\d|2[0-3]):[0-5]\d$/)
export const dayQuerySchema = z.object({ day: daySchema, timeZone: timeZoneSchema }).strict()
export const planInputSchema = z.object({
  day: daySchema, timeZone: timeZoneSchema,
  startTime: timeSchema, endTime: timeSchema,
  breakMinutes: z.number().int().min(0).max(30).default(5),
  taskIds: z.array(z.number().int().positive()).min(1).max(3)
    .refine((ids) => new Set(ids).size === ids.length),
  commitments: z.array(z.object({
    title: z.string().trim().min(1).max(100), startTime: timeSchema, endTime: timeSchema,
  }).strict()).max(8).default([]),
}).strict()
export const approveSchema = z.object({
  input: planInputSchema,
  expectedRevision: z.number().int().min(0),
  taskVersions: z.array(z.object({ id: z.number().int().positive(), version: z.number().int().positive() }).strict()).min(1).max(3),
}).strict()
export const dailyReviewSchema = z.object({
  timeZone: timeZoneSchema,
  worked: z.string().trim().max(1000), obstacle: z.string().trim().max(1000),
  nextStep: z.string().trim().max(1000), energy: z.enum(['low', 'medium', 'high']).nullable(),
}).strict().refine((value) => value.worked || value.obstacle || value.nextStep || value.energy)

export const toMinutes = (time) => Number(time.slice(0, 2)) * 60 + Number(time.slice(3))
export const toTime = (minutes) => `${String(Math.floor(minutes / 60)).padStart(2, '0')}:${String(minutes % 60).padStart(2, '0')}`
export function addDays(day, count) {
  const date = new Date(`${day}T12:00:00.000Z`)
  date.setUTCDate(date.getUTCDate() + count)
  return date.toISOString().slice(0, 10)
}
export function dateInZone(date, timeZone) {
  const parts = new Intl.DateTimeFormat('en', {
    timeZone, year: 'numeric', month: '2-digit', day: '2-digit',
  }).formatToParts(date)
  const part = (type) => parts.find((item) => item.type === type).value
  return `${part('year')}-${part('month')}-${part('day')}`
}

// Buscar límites reales del día: un día de cambio de hora puede durar 23 o 25 h.
export function dayBounds(day, timeZone) {
  const formatter = new Intl.DateTimeFormat('en', { timeZone, year: 'numeric', month: '2-digit', day: '2-digit' })
  const key = (timestamp) => {
    const parts = formatter.formatToParts(timestamp)
    return ['year', 'month', 'day'].map((type) => parts.find((part) => part.type === type).value).join('-')
  }
  function firstInstant(target) {
    const anchor = Date.parse(`${target}T00:00:00.000Z`)
    let low = anchor - 36 * 3_600_000
    let high = anchor + 36 * 3_600_000
    while (low < high) {
      const middle = Math.floor((low + high) / 2)
      if (key(middle) < target) low = middle + 1
      else high = middle
    }
    return low
  }
  const start = firstInstant(day)
  if (key(start) !== day) throw problem('Esta fecha no existe en la zona horaria elegida.')
  return { start: new Date(start).toISOString(), end: new Date(firstInstant(addDays(day, 1))).toISOString() }
}

// No resolver a escondidas horas inexistentes o repetidas por cambios de hora.
function instantFor(day, time, timeZone) {
  const wall = Date.parse(`${day}T${time}:00.000Z`)
  const formatter = new Intl.DateTimeFormat('en-GB', {
    timeZone, year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit', hourCycle: 'h23',
  })
  function wallTimestamp(timestamp) {
    const parts = formatter.formatToParts(timestamp)
    const value = (type) => Number(parts.find((part) => part.type === type).value)
    return Date.UTC(value('year'), value('month') - 1, value('day'), value('hour'), value('minute'), value('second'))
  }
  const offsets = new Set([-36, 0, 36].map((hours) => {
    const sample = wall + hours * 3_600_000
    return wallTimestamp(sample) - sample
  }))
  const candidates = [...offsets].map((offset) => wall - offset).filter((candidate) => wallTimestamp(candidate) === wall)
  if (candidates.length !== 1) throw problem('La ventana contiene una hora inexistente o repetida por un cambio de horario. Elige otra hora.')
  return candidates[0]
}

export function buildPlan(input, tasks, expectedRevision = 0) {
  const start = toMinutes(input.startTime)
  const end = toMinutes(input.endTime)
  if (end - start < 5) throw problem('La disponibilidad debe terminar después de empezar y durar al menos 5 minutos. No puede cruzar medianoche.')
  const startAt = instantFor(input.day, input.startTime, input.timeZone)
  const endAt = instantFor(input.day, input.endTime, input.timeZone)
  if ((endAt - startAt) / 60_000 !== end - start) {
    throw problem('Esta ventana cruza un cambio de hora. Divide tu disponibilidad en una ventana sin ese cambio.')
  }
  const commitments = input.commitments.map((item) => ({ ...item, start: toMinutes(item.startTime), end: toMinutes(item.endTime) }))
    .sort((a, b) => a.start - b.start)
  for (const [index, item] of commitments.entries()) {
    if (item.start < start || item.end > end || item.end <= item.start) {
      throw problem('Cada compromiso debe estar dentro de tu disponibilidad y terminar después de empezar.')
    }
    if (index && item.start < commitments[index - 1].end) throw problem('Hay compromisos que se superponen. Ajusta sus horarios.')
  }
  const free = []
  let boundary = start
  for (const item of commitments) { if (boundary < item.start) free.push({ start: boundary, end: item.start }); boundary = item.end }
  if (boundary < end) free.push({ start: boundary, end })

  const selected = input.taskIds.map((id) => tasks.find((task) => task.id === id))
  if (selected.some((task) => !task || task.done)) throw problem('Un pendiente ya no está disponible. Actualiza la lista y genera otra propuesta.', 409)
  const rank = { high: 0, normal: 1, low: 2 }
  selected.sort((a, b) => rank[a.priority] - rank[b.priority] || input.taskIds.indexOf(a.id) - input.taskIds.indexOf(b.id))
  const blocks = []
  const unscheduled = []
  let cursor = start
  let placed = 0
  let focusMinutes = 0
  function block(kind, title, from, to, taskId) {
    return {
      kind, title, startTime: toTime(from), endTime: toTime(to), durationMinutes: to - from,
      startAt: new Date(startAt + (from - start) * 60_000).toISOString(),
      endAt: new Date(startAt + (to - start) * 60_000).toISOString(),
      ...(taskId ? { taskId } : {}),
    }
  }
  for (const task of selected) {
    const pause = placed ? input.breakMinutes : 0
    const interval = free.map((segment) => ({ start: Math.max(segment.start, cursor), end: segment.end }))
      .find((segment) => segment.end - segment.start >= task.estimatedMinutes + pause)
    if (!interval) {
      unscheduled.push({ taskId: task.id, title: task.title, reason: `No hay un bloque libre continuo de ${task.estimatedMinutes + pause} min${pause ? ', incluido el descanso previo' : ''}. Puedes dividir la tarea o cambiar la ventana.` })
      continue
    }
    if (pause) blocks.push(block('break', 'Descanso', interval.start, interval.start + pause))
    blocks.push(block('task', task.title, interval.start + pause, interval.start + pause + task.estimatedMinutes, task.id))
    cursor = interval.start + pause + task.estimatedMinutes
    focusMinutes += task.estimatedMinutes
    placed++
  }
  for (const item of commitments) blocks.push(block('commitment', item.title, item.start, item.end))
  blocks.sort((a, b) => a.startTime.localeCompare(b.startTime))
  const availableMinutes = free.reduce((sum, segment) => sum + segment.end - segment.start, 0)
  const pauseMinutes = blocks.filter((item) => item.kind === 'break').reduce((sum, item) => sum + item.durationMinutes, 0)
  return {
    input, expectedRevision, taskVersions: selected.map(({ id, version }) => ({ id, version })),
    blocks, unscheduled, availableMinutes, focusMinutes, pauseMinutes,
    remainingMinutes: availableMinutes - focusMinutes - pauseMinutes, plannedTasks: placed,
    algorithmVersion: 1,
  }
}
