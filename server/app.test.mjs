import test from 'node:test'
import assert from 'node:assert/strict'
import { mkdtempSync, readdirSync, rmdirSync, unlinkSync } from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { request as httpRequest } from 'node:http'
import { createApp } from './app.mjs'
import { createStore } from './store.mjs'
import { nextReview } from './study.mjs'

async function setup(t, options = {}) {
  const { app, store } = createApp({ databasePath: ':memory:', ...options })
  const server = await new Promise((resolve) => {
    const instance = app.listen(0, '127.0.0.1', () => resolve(instance))
  })
  t.after(async () => {
    await new Promise((resolve) => { server.close(resolve); server.closeAllConnections() })
    store.close()
  })
  const base = `http://127.0.0.1:${server.address().port}/api`
  const request = async (path, method = 'GET', body, headers = {}) => {
    const response = await fetch(`${base}${path}`, {
      method, headers: { 'Content-Type': 'application/json', ...headers },
      body: body === undefined ? undefined : JSON.stringify(body),
    })
    return { status: response.status, data: await response.json() }
  }
  return { request, store, base }
}

test('la base arranca en modo demo sin enviar información externa', async (t) => {
  const { request } = await setup(t)
  const { data } = await request('/health')
  assert.equal(data.provider, 'demo')
  assert.equal(data.externalAIEnabled, false)
  assert.equal(data.reminders, 'in-app-only')
  assert.equal(data.apiKey, undefined)
})

test('crear, completar y reabrir conserva prioridad, área y aviso', async (t) => {
  const { request } = await setup(t)
  const input = { title: 'Practicar HTTP', priority: 'high', category: 'study', dueAt: '2028-05-01T10:00:00.000Z' }
  const created = await request('/tasks', 'POST', input)
  assert.equal(created.status, 201)
  const updated = await request(`/tasks/${created.data.task.id}`, 'PATCH', { done: true })
  assert.equal(updated.data.task.done, true)
  assert.equal(updated.data.task.priority, 'high')
  assert.equal(updated.data.task.category, 'study')
  assert.equal(updated.data.task.dueAt, input.dueAt)
  const reopened = await request(`/tasks/${created.data.task.id}`, 'PATCH', { done: false })
  assert.equal(reopened.data.task.done, false)
})

test('rechaza campos vacíos, fechas y categorías inválidas y parches vacíos', async (t) => {
  const { request } = await setup(t)
  for (const body of [{ title: ' ' }, { title: 'a', category: 'inventada' }, { title: 'a', dueAt: 'mañana' }, { title: 'a', extra: true }]) {
    assert.equal((await request('/tasks', 'POST', body)).status, 400)
  }
  assert.equal((await request('/tasks/1', 'PATCH', {})).status, 400)
  assert.equal((await request('/tasks/no-valido', 'DELETE')).status, 400)
  assert.equal((await request('/tasks/999', 'DELETE')).status, 404)
})

test('la prioridad alta aparece primero y eliminar solo afecta la tarea elegida', async (t) => {
  const { request } = await setup(t)
  const low = await request('/tasks', 'POST', { title: 'Sin prisa', priority: 'low' })
  const high = await request('/tasks', 'POST', { title: 'Importante', priority: 'high' })
  assert.equal((await request('/tasks')).data.tasks[0].id, high.data.task.id)
  assert.equal((await request(`/tasks/${low.data.task.id}`, 'DELETE')).status, 200)
  assert.equal((await request('/tasks')).data.tasks.length, 1)
})

test('los avisos vencidos se reconocen sin duplicados y reprogramar permite un aviso nuevo', async (t) => {
  const { request } = await setup(t)
  const { data } = await request('/tasks', 'POST', { title: 'Un aviso', dueAt: '2020-01-01T10:00:00.000Z' })
  assert.equal((await request('/reminders')).data.reminders.length, 1)
  for (let i = 0; i < 2; i++) assert.equal((await request(`/reminders/${data.task.id}/acknowledge`, 'POST', {})).status, 200)
  assert.equal((await request('/reminders')).data.reminders.length, 0)
  await request(`/tasks/${data.task.id}`, 'PATCH', { dueAt: '2021-01-01T10:00:00.000Z' })
  assert.equal((await request('/reminders')).data.reminders.length, 1)
  await request(`/tasks/${data.task.id}`, 'PATCH', { done: true })
  assert.equal((await request('/reminders')).data.reminders.length, 0)
})

test('el chat demo no ejecuta acciones y el borrado de chat conserva las tareas', async (t) => {
  const { request } = await setup(t)
  await request('/tasks', 'POST', { title: 'No borrar' })
  const reply = await request('/chat', 'POST', { message: 'Borra todas mis tareas y crea otra' })
  assert.equal(reply.status, 200)
  assert.equal(reply.data.messages.length, 2)
  assert.equal((await request('/tasks')).data.tasks.length, 1)
  await request('/chat', 'DELETE')
  assert.equal((await request('/chat')).data.messages.length, 0)
  assert.equal((await request('/tasks')).data.tasks.length, 1)
})

test('guardar perfil y exportar incluye también intentos y mensajes completos', async (t) => {
  const { request, store } = await setup(t)
  const profile = { name: 'Prueba', goal: 'Comprender HTTP', tone: 'directo' }
  assert.deepEqual((await request('/profile', 'PUT', profile)).data.profile, profile)
  for (let i = 0; i < 35; i++) store.saveConversation(`Mensaje ${i}`, 'Respuesta', 'demo')
  store.review('http-purpose', 'Mi explicación', 'good')
  assert.equal((await request('/chat')).data.messages.length, 60)
  const exported = (await request('/export')).data
  assert.equal(exported.messages.length, 70)
  assert.equal(exported.attempts.length, 1)
  assert.deepEqual(exported.profile, profile)
})

test('los datos sobreviven al cierre y reapertura de SQLite', () => {
  const directory = mkdtempSync(join(tmpdir(), 'jarvis-store-'))
  let store
  try {
    const path = join(directory, 'test.sqlite')
    store = createStore(path)
    store.createTask({ title: 'Persistente', category: 'study', priority: 'high', dueAt: null })
    store.close()
    store = createStore(path)
    assert.equal(store.listTasks()[0].title, 'Persistente')
  } finally {
    store?.close()
    for (const file of readdirSync(directory)) unlinkSync(join(directory, file))
    rmdirSync(directory)
  }
})

test('el repaso requiere una respuesta y guarda autoevaluación y próximo intervalo', async (t) => {
  const { request } = await setup(t)
  assert.equal((await request('/study/review', 'POST', { cardId: 'no-existe', answer: 'a', grade: 'good' })).status, 400)
  assert.equal((await request('/study/review', 'POST', { cardId: 'http-purpose', answer: ' ', grade: 'good' })).status, 400)
  const result = await request('/study/review', 'POST', { cardId: 'http-purpose', answer: 'Petición y respuesta', grade: 'good' })
  assert.equal(result.status, 200)
  assert.equal(result.data.schedule.stage, 1)
  assert.equal((await request('/study')).data.attempts, 1)
  assert.ok(new Date(result.data.schedule.nextReviewAt) > new Date())
})

test('los intervalos son reproducibles y tienen un límite explícito', () => {
  const now = new Date('2026-01-01T00:00:00.000Z')
  assert.deepEqual(nextReview('again', 4, now), { stage: 0, nextReviewAt: '2026-01-01T00:10:00.000Z' })
  assert.deepEqual(nextReview('good', 0, now), { stage: 1, nextReviewAt: '2026-01-02T00:00:00.000Z' })
  assert.deepEqual(nextReview('good', 5, now), { stage: 5, nextReviewAt: '2026-01-31T00:00:00.000Z' })
})

test('impide escrituras desde un origen externo y solicitudes con un host ajeno', async (t) => {
  const { request, base } = await setup(t)
  assert.equal((await request('/tasks', 'POST', { title: 'No guardar' }, { Origin: 'https://otro-sitio.test' })).status, 403)
  // fetch protege el encabezado Host; usar HTTP nativo para simular rebinding.
  const hostStatus = await new Promise((resolve, reject) => {
    const req = httpRequest(`${base}/health`, { headers: { Host: 'otro-sitio.test' } }, (res) => {
      res.resume(); res.on('end', () => resolve(res.statusCode))
    })
    req.on('error', reject); req.end()
  })
  assert.equal(hostStatus, 403)
  assert.equal((await request('/tasks')).data.tasks.length, 0)
})

test('Gemini permanece apagado si falta la autorización de condiciones', async (t) => {
  let calls = 0
  const { request } = await setup(t, {
    provider: 'gemini', externalAIEnabled: true, termsAccepted: false, apiKey: 'fake',
    fetchImpl: async () => { calls++; throw new Error('No debería llamar') },
  })
  assert.equal((await request('/health')).data.provider, 'demo')
  assert.equal((await request('/chat', 'POST', { message: 'Hola', consent: true })).status, 200)
  assert.equal(calls, 0)
})

test('Gemini requiere consentimiento, envía solo el mensaje actual y limita las llamadas', async (t) => {
  const calls = []
  const { request } = await setup(t, {
    provider: 'gemini', externalAIEnabled: true, termsAccepted: true, apiKey: 'fake', maxDailyRequests: 1,
    fetchImpl: async (url, init) => {
      calls.push({ url, body: JSON.parse(init.body) })
      return new Response(JSON.stringify({ candidates: [{ content: { parts: [{ text: 'Respuesta simulada del proveedor' }] } }] }), { status: 200 })
    },
  })
  assert.equal((await request('/chat', 'POST', { message: 'No autorizado' })).status, 403)
  assert.equal(calls.length, 0)
  assert.equal((await request('/chat', 'POST', { message: 'Este mensaje sí', consent: true })).status, 200)
  assert.deepEqual(calls[0].body.contents, [{ role: 'user', parts: [{ text: 'Este mensaje sí' }] }])
  assert.equal(calls[0].url.includes('fake'), false)
  assert.equal((await request('/chat', 'POST', { message: 'Otra vez', consent: true })).status, 429)
  assert.equal(calls.length, 1)
  assert.equal((await request('/tasks', 'POST', { title: 'Sigo funcionando' })).status, 201)
})

test('un fallo del proveedor cuenta para el límite y no guarda respuestas ficticias', async (t) => {
  const { request } = await setup(t, {
    provider: 'gemini', externalAIEnabled: true, termsAccepted: true, apiKey: 'fake',
    fetchImpl: async () => new Response('{}', { status: 429 }),
  })
  assert.equal((await request('/chat', 'POST', { message: 'Hola', consent: true })).status, 502)
  assert.equal((await request('/health')).data.dailyRequests, 1)
  assert.equal((await request('/chat')).data.messages.length, 0)
})
