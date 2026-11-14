import test from 'node:test'
import assert from 'node:assert/strict'
import { createApp } from './app.mjs'
import { checkReminders, desktopNotifier, nextOccurrence, pushNotifier, reminderMessages } from './reminders.mjs'

let now = new Date('2026-11-16T14:00:00.000Z')
const clock = () => now
async function setup(t, options = {}) {
  const { app, store } = createApp({ databasePath: ':memory:', provider: 'demo', clock, ...options })
  const server = await new Promise((resolve) => { const instance = app.listen(0, '127.0.0.1', () => resolve(instance)) })
  t.after(async () => { await new Promise((resolve) => { server.close(resolve); server.closeAllConnections() }); store.close() })
  const base = `http://127.0.0.1:${server.address().port}/api`
  const request = async (path, method = 'GET', body) => {
    const response = await fetch(`${base}${path}`, { method, headers: { 'Content-Type': 'application/json' }, body: body === undefined ? undefined : JSON.stringify(body) })
    return { status: response.status, data: await response.json() }
  }
  return { request, store }
}

test('repetición: siempre en el futuro, entre semana salta sábado y domingo', () => {
  const at = (value) => new Date(value)
  assert.equal(nextOccurrence('2026-11-16T12:00:00.000Z', 'daily', at('2026-11-16T12:30:00.000Z')), '2026-11-17T12:00:00.000Z')
  assert.equal(nextOccurrence('2026-11-02T12:00:00.000Z', 'daily', at('2026-11-16T13:00:00.000Z')), '2026-11-17T12:00:00.000Z', 'tras días apagado no acumula avisos')
  assert.equal(nextOccurrence('2026-11-16T12:00:00.000Z', 'weekly', at('2026-11-16T12:30:00.000Z')), '2026-11-23T12:00:00.000Z')
  const friday = nextOccurrence('2026-11-19T12:00:00.000Z', 'weekdays', at('2026-11-20T11:00:00.000Z'))
  assert.equal(new Date(nextOccurrence(friday, 'weekdays', at(friday))).getDay(), 1, 'de viernes pasa a lunes')
})

test('avisos: suenan una vez, se pueden posponer y una tarea repetida sigue viva', async (t) => {
  now = new Date('2026-11-16T14:00:00.000Z')
  const { request, store } = await setup(t)
  const sent = []
  const notify = async (message) => { sent.push(message); return true }
  const once = store.createTask({ title: 'Llamar a mamá', category: 'personal', priority: 'normal', dueAt: '2026-11-16T13:59:00.000Z' })
  const daily = store.createTask({ title: 'Repasar derivadas', category: 'study', priority: 'normal', dueAt: '2026-11-16T13:00:00.000Z', repeat: 'daily' })
  store.createTask({ title: 'Más tarde', category: 'personal', priority: 'normal', dueAt: '2026-11-16T20:00:00.000Z' })
  await checkReminders(store, [notify], clock)
  assert.deepEqual(sent.map((message) => message.title).sort(), ['Llamar a mamá', 'Repasar derivadas'])
  await checkReminders(store, [notify], clock)
  assert.equal(sent.length, 2, 'no repite un aviso ya enviado')

  assert.equal((await request(`/reminders/${once.id}/snooze`, 'POST', { minutes: 10 })).status, 200)
  assert.equal((await request(`/reminders/${once.id}/snooze`, 'POST', { minutes: 1 })).status, 400)
  assert.equal((await request('/reminders')).data.reminders.some((task) => task.id === once.id), false, 'pospuesto: desaparece hasta su nueva hora')
  now = new Date('2026-11-16T14:11:00.000Z')
  await checkReminders(store, [notify], clock)
  assert.equal(sent.at(-1).title, 'Llamar a mamá', 'vuelve a sonar al acabar la pausa')

  await request(`/reminders/${daily.id}/acknowledge`, 'POST', {})
  assert.equal(store.getTask(daily.id).dueAt, '2026-11-17T13:00:00.000Z', '«Visto» en una tarea repetida la pasa al día siguiente')
  const done = await request(`/tasks/${daily.id}`, 'PATCH', { done: true })
  assert.equal(done.data.task.done, false)
  assert.equal(done.data.task.dueAt, '2026-11-18T13:00:00.000Z', 'completarla registra el cierre y programa la siguiente')
  assert.equal(store.db.prepare('SELECT COUNT(*) AS n FROM task_completions WHERE task_id = ?').get(daily.id).n, 1)
  assert.equal((await request('/tasks', 'POST', { title: 'Sin fecha', repeat: 'daily' })).status, 400, 'repetir exige un aviso')
})

test('avisos acumulados se resumen y los repasos vencidos avisan una vez al día desde las 9:00', async (t) => {
  now = new Date(2026, 10, 16, 10, 0)
  const { store } = await setup(t)
  for (const title of ['A', 'B', 'C', 'D']) store.createTask({ title, category: 'personal', priority: 'normal', dueAt: new Date(2026, 10, 15, 8).toISOString() })
  store.review('http-purpose', 'respuesta', 'again')
  now = new Date(2026, 10, 16, 10, 30)
  const sent = []
  await checkReminders(store, [async (message) => { sent.push(message); return true }], clock)
  assert.deepEqual(sent.map((message) => message.title), ['Tienes 4 avisos pendientes', '1 pregunta lista para repasar'])
  await checkReminders(store, [async (message) => { sent.push(message); return true }], clock)
  assert.equal(sent.length, 2, 'el aviso de repasos sale una sola vez al día')
  assert.equal(reminderMessages([]).length, 0)
})

test('push: clave pública estable, suscripción validada, prueba y limpieza de suscripciones caducadas', async (t) => {
  const delivered = []
  let gone = false
  const { request, store } = await setup(t, { notifiers: [] })
  const key = (await request('/push')).data
  assert.match(key.publicKey, /^[A-Za-z0-9_-]{80,}$/)
  assert.equal((await request('/push')).data.publicKey, key.publicKey, 'las claves se generan una vez')
  const subscription = { endpoint: 'https://push.example.test/abc', expirationTime: null, keys: { p256dh: 'clave', auth: 'secreto' } }
  assert.equal((await request('/push', 'POST', { ...subscription, endpoint: 'http://inseguro.test/x' })).status, 400)
  assert.equal((await request('/push', 'POST', subscription)).status, 201)
  assert.equal((await request('/push')).data.devices, 1)
  const notify = pushNotifier(store, async (target, payload, options) => {
    if (gone) throw Object.assign(new Error('Gone'), { statusCode: 410 })
    delivered.push({ target, payload: JSON.parse(payload), options })
  })
  assert.equal(await notify({ title: 'Hola', body: 'Prueba' }), true)
  assert.equal(delivered[0].payload.title, 'Hola')
  assert.equal(delivered[0].options.vapidDetails.publicKey, key.publicKey)
  gone = true
  assert.equal(await notify({ title: 'Otra', body: 'x' }), false)
  assert.equal((await request('/push')).data.devices, 0, 'una suscripción anulada se borra')
  assert.equal((await request('/push/test', 'POST', {})).data.delivered, false, 'sin canales, la prueba informa que no llegó')
})

test('escritorio: notify-send recibe título y texto sin pasar por un shell', async () => {
  const calls = []
  const notify = desktopNotifier((command, args, _options, callback) => { calls.push([command, args]); callback(null) })
  const ok = await notify({ title: 'Llamar; rm -rf /', body: 'Aviso' })
  if (process.platform !== 'linux') return assert.equal(ok, false)
  assert.equal(ok, true)
  assert.deepEqual(calls[0][0], 'notify-send')
  assert.equal(calls[0][1].at(-2), 'Llamar; rm -rf /', 'el título va como argumento literal')
})
