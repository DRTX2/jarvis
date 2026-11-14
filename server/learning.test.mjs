import test from 'node:test'
import assert from 'node:assert/strict'
import { createApp } from './app.mjs'
import { createStore } from './store.mjs'
import { mkdtempSync, readdirSync, unlinkSync, rmdirSync } from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { migrate } from './migrations.mjs'

const material = { topic: 'Redes', question: '¿Qué distingue TCP y UDP?', hint: 'Piensa en entrega y orden.', answer: 'TCP ofrece un flujo fiable y ordenado; UDP envía datagramas sin esa garantía.', checkpoints: ['Distinguir garantías de entrega.'] }
const feedback = { strengths: ['Distingues orden.'], gaps: ['Falta explicar datagramas.'], guidance: 'Compara las garantías.', followUp: '¿Qué elegirías para un juego y por qué?', uncertainty: 'Una respuesta breve no demuestra dominio.' }

function removeVersionEight(db) {
  db.exec(`DROP TABLE goals; DROP TABLE goal_tasks; DROP TABLE sourced_proposals;
    ALTER TABLE memories DROP COLUMN origin; ALTER TABLE memories DROP COLUMN valid_until;
    ALTER TABLE memories DROP COLUMN created_at; ALTER TABLE memories DROP COLUMN source_text;
    ALTER TABLE memory_proposals DROP COLUMN source_text; ALTER TABLE messages DROP COLUMN context_json;
    PRAGMA user_version = 7;`)
}

function goalInput(cardIds = [], knowledgeIds = []) {
  return { title: 'Preparar entrevista', topic: 'Redes', outcome: 'Explicar y aplicar TCP y UDP', targetDate: '2026-12-01', budgetMinutes: 20, cardIds, knowledgeIds, steps: [{ id: '00000000-0000-4000-8000-000000000001', title: 'Practicar redes', minutes: 25 }] }
}

test('objetivos y pasos: revisión versionada, tareas idempotentes y borrado sin perder actividad', async (t) => {
  const { request, store, calls } = await setup(t)
  const created = await request('/goals', goalInput())
  assert.equal(created.status, 201)
  const goal = created.data.goal
  assert.equal(store.listTasks().length, 0)
  const path = `/goals/${goal.id}/steps/${goal.steps[0].id}/task`
  const first = await request(path, { expectedVersion: 1 })
  const second = await request(path, { expectedVersion: 1 })
  assert.equal(first.data.task.id, second.data.task.id)
  assert.equal(store.listTasks().length, 1)
  const edited = await request(`/goals/${goal.id}`, { ...goalInput(), title: 'Ruta revisada', expectedVersion: 1 }, 'PUT')
  assert.equal(edited.data.goal.version, 2)
  assert.equal((await request(`/goals/${goal.id}`, { ...goalInput(), expectedVersion: 1 }, 'PUT')).status, 409)
  assert.equal((await request(path, { expectedVersion: 1 })).status, 409)
  assert.equal((await request('/goals', { ...goalInput(), cardIds: ['no-existe'] })).status, 409)
  assert.equal((await request(`/goals/${goal.id}`, { expectedVersion: 2 }, 'DELETE')).status, 200)
  assert.equal(store.listTasks().length, 1)
  assert.equal(calls.length, 0)
})

test('práctica por objetivo prioriza evidencias actuales y no modifica repasos ni tareas', async (t) => {
  const { request, store } = await setup(t, { clock: () => new Date('2026-10-09T15:00:00Z') })
  const cards = store.study().cards
  store.review(cards[0].id, 'Intento con dificultad', 'again')
  store.review(cards[1].id, 'Intento positivo', 'good')
  store.db.prepare('UPDATE reviews SET next_review_at = ? WHERE card_id = ?').run('2026-10-09T14:00:00Z', cards[1].id)
  const goal = store.saveGoal(null, 0, goalInput(cards.map((card) => card.id)))
  const before = store.study()
  const response = await request(`/goals/${goal.id}/practice`, { expectedVersion: 1 })
  assert.equal(response.status, 200)
  assert.deepEqual(response.data.plan.items.map((item) => item.cardId), [cards[1].id, cards[0].id])
  assert.equal(response.data.plan.estimatedMinutes, 20)
  assert.equal(response.data.plan.items[0].reason, 'Repaso vencido')
  assert.deepEqual(store.study(), before)
  assert.equal(store.listTasks().length, 0)
  store.approveMaterial(cards[0].id, cards[0].revision, material)
  assert.equal((await request('/study/review', { cardId: cards[0].id, answer: 'Borrador anterior', grade: 'again', expectedRevision: 1 })).status, 409)
})

test('generación con fuentes: citas literales, aprobación vinculada, instantánea y consentimiento', async (t) => {
  const { request, store, calls, reply } = await setup(t)
  const source = store.addKnowledge({ title: 'Referencia TCP', topic: 'Redes', origin: 'Nota aportada', content: 'TCP ofrece entrega ordenada. ' + 'x'.repeat(4100) + 'MARCADOR_NO_ENVIAR', url: 'https://example.com/tcp' })
  reply(JSON.stringify({ ...material, citations: [{ sourceId: source.id, quote: 'TCP ofrece entrega ordenada.' }] }))
  const input = { topic: 'Redes', instruction: 'Aplica la idea', cardId: null, consent: false, knowledgeIds: [source.id] }
  assert.equal((await request('/learning/generate', input)).status, 403)
  assert.equal(calls.length, 0)
  const generated = await request('/learning/generate', { ...input, consent: true })
  assert.equal(generated.status, 200)
  assert.equal(JSON.stringify(calls[0]).includes('MARCADOR_NO_ENVIAR'), false)
  assert.equal(JSON.stringify(calls[0]).includes('TCP ofrece entrega ordenada.'), true)
  const proposal = generated.data.proposal
  assert.equal(store.study().cards.length, 3)
  const approve = { material: proposal.material, cardId: null, expectedRevision: 0, proposalId: proposal.proposalId }
  const first = await request('/learning/approve', approve)
  const second = await request('/learning/approve', approve)
  assert.equal(first.data.card.id, second.data.card.id)
  assert.equal(first.data.card.references[0].quote, 'TCP ofrece entrega ordenada.')
  assert.equal(store.study().cards.length, 4)
  assert.equal((await request('/learning/approve', { ...approve, references: [] })).status, 400)
  store.deleteKnowledge(source.id)
  assert.equal(store.learningCard(first.data.card.id).references[0].title, source.title)
})

test('citas inventadas, fuentes borradas y propuestas caducadas no se aprueban', async (t) => {
  let now = new Date('2026-10-09T15:00:00Z')
  const { request, store, reply } = await setup(t, { clock: () => now })
  const source = store.addKnowledge({ title: 'Fuente', topic: 'Redes', origin: 'Nota', content: 'TCP entrega ordenada.', url: null })
  const input = { topic: 'Redes', instruction: '', cardId: null, consent: true, knowledgeIds: [source.id] }
  reply(JSON.stringify({ ...material, citations: [{ sourceId: source.id, quote: 'UDP es fiable' }] }))
  assert.equal((await request('/learning/generate', input)).status, 502)
  reply(JSON.stringify({ ...material, citations: [{ sourceId: source.id, quote: 'TCP entrega ordenada.' }] }))
  const proposal = (await request('/learning/generate', input)).data.proposal
  const approve = { material: proposal.material, cardId: null, expectedRevision: 0, proposalId: proposal.proposalId }
  store.deleteKnowledge(source.id)
  assert.equal((await request('/learning/approve', approve)).status, 409)
  const secondSource = store.addKnowledge({ title: 'Otra', topic: 'Redes', origin: 'Nota', content: 'Evidencia', url: null })
  const expired = store.createSourcedProposal(null, 0, store.sourceExcerpts([secondSource.id]), [{ sourceId: secondSource.id, quote: 'Evidencia' }])
  now = new Date('2026-10-10T15:00:01Z')
  assert.equal((await request('/learning/approve', { ...approve, proposalId: expired.proposalId })).status, 409)
  assert.equal(store.study().cards.length, 3)
})

test('memoria elegida es trazable, excluye vencidos y no manda recuerdos adicionales', async (t) => {
  const { request, store, calls, reply } = await setup(t, { clock: () => new Date('2026-10-09T15:00:00Z') })
  reply('Respuesta')
  const selected = store.saveMemory(null, 0, { title: 'Redes', content: 'Me ayudan ejemplos', origin: 'Declarado', validUntil: null })
  store.saveMemory(null, 0, { title: 'No compartir', content: 'Otro contexto' })
  const expired = store.saveMemory(null, 0, { title: 'Antiguo', content: 'Ya no aplica', validUntil: '2026-10-08' })
  const context = { memories: true, memoryIds: [selected.id] }
  assert.equal((await request('/chat', { message: 'Hola', consent: true, context })).status, 200)
  assert.equal(JSON.stringify(calls[0]).includes('No compartir'), false)
  assert.equal(JSON.stringify(calls[0]).includes('Me ayudan ejemplos'), true)
  assert.equal(store.messages().at(-1).context.memories[0].version, 1)
  store.saveMemory(selected.id, 1, { title: 'Redes', content: 'Contenido cambiado' })
  assert.equal((await request('/chat', { message: 'Hola', consent: true, context: { ...context, memoryVersions: [{ id: selected.id, version: 1 }] } })).status, 409)
  assert.equal((await request('/chat', { message: 'Hola', consent: true, context: { memories: true, memoryIds: [expired.id] } })).status, 409)
  assert.equal(store.aiUsage(), 1)
  await request('/chat', { message: 'Solo mensaje', consent: true, context: { memories: true, memoryIds: [] } })
  assert.equal(JSON.stringify(calls[1]).includes('Me ayudan ejemplos'), false)
})

test('procedencia de recuerdos y objetivos persisten; migración v7 no inventa fechas', () => {
  const directory = mkdtempSync(join(tmpdir(), 'jarvis-goals-'))
  const path = join(directory, 'test.sqlite')
  let store = createStore(path)
  try {
    const memory = store.saveMemory(null, 0, { title: 'Anterior', content: 'Dato anterior' })
    removeVersionEight(store.db); migrate(store.db)
    assert.equal(store.memories()[0].id, memory.id)
    assert.equal(store.memories()[0].createdAt, null)
    assert.equal(store.memories()[0].origin, 'Origen no registrado (anterior)')
    const goal = store.saveGoal(null, 0, goalInput())
    const task = store.createStepTask(goal.id, goal.steps[0].id, 1)
    const proposal = store.createMemoryProposal({ title: 'Preferencia', content: 'Ejemplos' }, 'Prefiero ejemplos de redes')
    const saved = store.approveMemoryProposal(proposal.id, proposal.memory)
    store.close(); store = createStore(path)
    assert.equal(store.getGoal(goal.id).steps[0].taskId, task.id)
    assert.equal(store.memories().find((item) => item.id === saved.id).sourceText, 'Prefiero ejemplos de redes')
    store.deleteMemory(saved.id, saved.version)
    assert.throws(() => store.approveMemoryProposal(proposal.id, proposal.memory), /no encontrada/)
  } finally { store.close(); for (const file of readdirSync(directory)) unlinkSync(join(directory, file)); rmdirSync(directory) }
})

test('migración v5 preserva recuerdos y propuestas antiguas y puede repetirse', () => {
  const store = createStore(':memory:')
  try {
    const task = store.createTask({ title: 'Anterior', category: 'study', priority: 'high', dueAt: null })
    const memory = store.saveMemory(null, 0, { title: 'Anterior', content: 'Recuerdo anterior' })
    const proposal = store.createTaskProposal({ title: 'Cambio pendiente', category: 'study', priority: 'high', estimatedMinutes: 25 }, task)
    removeVersionEight(store.db)
    store.db.exec(`DROP TABLE knowledge; DROP TABLE memory_proposals;
      ALTER TABLE task_proposals DROP COLUMN action;
      ALTER TABLE task_proposals DROP COLUMN target_json;
      ALTER TABLE task_proposals DROP COLUMN result_json;
      PRAGMA user_version = 5;`)
    migrate(store.db); migrate(store.db)
    assert.equal(store.memories()[0].id, memory.id)
    assert.equal(store.getTask(task.id).title, 'Anterior')
    assert.equal(store.pendingTaskProposals()[0].id, proposal.id)
    assert.equal(store.approveTaskProposal(proposal.id, proposal.task).title, 'Cambio pendiente')
    assert.equal(store.db.prepare('PRAGMA user_version').get().user_version, 8)
  } finally { store.close() }
})

test('materiales aportados: validación, persistencia, exportación, borrado y ningún envío externo', async (t) => {
  const { request, store, calls } = await setup(t)
  const material = { title: 'Notas de C#', topic: '.NET', origin: 'apuntes.md', content: '# Async\n<script>alert(1)</script>\nNo ejecutar.', url: 'https://learn.microsoft.com/dotnet/' }
  assert.equal((await request('/knowledge', { ...material, url: 'javascript:alert(1)' })).status, 400)
  assert.equal((await request('/knowledge', { ...material, content: 'x'.repeat(16001) })).status, 400)
  const created = await request('/knowledge', material)
  assert.equal(created.status, 201)
  assert.equal((await request('/knowledge', undefined, 'GET')).data.knowledge[0].content, material.content)
  assert.equal((await request('/export', undefined, 'GET')).data.knowledge[0].origin, 'apuntes.md')
  assert.equal(calls.length, 0)
  assert.equal(store.aiUsage(), 0)
  assert.equal((await request(`/knowledge/${created.data.material.id}`, undefined, 'DELETE')).status, 200)
  assert.equal(store.knowledge().length, 0)
})

test('editar una tarea con versión antigua no sobrescribe cambios externos', async (t) => {
  const { request, store } = await setup(t, { externalAIEnabled: false })
  const task = store.createTask({ title: 'Original', category: 'personal', priority: 'normal', dueAt: null })
  store.updateTask(task.id, { title: 'Otra vista' })
  assert.equal((await request(`/tasks/${task.id}`, { title: 'Borrador viejo', expectedVersion: task.version }, 'PATCH')).status, 409)
  assert.equal(store.getTask(task.id).title, 'Otra vista')
  assert.equal((await request(`/tasks/${task.id}`, { expectedVersion: 2 }, 'PATCH')).status, 400)
})

test('migración v6 agrega biblioteca sin perder datos, y sus materiales sobreviven al reinicio', () => {
  const directory = mkdtempSync(join(tmpdir(), 'jarvis-knowledge-'))
  const path = join(directory, 'test.sqlite')
  let store = createStore(path)
  try {
    const task = store.createTask({ title: 'Conservar', category: 'personal', priority: 'normal', dueAt: null })
    removeVersionEight(store.db)
    store.db.exec('DROP TABLE knowledge; PRAGMA user_version = 6;')
    migrate(store.db)
    const item = store.addKnowledge({ title: 'Documento', topic: 'AWS', content: 'Extracto', origin: 'Nota propia', url: null })
    store.close(); store = createStore(path)
    assert.equal(store.getTask(task.id).title, 'Conservar')
    assert.equal(store.knowledge()[0].id, item.id)
  } finally { store.close(); for (const file of readdirSync(directory)) unlinkSync(join(directory, file)); rmdirSync(directory) }
})

test('acciones de chat locales, con conflictos, confirmación idempotente y fechas explícitas', async (t) => {
  const { request, store, calls } = await setup(t)
  const task = store.createTask({ title: 'Acciones', category: 'personal', priority: 'normal', dueAt: null, estimatedMinutes: 25 })
  const propose = async (action) => (await request('/chat/task-proposal', { message: 'Acción', consent: false, targetId: task.id, action })).data.proposal
  const complete = await propose('complete')
  assert.equal(store.getTask(task.id).done, false)
  assert.equal((await request(`/chat/task-proposal/${complete.id}/approve`, complete.task)).data.task.done, true)
  await request(`/chat/task-proposal/${complete.id}/approve`, complete.task)
  assert.equal(store.db.prepare('SELECT COUNT(*) AS n FROM task_completions').get().n, 1)
  const reopen = await propose('reopen')
  assert.equal((await request(`/chat/task-proposal/${reopen.id}/approve`, reopen.task)).data.task.done, false)
  const stale = await propose('delete')
  store.updateTask(task.id, { title: 'No borrar con propuesta vieja' })
  assert.equal((await request(`/chat/task-proposal/${stale.id}/approve`, stale.task)).status, 409)
  const remove = await propose('delete')
  assert.equal((await request(`/chat/task-proposal/${remove.id}/approve`, remove.task)).data.task.deleted, true)
  assert.equal((await request(`/chat/task-proposal/${remove.id}/approve`, remove.task)).data.task.deleted, true)
  assert.equal(store.getTask(task.id), undefined)
  assert.equal(calls.length, 0)
  assert.equal((await request('/chat/task-proposal', { message: 'Borra', consent: false, action: 'delete' })).status, 400)
})

test('fecha ambigua no se infiere; cambio, eliminación del aviso y validación ocurren al confirmar', async (t) => {
  const { request, store } = await setup(t, { externalAIEnabled: false })
  const task = store.createTask({ title: 'Aviso', category: 'study', priority: 'high', dueAt: null })
  const generate = async () => (await request('/chat/task-proposal', { message: 'Mañana por la tarde', consent: false, targetId: task.id })).data.proposal
  const proposal = await generate()
  assert.equal(proposal.task.dueAt, null)
  assert.equal((await request(`/chat/task-proposal/${proposal.id}/approve`, { ...proposal.task, dueAt: 'mañana' })).status, 400)
  assert.equal((await request(`/chat/task-proposal/${proposal.id}/approve`, { ...proposal.task, dueAt: '2028-02-30T12:00:00Z' })).status, 400)
  const saved = await request(`/chat/task-proposal/${proposal.id}/approve`, { ...proposal.task, dueAt: '2028-01-01T10:00:00-05:00' })
  assert.equal(saved.data.task.dueAt, '2028-01-01T15:00:00.000Z')
  assert.equal(saved.data.task.done, false)
  const clear = await generate()
  assert.equal((await request(`/chat/task-proposal/${clear.id}/approve`, { ...clear.task, dueAt: null })).data.task.dueAt, null)
})

test('propuestas de recuerdos: consentimiento, edición aprobada, recuperación, descarte y cuota', async (t) => {
  const { request, store, calls, reply } = await setup(t)
  reply(JSON.stringify({ title: 'Preferencia', content: 'Me gustan ejemplos' }))
  assert.equal((await request('/chat/memory-proposal', { message: 'Prefiero ejemplos', consent: false })).status, 403)
  assert.equal(calls.length, 0)
  const proposal = (await request('/chat/memory-proposal', { message: 'Prefiero ejemplos', consent: true })).data.proposal
  assert.equal(store.memories().length, 0)
  assert.equal((await request('/chat/proposals', undefined, 'GET')).data.memories[0].id, proposal.id)
  const edited = { title: 'Mi preferencia', content: 'Ejemplos de redes' }
  const first = await request(`/chat/memory-proposal/${proposal.id}/approve`, edited)
  const second = await request(`/chat/memory-proposal/${proposal.id}/approve`, edited)
  assert.equal(first.data.memory.id, second.data.memory.id)
  assert.equal(store.memories().length, 1)
  assert.equal(store.memories()[0].content, edited.content)
  assert.equal(store.aiUsage(), 1)
  assert.equal((await request('/chat/proposals', undefined, 'GET')).data.memories.length, 0)
  reply('{"title":"No","content":"x","execute":"delete"}')
  assert.equal((await request('/chat/memory-proposal', { message: 'Dato', consent: true })).status, 502)
  assert.equal(store.aiUsage(), 2)
  const discarded = store.createMemoryProposal({ title: 'Descartar', content: 'No guardar' })
  assert.equal((await request(`/chat/memory-proposal/${discarded.id}`, undefined, 'DELETE')).status, 200)
  assert.equal((await request(`/chat/memory-proposal/${discarded.id}/approve`, discarded.memory)).status, 404)
})

test('caducidad y recuperación persistente de propuestas sin ejecutar acciones', () => {
  const directory = mkdtempSync(join(tmpdir(), 'jarvis-proposals-'))
  const path = join(directory, 'test.sqlite')
  let now = new Date('2026-10-10T12:00:00Z')
  let store = createStore(path, { clock: () => now })
  try {
    const target = store.createTask({ title: 'Persistente', category: 'work', priority: 'normal', dueAt: null })
    const task = store.createTaskProposal({ title: target.title, category: target.category, priority: target.priority, estimatedMinutes: 25 }, target, 'delete')
    const memory = store.createMemoryProposal({ title: 'Pendiente', content: 'Dato' })
    store.close(); store = createStore(path, { clock: () => now })
    assert.equal(store.pendingTaskProposals()[0].target.title, 'Persistente')
    assert.equal(store.pendingMemoryProposals()[0].id, memory.id)
    assert.equal(store.listTasks().length, 1)
    assert.equal(store.memories().length, 0)
    now = new Date('2026-10-11T12:00:01Z')
    assert.equal(store.pendingTaskProposals().length, 0)
    assert.equal(store.pendingMemoryProposals().length, 0)
    assert.throws(() => store.approveTaskProposal(task.id, task.task), /caducó/)
    assert.throws(() => store.approveMemoryProposal(memory.id, memory.memory), /caducó/)
  } finally { store.close(); for (const file of readdirSync(directory)) unlinkSync(join(directory, file)); rmdirSync(directory) }
})
async function setup(t, options = {}) {
  const calls = []
  let responseText = JSON.stringify(material)
  const { app, store } = createApp({ databasePath: ':memory:', provider: 'gemini', externalAIEnabled: true, termsAccepted: true, apiKey: 'fake-key-for-tests', fetchImpl: async (_url, input) => {
    calls.push(JSON.parse(input.body))
    return new Response(JSON.stringify({ candidates: [{ finishReason: 'STOP', content: { parts: [{ text: responseText }] } }] }), { status: 200 })
  }, ...options })
  const server = app.listen(0, '127.0.0.1')
  await new Promise((resolve) => server.once('listening', resolve))
  t.after(async () => { await new Promise((resolve) => { server.close(resolve); server.closeAllConnections() }); store.close() })
  async function request(path, body, method = 'POST') {
    const res = await fetch(`http://127.0.0.1:${server.address().port}/api${path}`, { method, headers: { 'Content-Type': 'application/json' }, ...(method === 'GET' ? {} : { body: JSON.stringify(body) }) })
    return { status: res.status, data: await res.json() }
  }
  return { request, store, calls, reply: (text) => { responseText = text } }
}
test('el contexto es optativo, acotado y requiere consentimiento por mensaje', async (t) => {
  const { request, store, calls, reply } = await setup(t)
  reply('Respuesta de prueba')
  store.setProfile({ name: 'Privado', goal: 'Aprender', tone: 'directo' })
  store.createTask({ title: 'Mi pendiente privado', category: 'study', priority: 'high', dueAt: null })
  for (let i = 0; i < 6; i++) store.saveConversation(`Mensaje ${i}`, 'x'.repeat(2000), 'gemini')
  assert.equal((await request('/chat', { message: 'Hola', consent: false, context: { profile: true } })).status, 403)
  assert.equal(calls.length, 0)
  await request('/chat', { message: 'Hola', consent: true })
  assert.equal(calls[0].contents.length, 1)
  assert.equal(JSON.stringify(calls[0]).includes('Privado'), false)
  await request('/chat', { message: 'Ayúdame', consent: true, context: { profile: true, history: true, tasks: true } })
  const context = JSON.parse(calls[1].contents[0].parts[0].text.split('\n').slice(1).join('\n'))
  assert.equal(context.profile.name, 'Privado')
  assert.equal(context.history.length, 8)
  assert.ok(context.history.every((message) => message.content.length <= 1200))
  assert.equal(context.pendingTasks[0].title, 'Mi pendiente privado')
  assert.equal(context.dailyReviews, undefined)
})
test('generar no guarda; aprobar crea, permite repasar y conserva versiones al revisar', async (t) => {
  const { request, store } = await setup(t)
  const generated = await request('/learning/generate', { topic: 'Redes', instruction: 'Nivel inicial', cardId: null, consent: true })
  assert.equal(generated.status, 200)
  assert.equal(store.learningCards().length, 3)
  const approved = await request('/learning/approve', generated.data.proposal)
  assert.equal(approved.status, 200)
  const card = approved.data.card
  await request('/study/review', { cardId: card.id, answer: 'TCP garantiza orden.', grade: 'good' })
  assert.ok(store.study().cards.find((item) => item.id === card.id).nextReviewAt)
  const revised = { cardId: card.id, expectedRevision: 1, material: { ...material, question: 'Compara TCP y UDP con un ejemplo.' } }
  assert.equal((await request('/learning/approve', revised)).status, 200)
  assert.equal((await request('/learning/approve', revised)).status, 409)
  assert.equal(store.study().cards.find((item) => item.id === card.id).nextReviewAt, null)
  const exported = (await request('/export', undefined, 'GET')).data
  assert.equal(exported.learningVersions.length, 1)
  assert.equal(JSON.parse(exported.attempts[0].cardSnapshot).revision, 1)
})
test('rechaza contenido inválido y los fallos consumen cuota sin guardar propuestas', async (t) => {
  const { request, reply, store, calls } = await setup(t, { maxDailyRequests: 1 })
  reply('{"topic":"Incompleto"}')
  const body = { topic: 'Redes', instruction: '', cardId: null, consent: true }
  assert.equal((await request('/learning/generate', { ...body, consent: false })).status, 403)
  assert.equal(calls.length, 0)
  assert.equal((await request('/learning/generate', body)).status, 502)
  assert.equal(store.learningCards().length, 3)
  assert.equal((await request('/learning/generate', body)).status, 429)
  assert.equal(calls.length, 1)
})
test('la revisión de IA guarda evidencia y no modifica notas ni calendario de repaso', async (t) => {
  const { request, reply, store } = await setup(t)
  reply(JSON.stringify(feedback))
  const result = await request('/learning/feedback', { cardId: 'http-purpose', answer: 'El cliente hace una petición.', consent: true })
  assert.equal(result.status, 200)
  assert.deepEqual(result.data.feedback, feedback)
  assert.equal(store.study().attempts, 0)
  assert.equal(store.study().cards[0].nextReviewAt, null)
  assert.equal(store.exportLearning().learningFeedback.length, 1)
})
test('estudio externo permanece bloqueado en demo y material con HTML se guarda como texto', async (t) => {
  const { request, calls } = await setup(t, { externalAIEnabled: false })
  assert.equal((await request('/learning/generate', { topic: 'Redes', instruction: '', cardId: null, consent: true })).status, 403)
  assert.equal(calls.length, 0)
  const approved = await request('/learning/approve', { cardId: null, expectedRevision: 0, material: { ...material, question: '<script>alert(1)</script>' } })
  assert.equal(approved.status, 200)
  assert.equal(approved.data.card.question, '<script>alert(1)</script>')
})

const session = { method: 'feynman', answer: 'Un cliente pide y el servidor responde.', retry: 'Petición y respuesta tienen cabeceras.', transfer: 'Una app del tiempo solicita JSON.', confidence: 2, hintUsed: true, revealed: true, errors: ['understanding'] }
test('sesión persistente versionada, conflicto explícito y registro conservador de ayudas', async (t) => {
  const { request, store } = await setup(t)
  const payload = { cardId: 'http-purpose', revision: 1, expectedVersion: 0, session }
  assert.equal((await request('/study/session', payload, 'PUT')).status, 200)
  assert.equal((await request('/study/session', payload, 'PUT')).status, 409)
  assert.equal((await request('/study', undefined, 'GET')).data.sessions[0].session.method, 'feynman')
  assert.equal(store.study().attempts, 0)
  const result = await request('/study/review', { cardId: 'http-purpose', answer: session.answer, grade: 'good', technique: session })
  assert.equal(result.status, 200)
  assert.equal(result.data.schedule.stage, 0)
  assert.equal(store.sessions().length, 0)
  const exported = (await request('/export', undefined, 'GET')).data
  assert.equal(JSON.parse(exported.attempts[0].technique).retry, session.retry)
})
test('un ciclo incompleto y un borrador de una versión anterior no se aceptan', async (t) => {
  const { request, store } = await setup(t)
  assert.equal((await request('/study/review', { cardId: 'http-purpose', answer: session.answer, grade: 'good', technique: { ...session, retry: '' } })).status, 400)
  store.approveMaterial('http-purpose', 1, material)
  assert.equal((await request('/study/session', { cardId: 'http-purpose', revision: 1, expectedVersion: 0, session }, 'PUT')).status, 409)
})
test('propuestas locales no ejecutan acciones y confirmar dos veces no duplica tareas', async (t) => {
  const { request, store, calls } = await setup(t, { externalAIEnabled: false })
  const proposed = await request('/chat/task-proposal', { message: 'Estudiar redes mañana', consent: false })
  assert.equal(store.listTasks().length, 0)
  assert.equal(calls.length, 0)
  const { proposal } = proposed.data
  const first = await request(`/chat/task-proposal/${proposal.id}/approve`, proposal.task)
  const second = await request(`/chat/task-proposal/${proposal.id}/approve`, proposal.task)
  assert.equal(first.data.task.id, second.data.task.id)
  assert.equal(store.listTasks().length, 1)
  assert.equal(first.data.task.dueAt, null)
})
test('la IA no puede introducir acciones no autorizadas o campos ejecutables en una propuesta', async (t) => {
  const { request, reply, calls, store } = await setup(t)
  assert.equal((await request('/chat/task-proposal', { message: 'Una tarea', consent: false })).status, 403)
  assert.equal(calls.length, 0)
  reply(JSON.stringify({ title: 'Algo', category: 'study', priority: 'normal', estimatedMinutes: 20, command: 'arbitrary' }))
  assert.equal((await request('/chat/task-proposal', { message: 'Una tarea', consent: true })).status, 502)
  assert.equal(store.listTasks().length, 0)
  const valid = { title: 'Aprender', category: 'study', priority: 'normal', estimatedMinutes: 20 }
  reply(JSON.stringify(valid))
  const proposal = (await request('/chat/task-proposal', { message: 'Una tarea', consent: true })).data.proposal
  await request(`/chat/task-proposal/${proposal.id}`, undefined, 'DELETE')
  assert.equal((await request(`/chat/task-proposal/${proposal.id}/approve`, valid)).status, 404)
})

test('el ciclo de estudio sobrevive al cierre y reapertura del archivo SQLite', () => {
  const directory = mkdtempSync(join(tmpdir(), 'jarvis-coach-'))
  const path = join(directory, 'sessions.sqlite')
  let store
  try {
    store = createStore(path)
    store.saveSession('http-purpose', 1, 0, session)
    const proposal = store.createTaskProposal({ title: 'Practicar', category: 'study', priority: 'normal', estimatedMinutes: 20 })
    store.close()
    store = createStore(path)
    assert.deepEqual(store.sessions()[0].session, session)
    assert.equal(store.approveTaskProposal(proposal.id, proposal.task).title, 'Practicar')
    assert.equal(store.db.prepare('PRAGMA user_version').get().user_version, 8)
  } finally {
    store?.close()
    for (const file of readdirSync(directory)) unlinkSync(join(directory, file))
    rmdirSync(directory)
  }
})

test('recuerdos explícitos: crear, corregir, exportar y borrar con control de versión', async (t) => {
  const { request, store } = await setup(t)
  const created = await request('/memories', { title: 'Estudio', content: 'Prefiero ejemplos prácticos.' })
  assert.equal(created.status, 201)
  const memory = created.data.memory
  assert.equal((await request(`/memories/${memory.id}`, { title: 'Estudio', content: 'Explicaciones simples.', expectedVersion: 1 }, 'PUT')).status, 200)
  assert.equal((await request(`/memories/${memory.id}`, { title: 'Viejo', content: 'No sobrescribir', expectedVersion: 1 }, 'PUT')).status, 409)
  assert.equal((await request('/export', undefined, 'GET')).data.memories[0].content, 'Explicaciones simples.')
  assert.equal((await request(`/memories/${memory.id}`, { expectedVersion: 1 }, 'DELETE')).status, 409)
  assert.equal((await request(`/memories/${memory.id}`, { expectedVersion: 2 }, 'DELETE')).status, 200)
  assert.equal(store.memories().length, 0)
})
test('los recuerdos solo se envían si se seleccionan y desaparecen de futuros contextos al borrarlos', async (t) => {
  const { request, store, reply, calls } = await setup(t)
  reply('Respuesta simulada')
  const memory = store.saveMemory(null, 0, { title: 'Preferencia privada', content: 'Ejercicios primero' })
  await request('/chat', { message: 'Hola', consent: true })
  assert.equal(JSON.stringify(calls[0]).includes('Preferencia privada'), false)
  await request('/chat', { message: 'Hola', consent: true, context: { memories: true } })
  assert.equal(JSON.stringify(calls[1]).includes('Preferencia privada'), true)
  store.deleteMemory(memory.id, memory.version)
  await request('/chat', { message: 'Hola', consent: true, context: { memories: true } })
  assert.equal(JSON.stringify(calls[2]).includes('Preferencia privada'), false)
})
test('modificar desde chat conserva avisos y estado, detecta conflictos y no reaplica una confirmación', async (t) => {
  const { request, store } = await setup(t, { externalAIEnabled: false })
  const task = store.createTask({ title: 'Antes', category: 'study', priority: 'high', estimatedMinutes: 25, dueAt: '2028-01-01T10:00:00.000Z' })
  store.updateTask(task.id, { done: true })
  const generate = async () => (await request('/chat/task-proposal', { message: 'Cambia título y duración', consent: false, targetId: task.id })).data.proposal
  const stale = await generate()
  store.updateTask(task.id, { title: 'Edición ajena' })
  assert.equal((await request(`/chat/task-proposal/${stale.id}/approve`, stale.task)).status, 409)
  const proposal = await generate()
  const changes = { ...proposal.task, title: 'Después', estimatedMinutes: 40 }
  const first = await request(`/chat/task-proposal/${proposal.id}/approve`, changes)
  assert.equal(first.status, 200)
  assert.equal(first.data.task.done, true)
  assert.equal(first.data.task.dueAt, task.dueAt)
  const second = await request(`/chat/task-proposal/${proposal.id}/approve`, changes)
  assert.equal(second.data.task.version, first.data.task.version)
  assert.equal(store.listTasks().length, 1)
})
