import test from 'node:test'
import assert from 'node:assert/strict'
import { DatabaseSync } from 'node:sqlite'
import { mkdtempSync, readdirSync, rmdirSync, unlinkSync } from 'node:fs'
import { join } from 'node:path'
import { createApp } from './app.mjs'
import { createStore } from './store.mjs'
import { versionOneSchema } from './migrations.mjs'
import { addDays, buildPlan, dateInZone, dayBounds, planInputSchema } from './planning.mjs'

const day = '2026-10-09'
const timeZone = 'America/Guayaquil'
const task = (id, estimatedMinutes = 25, priority = 'normal') => ({
  id, estimatedMinutes, priority, title: `Tarea ${id}`, done: false, version: 1,
})
const input = (changes = {}) => planInputSchema.parse({
  day, timeZone, startTime: '09:00', endTime: '11:00', taskIds: [1, 2, 3],
  breakMinutes: 5, commitments: [], ...changes,
})

async function setup(t) {
  let now = new Date('2026-10-09T15:00:00.000Z')
  const { app, store } = createApp({ databasePath: ':memory:', clock: () => new Date(now) })
  const server = await new Promise((resolve) => {
    const instance = app.listen(0, '127.0.0.1', () => resolve(instance))
  })
  t.after(async () => {
    await new Promise((resolve) => { server.close(resolve); server.closeAllConnections() })
    store.close()
  })
  const request = async (path, method = 'GET', body) => {
    const res = await fetch(`http://127.0.0.1:${server.address().port}/api${path}`, {
      method, headers: { 'Content-Type': 'application/json' }, body: body === undefined ? undefined : JSON.stringify(body),
    })
    return { status: res.status, data: await res.json() }
  }
  const createTask = async (title = 'Estudiar HTTP', estimatedMinutes = 25) =>
    (await request('/tasks', 'POST', { title, estimatedMinutes })).data.task
  return { request, createTask, store, advance: (value) => { now = new Date(value) } }
}

test('ordena las prioridades y deja descansos sin exceder la ventana', () => {
  const plan = buildPlan(input(), [task(1), task(2, 25, 'high'), task(3)])
  assert.deepEqual(plan.blocks.map((block) => [block.kind, block.startTime, block.endTime]), [
    ['task', '09:00', '09:25'], ['break', '09:25', '09:30'], ['task', '09:30', '09:55'],
    ['break', '09:55', '10:00'], ['task', '10:00', '10:25'],
  ])
  assert.equal(plan.blocks[0].taskId, 2)
  assert.equal(plan.focusMinutes, 75)
  assert.equal(plan.pauseMinutes, 10)
  assert.equal(plan.remainingMinutes, 35)
  assert.equal(plan.blocks[0].startAt, '2026-10-09T14:00:00.000Z')
})

test('respeta compromisos fijos y muestra lo que no cabe', () => {
  const plan = buildPlan(input({
    endTime: '10:00', commitments: [{ title: 'Reunión', startTime: '09:25', endTime: '09:45' }],
  }), [task(1, 25, 'high'), task(2, 20), task(3, 10)])
  assert.equal(plan.availableMinutes, 40)
  assert.equal(plan.plannedTasks, 2)
  assert.equal(plan.unscheduled[0].taskId, 2)
  assert.match(plan.unscheduled[0].reason, /No hay un bloque libre continuo/)
  assert.deepEqual(plan.blocks.map((block) => [block.kind, block.startTime, block.endTime]), [
    ['task', '09:00', '09:25'], ['commitment', '09:25', '09:45'],
    ['break', '09:45', '09:50'], ['task', '09:50', '10:00'],
  ])
})

test('no fuerza tareas largas a encajar ni acepta compromisos solapados', () => {
  const plan = buildPlan(input({ endTime: '09:15', taskIds: [1] }), [task(1, 60)])
  assert.equal(plan.plannedTasks, 0)
  assert.equal(plan.unscheduled.length, 1)
  assert.throws(() => buildPlan(input({ commitments: [
    { title: 'A', startTime: '09:10', endTime: '09:30' },
    { title: 'B', startTime: '09:20', endTime: '09:40' },
  ] }), [task(1), task(2), task(3)]), /superponen/)
  assert.throws(() => buildPlan(input({ endTime: '08:00' }), [task(1), task(2), task(3)]), /terminar después/)
})

test('validación de fechas reales, zona horaria, duplicados y máximo de prioridades', () => {
  for (const changes of [
    { day: '2026-02-30' }, { timeZone: 'No/Existe' }, { taskIds: [1, 1] },
    { taskIds: [1, 2, 3, 4] }, { taskIds: [] }, { startTime: '24:00' }, { breakMinutes: -1 },
  ]) assert.equal(planInputSchema.safeParse({ ...input(), ...changes }).success, false)
})

test('los límites del día respetan zona horaria y cambios de horario', () => {
  assert.deepEqual(dayBounds(day, timeZone), { start: '2026-10-09T05:00:00.000Z', end: '2026-10-10T05:00:00.000Z' })
  const spring = dayBounds('2026-03-29', 'Europe/Madrid')
  const autumn = dayBounds('2026-10-25', 'Europe/Madrid')
  assert.equal((Date.parse(spring.end) - Date.parse(spring.start)) / 3_600_000, 23)
  assert.equal((Date.parse(autumn.end) - Date.parse(autumn.start)) / 3_600_000, 25)
  assert.equal(dateInZone(new Date('2026-10-10T02:00:00Z'), timeZone), day)
  assert.equal(addDays('2026-12-31', 1), '2027-01-01')
})

test('no resuelve silenciosamente horas inexistentes, repetidas o ventanas con cambio de hora', () => {
  for (const changes of [
    { day: '2026-03-29', timeZone: 'Europe/Madrid', startTime: '02:30', endTime: '04:00' },
    { day: '2026-10-25', timeZone: 'Europe/Madrid', startTime: '02:30', endTime: '04:00' },
    { day: '2026-03-29', timeZone: 'Europe/Madrid', startTime: '01:00', endTime: '04:00' },
  ]) assert.throws(() => buildPlan(input(changes), [task(1), task(2), task(3)]), /hora|horario/)
})

test('una propuesta no guarda planes ni cambia fechas o tareas; aprobar sí persiste', async (t) => {
  const { request, createTask } = await setup(t)
  const task = await createTask()
  const proposal = (await request('/plans/preview', 'POST', input({ taskIds: [task.id] }))).data.proposal
  assert.equal((await request(`/daily?day=${day}&timeZone=${timeZone}`)).data.plan, null)
  assert.equal((await request('/tasks')).data.tasks[0].dueAt, null)
  const approved = await request('/plans/approve', 'POST', {
    input: proposal.input, expectedRevision: proposal.expectedRevision, taskVersions: proposal.taskVersions,
  })
  assert.equal(approved.status, 200)
  assert.equal(approved.data.plan.revision, 1)
  assert.equal((await request(`/daily?day=${day}&timeZone=${timeZone}`)).data.plan.blocks[0].taskId, task.id)
  assert.equal((await request('/tasks')).data.tasks[0].done, false)
  assert.equal((await request('/health')).data.dailyRequests, 0)
})

test('rechaza aprobar una propuesta si la duración, estado o versión del plan cambió', async (t) => {
  const { request, createTask } = await setup(t)
  const task = await createTask()
  const propose = async () => (await request('/plans/preview', 'POST', input({ taskIds: [task.id] }))).data.proposal
  const approve = (proposal) => request('/plans/approve', 'POST', {
    input: proposal.input, expectedRevision: proposal.expectedRevision, taskVersions: proposal.taskVersions,
  })
  const stale = await propose()
  await request(`/tasks/${task.id}`, 'PATCH', { estimatedMinutes: 40 })
  assert.equal((await approve(stale)).status, 409)
  const proposal = await propose()
  assert.equal((await approve(proposal)).status, 200)
  assert.equal((await approve(proposal)).status, 409)
  const after = await propose()
  await request(`/tasks/${task.id}`, 'PATCH', { done: true })
  assert.equal((await approve(after)).status, 409)
})

test('un plan aprobado conserva sus bloques al editar o borrar una tarea', async (t) => {
  const { request, createTask } = await setup(t)
  const task = await createTask()
  const proposal = (await request('/plans/preview', 'POST', input({ taskIds: [task.id] }))).data.proposal
  await request('/plans/approve', 'POST', { input: proposal.input, expectedRevision: 0, taskVersions: proposal.taskVersions })
  await request(`/tasks/${task.id}`, 'PATCH', { title: 'Título nuevo', estimatedMinutes: 90 })
  const get = () => request(`/daily?day=${day}&timeZone=${timeZone}`)
  let block = (await get()).data.plan.blocks[0]
  assert.equal(block.title, 'Estudiar HTTP')
  assert.equal(block.durationMinutes, 25)
  assert.equal(block.changed, true)
  await request(`/tasks/${task.id}`, 'DELETE')
  block = (await get()).data.plan.blocks[0]
  assert.equal(block.task, null)
  assert.equal(block.title, 'Estudiar HTTP')
})

test('no aprueba un plan sin tareas que quepan ni admite una agenda retroactiva', async (t) => {
  const { request, createTask } = await setup(t)
  const task = await createTask('Proyecto', 120)
  const proposal = (await request('/plans/preview', 'POST', input({ taskIds: [task.id], endTime: '09:15' }))).data.proposal
  assert.equal((await request('/plans/approve', 'POST', { input: proposal.input, expectedRevision: 0, taskVersions: proposal.taskVersions })).status, 400)
  assert.equal((await request('/plans/preview', 'POST', input({ day: '2026-10-08', taskIds: [task.id] }))).status, 400)
  assert.equal((await request('/tasks', 'POST', { title: 'Duración inválida', estimatedMinutes: 0 })).status, 400)
})

test('la actividad histórica no se pierde al reabrir o borrar y no duplica una tarea en un día', async (t) => {
  const { request, createTask, advance } = await setup(t)
  const task = await createTask()
  await request(`/tasks/${task.id}`, 'PATCH', { done: true })
  await request(`/tasks/${task.id}`, 'PATCH', { done: true })
  await request(`/tasks/${task.id}`, 'PATCH', { done: false })
  advance('2026-10-09T16:00:00.000Z')
  await request(`/tasks/${task.id}`, 'PATCH', { done: true })
  await request(`/tasks/${task.id}`, 'DELETE')
  assert.equal((await request(`/daily?day=${day}&timeZone=${timeZone}`)).data.activity.completedTasks, 1)
  const exported = (await request('/export')).data
  assert.equal(exported.taskCompletions.length, 2)
  assert.equal(exported.taskCompletions[0].title, 'Estudiar HTTP')
})

test('cierre editable con snapshot, sin evaluación inventada y con detección de actividad posterior', async (t) => {
  const { request, createTask, advance } = await setup(t)
  const first = await createTask('Primera')
  await request(`/tasks/${first.id}`, 'PATCH', { done: true })
  const notes = { timeZone, worked: 'Empezar pequeño', obstacle: 'Interrupciones', nextStep: 'Preparar el material', energy: 'medium' }
  const saved = await request(`/daily-reviews/${day}`, 'PUT', notes)
  assert.equal(saved.status, 200)
  assert.equal(saved.data.review.snapshot.completedTasks, 1)
  advance('2026-10-09T17:00:00.000Z')
  const second = await createTask('Segunda')
  await request(`/tasks/${second.id}`, 'PATCH', { done: true })
  const daily = (await request(`/daily?day=${day}&timeZone=${timeZone}`)).data
  assert.equal(daily.activity.completedTasks, 2)
  assert.equal(daily.review.snapshot.completedTasks, 1)
  assert.equal(daily.needsReviewUpdate, true)
  const updated = await request(`/daily-reviews/${day}`, 'PUT', { ...notes, nextStep: 'Descansar antes de estudiar' })
  assert.equal(updated.data.review.snapshot.completedTasks, 2)
  assert.equal(updated.data.review.createdAt, saved.data.review.createdAt)
  assert.equal((await request(`/daily?day=${day}&timeZone=${timeZone}`)).data.needsReviewUpdate, false)
  assert.equal((await request('/export')).data.dailyReviews.length, 1)
})

test('un cierre vacío o futuro se rechaza; estudiar se atribuye al día local y no al UTC', async (t) => {
  const { request, advance } = await setup(t)
  const notes = { timeZone, worked: '', obstacle: '', nextStep: '', energy: null }
  assert.equal((await request(`/daily-reviews/${day}`, 'PUT', notes)).status, 400)
  assert.equal((await request('/daily-reviews/2026-10-10', 'PUT', { ...notes, worked: 'Todavía no pasó' })).status, 400)
  advance('2026-10-10T02:00:00.000Z')
  await request('/study/review', 'POST', { cardId: 'http-purpose', answer: 'Cliente y servidor', grade: 'good' })
  assert.equal((await request(`/daily?day=${day}&timeZone=${timeZone}`)).data.activity.studyAttempts, 1)
  assert.equal((await request(`/daily?day=2026-10-10&timeZone=${timeZone}`)).data.activity.studyAttempts, 0)
})

test('el resumen semanal usa lunes a domingo y cuenta tareas distintas en vez de inflar logros', async (t) => {
  const { request, createTask, advance } = await setup(t)
  const task = await createTask()
  await request(`/tasks/${task.id}`, 'PATCH', { done: true })
  await request(`/daily-reviews/${day}`, 'PUT', { timeZone, worked: 'Una pausa', obstacle: '', nextStep: '', energy: 'low' })
  advance('2026-10-10T15:00:00.000Z')
  await request(`/tasks/${task.id}`, 'PATCH', { done: false })
  await request(`/tasks/${task.id}`, 'PATCH', { done: true })
  await request('/daily-reviews/2026-10-10', 'PUT', { timeZone, worked: 'Volver a empezar', obstacle: '', nextStep: '', energy: 'low' })
  const week = (await request(`/weekly?day=${day}&timeZone=${timeZone}`)).data
  assert.equal(week.startDay, '2026-10-05')
  assert.equal(week.endDay, '2026-10-11')
  assert.equal(week.summary.completedTasks, 1)
  assert.equal(week.summary.reviewedDays, 2)
  assert.equal(week.days[4].activity.completedTasks, 1)
  assert.equal(week.days[5].activity.completedTasks, 1)
  assert.match(week.observations[0], /marcaste energía baja/)
  assert.match(week.observations[0], /no un diagnóstico/)
})

test('migración v1 a v2 conserva perfil, tareas y mensajes; no inventa finalizaciones', () => {
  const directory = mkdtempSync('/tmp/opencode/jarvis-migration-')
  const path = join(directory, 'legacy.sqlite')
  let store
  try {
    const db = new DatabaseSync(path)
    db.exec(versionOneSchema)
    db.exec(`UPDATE profile SET name = 'Perfil existente';
      INSERT INTO tasks (title, category, priority, done, due_at, created_at)
      VALUES ('Tarea antigua', 'study', 'high', 1, '2026-10-09T20:00:00.000Z', '2026-10-08T12:00:00.000Z');
      INSERT INTO messages (role, content, provider, created_at)
      VALUES ('user', 'Mensaje existente', 'demo', '2026-10-08T12:00:00.000Z');
      PRAGMA user_version = 1;`)
    db.close()
    store = createStore(path)
    assert.equal(store.getProfile().name, 'Perfil existente')
    assert.equal(store.messages()[0].content, 'Mensaje existente')
    const old = store.listTasks()[0]
    assert.equal(old.title, 'Tarea antigua')
    assert.equal(old.done, true)
    assert.equal(old.priority, 'high')
    assert.equal(old.estimatedMinutes, 25)
    assert.equal(old.completedAt, null)
    assert.equal(store.db.prepare('SELECT COUNT(*) AS count FROM task_completions').get().count, 0)
    assert.equal(store.db.prepare('PRAGMA user_version').get().user_version, 8)
    store.close()
    store = createStore(path)
    assert.equal(store.listTasks().length, 1)
  } finally {
    store?.close()
    for (const file of readdirSync(directory)) unlinkSync(join(directory, file))
    rmdirSync(directory)
  }
})

test('no modifica ni rebaja una base de datos de una versión más nueva', () => {
  const directory = mkdtempSync('/tmp/opencode/jarvis-future-db-')
  const path = join(directory, 'future.sqlite')
  try {
    let db = new DatabaseSync(path)
    db.exec('PRAGMA user_version = 99;')
    db.close()
    assert.throws(() => createStore(path), /versión más nueva/)
    db = new DatabaseSync(path)
    assert.equal(db.prepare('PRAGMA user_version').get().user_version, 99)
    db.close()
  } finally {
    for (const file of readdirSync(directory)) unlinkSync(join(directory, file))
    rmdirSync(directory)
  }
})
