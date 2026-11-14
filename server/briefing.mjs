import { dateInZone, dayBounds } from './planning.mjs'

const hour = (value, timeZone) => new Intl.DateTimeFormat('es', { timeZone, hour: '2-digit', minute: '2-digit' }).format(new Date(value))
const list = (items, max = 3) => items.slice(0, max).join(', ') + (items.length > max ? ` y ${items.length - max} más` : '')

// Resumen del día por reglas: instantáneo, sin IA y sin inventar nada que no esté en tus datos.
export function buildBriefing(store, timeZone, now = new Date()) {
  const today = dateInZone(now, timeZone)
  const { start, end } = dayBounds(today, timeZone)
  const localHour = Number(new Intl.DateTimeFormat('en-GB', { timeZone, hour: '2-digit', hourCycle: 'h23' }).format(now))
  const name = store.getProfile().name
  const greeting = `${localHour < 12 ? 'Buenos días' : localHour < 19 ? 'Buenas tardes' : 'Buenas noches'}${name ? `, ${name}` : ''}.`
  const pending = store.listTasks().filter((task) => !task.done)
  const due = (task) => task.snoozedUntil ?? task.dueAt
  const todays = pending.filter((task) => due(task) && due(task) >= start && due(task) < end).sort((a, b) => due(a).localeCompare(due(b)))
  const overdue = pending.filter((task) => due(task) && due(task) < start)
  const cards = store.study().cards.filter((card) => card.nextReviewAt && Date.parse(card.nextReviewAt) <= now.getTime())
  const goal = store.goals().filter((item) => item.targetDate && item.targetDate >= today).sort((a, b) => a.targetDate.localeCompare(b.targetDate))[0]
  const time = new Intl.DateTimeFormat('en-GB', { timeZone, hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).format(now)
  const nextBlock = store.getDaily(today, timeZone).plan?.blocks.find((block) => block.kind === 'task' && block.startTime >= time)

  const lines = []
  if (todays.length) lines.push(`Hoy tienes ${todays.length === 1 ? '1 aviso' : `${todays.length} avisos`}: ${list(todays.map((task) => `${task.title} (${hour(due(task), timeZone)})`))}.`)
  const upcoming = pending.filter((task) => due(task) && due(task) >= end).sort((a, b) => due(a).localeCompare(due(b)))[0]
  if (!todays.length && upcoming) lines.push(`Hoy no tienes avisos. El próximo: ${upcoming.title} (${new Intl.DateTimeFormat('es', { timeZone, weekday: 'long', hour: '2-digit', minute: '2-digit' }).format(new Date(due(upcoming)))}).`)
  if (overdue.length) lines.push(`${overdue.length === 1 ? 'Quedó atrasado' : `Quedaron ${overdue.length} atrasados`}: ${list(overdue.map((task) => task.title))}.`)
  if (cards.length) lines.push(`${cards.length === 1 ? '1 pregunta lista' : `${cards.length} preguntas listas`} para repasar (unos ${cards.length * 3} min), antes de que se te olviden.`)
  if (nextBlock) lines.push(`Siguiente bloque de tu plan: ${nextBlock.startTime} ${nextBlock.title}.`)
  if (goal) {
    const days = Math.round((Date.parse(`${goal.targetDate}T12:00:00Z`) - Date.parse(`${today}T12:00:00Z`)) / 86_400_000)
    lines.push(days === 0 ? `Hoy es la fecha de «${goal.title}».` : `Faltan ${days} ${days === 1 ? 'día' : 'días'} para «${goal.title}».`)
  }
  const rest = pending.filter((task) => !due(task)).length
  if (!lines.length) lines.push(rest ? `Sin avisos para hoy. Tienes ${rest} ${rest === 1 ? 'pendiente' : 'pendientes'} sin fecha: elige uno y empieza pequeño.` : 'Día despejado. Buen momento para estudiar algo o fijarte un objetivo con fecha.')
  return { day: today, greeting, lines, counts: { today: todays.length, overdue: overdue.length, reviews: cards.length } }
}
