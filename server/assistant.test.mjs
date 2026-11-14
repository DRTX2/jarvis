import test from 'node:test'
import assert from 'node:assert/strict'
import { request as httpRequest } from 'node:http'
import { createApp } from './app.mjs'
import { localTime, normalizeDue } from './assistant.mjs'
import { deviceTips } from './device.mjs'

const clock = () => new Date('2026-10-21T19:30:00.000Z')
async function setup(t, fetchImpl, options = {}) {
  const { app, store } = createApp({ databasePath: ':memory:', provider: 'ollama', clock, fetchImpl, ...options })
  const server = await new Promise((resolve) => { const instance = app.listen(0, '127.0.0.1', () => resolve(instance)) })
  t.after(async () => { await new Promise((resolve) => { server.close(resolve); server.closeAllConnections() }); store.close() })
  const base = `http://127.0.0.1:${server.address().port}/api`
  const request = async (path, method = 'GET', body, headers = {}) => {
    const response = await fetch(`${base}${path}`, { method, headers: { 'Content-Type': 'application/json', ...headers }, body: body === undefined ? undefined : JSON.stringify(body) })
    return { status: response.status, data: await response.json() }
  }
  return { request, store, base }
}
const ollama = (message, calls = []) => async (url, init) => {
  calls.push({ url, body: JSON.parse(init.body) })
  return new Response(JSON.stringify({ message }), { status: 200 })
}

test('IA local: sin consentimiento ni cuota; crear se guarda al instante y borrar o recordar quedan como propuesta', async (t) => {
  const calls = []
  const { request, store } = await setup(t, ollama({ role: 'assistant', content: '', tool_calls: [
    { function: { name: 'propose_task', arguments: { title: 'Estudiar redes', category: 'study', priority: 'rara', estimatedMinutes: 45, dueAt: '2026-10-22T18:00:00-05:00' } } },
    { function: { name: 'propose_memory', arguments: { title: 'Horario', content: 'Estudio mejor por la tarde' } } },
    { function: { name: 'propose_task_update', arguments: { taskId: 999, action: 'delete' } } },
  ] }, calls))
  store.createTask({ title: 'Pendiente existente', category: 'work', priority: 'high', dueAt: null })
  const health = (await request('/health')).data
  assert.equal(health.provider, 'ollama'); assert.equal(health.model, 'qwen3.5:9b'); assert.equal(health.externalAIEnabled, false)
  const { status, data } = await request('/chat', 'POST', { message: 'recuérdame estudiar redes mañana a las 6pm', timeZone: 'America/Bogota' })
  assert.equal(status, 200)
  assert.equal(calls[0].url, 'http://127.0.0.1:11434/api/chat')
  assert.equal(calls[0].body.tools.length, 3)
  const prompt = calls[0].body.messages.at(-1).content
  assert.match(prompt, /2026-10-21T14:30-05:00 \(America\/Bogota\)/)
  assert.match(prompt, /Pendiente existente/)
  assert.doesNotMatch(prompt, /"equipo"/, 'el estado del equipo solo va cuando se pregunta por él')
  assert.equal(data.applied[0].action, 'created')
  assert.equal(data.applied[0].task.priority, 'normal', 'un valor inválido del modelo se corrige, no se guarda')
  assert.equal(data.applied[0].task.dueAt, '2026-10-22T23:00:00.000Z')
  assert.match(data.reply.content, /Ya quedó guardado:\n• Creé «Estudiar redes» · aviso/)
  assert.match(data.reply.content, /No encontré esa tarea/)
  assert.equal(store.listTasks().length, 2, 'crear es reversible: se aplica al instante')
  assert.equal(data.proposals.tasks.length, 0)
  assert.equal((await request('/chat/proposals')).data.memories.length, 1)
  assert.equal((await request('/health')).data.dailyRequests, 0)
})

test('IA local: el historial solo reutiliza mensajes del modelo local y una caída no guarda nada', async (t) => {
  const calls = []
  const { request, store } = await setup(t, ollama({ role: 'assistant', content: 'Hola de nuevo' }, calls))
  store.saveConversation('antes', 'respuesta demo', 'demo')
  store.saveConversation('previo', 'respuesta local', 'ollama')
  await request('/chat', 'POST', { message: 'Hola' })
  store.saveConversation('crea algo', 'Listo.\n\nTe dejo esto para confirmar:\n• Crear «X»', 'ollama')
  await request('/chat', 'POST', { message: 'Otra' })
  assert.deepEqual(calls[1].body.messages.slice(-3, -1).map((item) => item.content), ['crea algo', 'Listo.'], 'el resumen del servidor no se reenvía')
  const down = await setup(t, async () => { throw new TypeError('fetch failed') })
  const failed = await down.request('/chat', 'POST', { message: 'Hola' })
  assert.equal(failed.status, 502); assert.match(failed.data.error, /ollama serve/)
  assert.equal((await down.request('/chat')).data.messages.length, 0)
})

test('IA local: el estudio dinámico funciona sin consentimiento externo', async (t) => {
  const material = { topic: 'Redes', question: '¿Por qué TCP ordena?', hint: 'Piensa en números de secuencia.', answer: 'Usa números de secuencia.', checkpoints: ['Menciona secuencia'] }
  const { request } = await setup(t, ollama({ role: 'assistant', content: JSON.stringify(material) }))
  const { status, data } = await request('/learning/generate', 'POST', { topic: 'Redes', instruction: '', cardId: null, consent: false })
  assert.equal(status, 200); assert.equal(data.proposal.material.question, '¿Por qué TCP ordena?')
})

test('hosts extra solo con configuración explícita; el resto sigue bloqueado', async (t) => {
  const { base } = await setup(t, ollama({ content: '' }), { allowedHosts: ['mi-pc.red.ts.net'] })
  const status = (Host) => new Promise((resolve, reject) => {
    const req = httpRequest(`${base}/health`, { headers: { Host } }, (res) => { res.resume(); res.on('end', () => resolve(res.statusCode)) })
    req.on('error', reject); req.end()
  })
  assert.equal(await status('mi-pc.red.ts.net'), 200)
  assert.equal(await status('otro.ejemplo.com'), 403)
})

test('equipo: snapshot de solo lectura y consejos por reglas', async (t) => {
  const { request } = await setup(t, ollama({ content: '' }))
  const { device } = (await request('/device')).data
  assert.ok(device.cores > 0 && device.memory.totalGb > 0)
  const tips = deviceTips({ cores: 4, load1: 6, memory: { usedPercent: 92 }, disk: { usedPercent: 95, freeGb: 5 }, uptimeHours: 200, processes: [{ name: 'ollama (IA local de Jarvis)', memPercent: 50 }, { name: 'chrome', memPercent: 40 }] })
  assert.equal(tips.length, 4); assert.match(tips[0], /chrome usa 40%/)
  assert.deepEqual(deviceTips({ cores: 4, load1: 1, memory: { usedPercent: 50 }, disk: null, uptimeHours: 2, processes: [] }), [])
  assert.equal(localTime('2026-01-01T12:00:00Z', 'UTC'), '2026-01-01T12:00+00:00')
  const now = clock()
  assert.equal(normalizeDue('2026-10-23T19:00-05:00', 'America/Bogota', now), '2026-10-24T00:00:00.000Z')
  assert.equal(normalizeDue('2026-10-23T19:00', 'America/Bogota', now), '2026-10-24T00:00:00.000Z', 'sin desfase usa la zona del usuario')
  assert.equal(normalizeDue('mañana', 'America/Bogota', now), undefined)
  assert.equal(normalizeDue(null, 'America/Bogota', now), null, 'null quita el aviso')
  const calls = []
  const asked = await setup(t, ollama({ role: 'assistant', content: 'Cierra pestañas.' }, calls))
  await asked.request('/chat', 'POST', { message: 'mi pc va lento, ¿qué cierro?' })
  assert.match(calls[0].body.messages.at(-1).content, /"equipo"/, 'preguntar por el equipo sí incluye su estado')
})

test('IA local: si la respuesta olvida la herramienta en un pedido de acción, una pasada dedicada la extrae', async (t) => {
  const replies = [
    { role: 'assistant', content: 'Claro, aquí tienes tres consejos.' },
    { role: 'assistant', content: '', tool_calls: [{ function: { name: 'propose_task', arguments: { title: 'Repasar derivadas' } } }] },
  ]
  const calls = []
  const { request } = await setup(t, async (url, init) => { calls.push(JSON.parse(init.body)); return new Response(JSON.stringify({ message: replies[calls.length - 1] }), { status: 200 }) })
  const { data } = await request('/chat', 'POST', { message: 'recuérdame repasar derivadas y dame tips', timeZone: 'UTC' })
  assert.equal(calls.length, 2)
  assert.match(calls[1].messages[0].content, /Tu única tarea/)
  assert.equal(data.applied[0].task.title, 'Repasar derivadas')
  assert.match(data.reply.content, /^Claro, aquí tienes tres consejos\.\n\nYa quedó guardado:\n• Creé «Repasar derivadas»/)
  calls.length = 0; replies.splice(0, 2, { role: 'assistant', content: 'Hola' })
  await request('/chat', 'POST', { message: 'explícame la recursión' })
  assert.equal(calls.length, 1, 'sin intención de acción no hay pasada extra')
})

const anthropic = (responses, calls) => async (url, init) => {
  calls.push({ url: String(url), headers: new Headers(init.headers), body: JSON.parse(init.body) })
  const next = responses[calls.length - 1]
  return new Response(JSON.stringify({ id: `msg_${calls.length}`, type: 'message', role: 'assistant', model: 'claude-opus-5-5', stop_details: null, usage: { input_tokens: 1, output_tokens: 1 }, ...next }), { status: next.status ?? 200, headers: { 'content-type': 'application/json' } })
}
const thinking = { type: 'thinking', thinking: '', signature: 'firma' }

test('nube (Claude): herramientas, bloques reenviados sin cambios, fallbacks y cuota por mensaje', async (t) => {
  const calls = []
  const { request, store } = await setup(t, anthropic([
    { stop_reason: 'tool_use', content: [thinking, { type: 'tool_use', id: 'toolu_1', name: 'propose_task', input: { title: 'Repasar derivadas', dueAt: '2026-10-22T20:00:00-05:00' } }, { type: 'tool_use', id: 'toolu_2', name: 'propose_memory', input: { title: '' } }] },
    { stop_reason: 'end_turn', content: [{ type: 'text', text: 'Listo, te aviso. Tres consejos: …' }] },
  ], calls), { provider: 'claude', anthropicApiKey: 'clave-falsa', termsAccepted: true, maxDailyRequests: 1 })
  const health = (await request('/health')).data
  assert.equal(health.provider, 'claude'); assert.equal(health.model, 'claude-opus-5-5')
  const { status, data } = await request('/chat', 'POST', { message: 'recuérdame repasar derivadas mañana a las 8pm y dame tips', timeZone: 'America/Bogota' })
  assert.equal(status, 200)
  assert.match(calls[0].url, /^https:\/\/api\.anthropic\.com\/v1\/messages/)
  assert.equal(calls[0].headers.get('x-api-key'), 'clave-falsa')
  assert.match(calls[0].headers.get('anthropic-beta'), /server-side-fallback-2026-07-01/)
  assert.equal(calls[0].body.fallbacks, 'default')
  assert.deepEqual(calls[0].body.output_config, { effort: 'medium' })
  assert.equal(calls[0].body.tools[0].input_schema.type, 'object')
  assert.match(calls[0].body.system, /Eres Jarvis/)
  assert.equal(calls[1].body.system, calls[0].body.system, 'system idéntico en la segunda pasada')
  assert.deepEqual(calls[1].body.tools, calls[0].body.tools, 'tools idénticas en la segunda pasada')
  assert.deepEqual(calls[1].body.messages.at(-2).content[0], thinking, 'el bloque de thinking se reenvía sin cambios')
  assert.deepEqual(calls[1].body.messages.at(-1).content.map((item) => item.tool_use_id), ['toolu_1', 'toolu_2'], 'un tool_result por cada tool_use, en un solo mensaje')
  assert.match(calls[1].body.messages.at(-1).content[1].content, /Datos no válidos/)
  assert.equal(data.reply.provider, 'claude')
  assert.match(data.reply.content, /^Listo, te aviso\. Tres consejos: …\n\nYa quedó guardado:\n• Creé «Repasar derivadas»/)
  assert.equal(store.listTasks()[0].dueAt, '2026-10-23T01:00:00.000Z')
  const limited = await request('/chat', 'POST', { message: 'otra' })
  assert.equal(limited.status, 429); assert.equal(calls.length, 2, 'la cuota se comprueba antes de llamar')
})

test('híbrido: local por defecto, nube solo en mensajes marcados; sin aceptar condiciones no hay nube', async (t) => {
  const local = [], cloud = []
  const fake = async (url, init) => String(url).includes('anthropic') ? anthropic([{ stop_reason: 'end_turn', content: [{ type: 'text', text: 'Desde la nube' }] }], cloud)(url, init) : ollama({ role: 'assistant', content: 'Desde local' }, local)(url, init)
  const { request } = await setup(t, fake, { anthropicApiKey: 'clave', termsAccepted: true })
  const health = (await request('/health')).data
  assert.equal(health.provider, 'ollama'); assert.deepEqual(health.cloud, { provider: 'claude', model: 'claude-opus-5-5' })
  assert.equal((await request('/chat', 'POST', { message: 'hola' })).data.reply.content, 'Desde local')
  const remote = (await request('/chat', 'POST', { message: 'problema difícil', cloud: true })).data
  assert.equal(remote.reply.content, 'Desde la nube'); assert.equal(remote.reply.provider, 'claude')
  assert.deepEqual(cloud[0].body.messages.slice(0, 2).map((item) => item.content), ['hola', 'Desde local'], 'la nube recibe el historial reciente')
  assert.equal(local.length, 1); assert.equal((await request('/health')).data.dailyRequests, 1)
  const noTerms = await setup(t, fake, { anthropicApiKey: 'clave', termsAccepted: false })
  assert.equal((await noTerms.request('/health')).data.cloud, null)
  assert.equal((await noTerms.request('/chat', 'POST', { message: 'x', cloud: true })).status, 400)
  const primary = await setup(t, fake, { provider: 'claude', anthropicApiKey: 'clave' })
  assert.equal((await primary.request('/health')).data.provider, 'demo', 'sin aceptar condiciones, Claude no se activa')
})

test('nube: una negativa o una clave inválida no guardan nada', async (t) => {
  const calls = []
  const { request } = await setup(t, anthropic([
    { stop_reason: 'refusal', content: [] },
    { status: 401, type: 'error', error: { type: 'authentication_error', message: 'invalid x-api-key' } },
  ], calls), { provider: 'claude', anthropicApiKey: 'clave', termsAccepted: true })
  const refused = await request('/chat', 'POST', { message: 'hola' })
  assert.equal(refused.status, 502); assert.match(refused.data.error, /declinó/)
  const invalid = await request('/chat', 'POST', { message: 'hola' })
  assert.match(invalid.data.error, /ANTHROPIC_API_KEY/)
  assert.equal((await request('/chat')).data.messages.length, 0)
})

test('acciones por chat: completar al instante, repetir, sin duplicados y propuestas que no se repiten', async (t) => {
  const tool = (name, args) => ({ function: { name, arguments: args } })
  const queue = [
    [tool('propose_task_update', { taskId: 1, action: 'complete' }), tool('propose_task', { title: 'Leer', dueAt: '2026-10-22T07:00:00-05:00', repeat: 'daily' })],
    [tool('propose_task', { title: 'leer' }), tool('propose_task_update', { taskId: 1, action: 'delete' })],
    [tool('propose_task_update', { taskId: 1, action: 'delete' })],
  ]
  let turn = 0
  const { request, store } = await setup(t, async () => new Response(JSON.stringify({ message: { role: 'assistant', content: '', tool_calls: queue[Math.floor(turn++ / 2)] } }), { status: 200 }))
  store.createTask({ title: 'Presentación', category: 'work', priority: 'high', dueAt: null })
  const first = (await request('/chat', 'POST', { message: 'ya terminé la presentación; recuérdame leer cada día a las 7am', timeZone: 'America/Bogota' })).data
  assert.deepEqual(first.applied.map((item) => item.action), ['completed', 'created'])
  assert.equal(store.getTask(1).done, true)
  assert.equal(store.listTasks().find((task) => task.title === 'Leer').repeat, 'daily')
  assert.match(first.reply.content, /Completé «Presentación»[\s\S]*se repite cada día/)
  const second = (await request('/chat', 'POST', { message: 'añade leer y borra la presentación' })).data
  assert.equal(second.applied.length, 0, 'no duplica una tarea pendiente con el mismo título')
  assert.equal(second.proposals.tasks[0].action, 'delete', 'borrar siempre requiere confirmación')
  const third = (await request('/chat', 'POST', { message: 'borra la presentación' })).data
  assert.equal(third.proposals.tasks.length, 0, 'la misma acción pendiente no se vuelve a proponer')
  assert.equal(store.getTask(1).done, true)
})

test('configuración: informa si Ollama está activo y si el modelo está descargado', async (t) => {
  const tags = (models) => async (url) => String(url).endsWith('/api/tags') ? new Response(JSON.stringify({ models: models.map((name) => ({ name })) }), { status: 200 }) : new Response('{}', { status: 500 })
  const ready = (await (await setup(t, tags(['qwen3.5:9b']))).request('/setup')).data.setup
  assert.deepEqual(ready.ollama, { url: 'http://127.0.0.1:11434', running: true, model: 'qwen3.5:9b', modelReady: true })
  assert.equal(ready.cloud, null)
  assert.equal((await (await setup(t, tags(['qwen3:8b']))).request('/setup')).data.setup.ollama.modelReady, false)
  const down = (await (await setup(t, async () => { throw new TypeError('fetch failed') })).request('/setup')).data.setup
  assert.equal(down.ollama.running, false)
})

test('streaming: el texto llega por fragmentos, una pasada con herramientas se reinicia y solo se guarda al terminar', async (t) => {
  const ndjson = (...parts) => new Response(parts.map((part) => JSON.stringify(part)).join('\n'), { status: 200 })
  const replies = [
    () => ndjson({ message: { content: 'Hola, ' } }, { message: { content: '¿en qué te ayudo?' } }, { done: true }),
    () => ndjson({ message: { content: '', tool_calls: [{ function: { name: 'propose_task', arguments: { title: 'Leer' } } }] } }, { done: true }),
    () => ndjson({ message: { content: 'Listo, ' } }, { message: { content: 'apuntado.' } }, { done: true }),
    () => ndjson({ message: { content: 'Listo, te lo he guardado.' } }, { done: true }),
    () => ndjson({ message: { content: '' } }),
    () => ndjson({ message: { content: 'Me corté' } }, { error: 'model crashed' }),
  ]
  const bodies = []
  const { base, store } = await setup(t, async (_url, init) => { bodies.push(JSON.parse(init.body)); return replies[bodies.length - 1]() })
  const chat = async (message) => {
    const response = await fetch(`${base}/chat`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ message, stream: true, timeZone: 'UTC' }) })
    assert.match(response.headers.get('content-type'), /application\/x-ndjson/)
    return (await response.text()).trim().split('\n').map((line) => JSON.parse(line))
  }
  const plain = await chat('hola')
  assert.deepEqual(plain.map((event) => event.type), ['status', 'delta', 'delta', 'done'])
  assert.equal(plain.at(-1).reply.content, 'Hola, ¿en qué te ayudo?')
  assert.equal(bodies[0].stream, true)
  assert.equal(bodies[0].think, false, 'sin pedir acciones no razona: el primer texto llega antes')
  assert.equal(bodies[0].tools, undefined, 'sin pedir acciones el modelo local no recibe herramientas: no puede inventar tareas')
  const action = await chat('recuérdame leer')
  assert.equal(bodies[1].think, true, 'pedir una acción activa el razonamiento para usar herramientas')
  assert.deepEqual(action.map((event) => event.type), ['status', 'reset', 'delta', 'delta', 'done'])
  assert.match(action.at(-1).reply.content, /^Listo, apuntado\.\n\nYa quedó guardado:\n• Creé «Leer»/)
  const lie = await chat('recuérdame algo importante')
  assert.match(lie.at(-1).reply.content, /^Listo, te lo he guardado\.\n\n⚠️ En realidad no llegué a guardar nada/, 'una afirmación falsa de guardado se corrige')
  const failed = await chat('otra cosa')
  assert.deepEqual(failed.map((event) => event.type), ['status', 'delta', 'error'])
  assert.match(failed.at(-1).error, /model crashed/)
  assert.equal(store.messages().length, 6, 'la respuesta cortada no se guarda')
})
