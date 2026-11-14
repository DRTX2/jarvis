// Evaluación de acciones con la IA real: ¿hace Jarvis lo que se le pide, y nada más?
// Uso: con Ollama encendido, `npm run eval` (o `node tests/eval/run.mjs "texto"` para filtrar casos).
// Cada caso usa una base en memoria nueva: no toca tus datos. Guarda el informe en docs/eval/.
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs'
import { createApp } from '../../server/app.mjs'
import { localTime } from '../../server/assistant.mjs'

const timeZone = 'America/Bogota'
const clock = () => new Date('2026-11-16T14:00:00.000Z')
const { casos } = JSON.parse(readFileSync(new URL('./acciones.json', import.meta.url)))
const filter = process.argv[2]?.toLowerCase()
const names = { created: 'crear', completed: 'completar', reopened: 'reabrir', delete: 'borrar', edit: 'editar' }

async function run(caso) {
  const { app, store } = createApp({ databasePath: ':memory:', provider: 'ollama', clock, ollamaUrl: process.env.OLLAMA_URL, ollamaModel: process.env.OLLAMA_MODEL })
  store.createTask({ title: 'Llamar a mamá', category: 'personal', priority: 'normal', dueAt: '2026-11-17T00:00:00.000Z' })
  store.createTask({ title: 'Entregar informe de redes', category: 'study', priority: 'high', dueAt: '2026-11-18T22:00:00.000Z' })
  store.updateTask(store.createTask({ title: 'Comprar pan', category: 'personal', priority: 'low', dueAt: null }).id, { done: true })
  const server = await new Promise((resolve) => { const instance = app.listen(0, '127.0.0.1', () => resolve(instance)) })
  const start = Date.now()
  try {
    const response = await fetch(`http://127.0.0.1:${server.address().port}/api/chat`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ message: caso.mensaje, timeZone }) })
    const data = await response.json()
    if (!response.ok) return { ...caso, ok: false, motivo: `error: ${data.error}`, segundos: (Date.now() - start) / 1000 }
    const hechas = [
      ...(data.applied ?? []).map((item) => ({ accion: names[item.action], tarea: item.task.id, dueAt: item.task.dueAt, repetir: item.task.repeat })),
      ...(data.proposals?.tasks ?? []).map((item) => ({ accion: names[item.action], tarea: item.target?.id, dueAt: item.task.dueAt })),
      ...(data.proposals?.memories ?? []).map(() => ({ accion: 'recordar' })),
    ]
    const motivo = check(caso, hechas)
    return { ...caso, ok: !motivo, motivo, hechas: hechas.map((item) => `${item.accion}${item.tarea ? `#${item.tarea}` : ''}${item.dueAt ? ` ${localTime(item.dueAt, timeZone)}` : ''}${item.repetir ? ` ${item.repetir}` : ''}`), respuesta: data.reply.content.slice(0, 160), segundos: (Date.now() - start) / 1000 }
  } finally {
    await new Promise((resolve) => { server.close(resolve); server.closeAllConnections() })
    store.close()
  }
}

function check(caso, hechas) {
  if (caso.accion === 'ninguna') return hechas.length ? `hizo ${hechas.map((item) => item.accion).join(', ')} sin que se pidiera` : null
  if (!hechas.length) return 'no hizo nada'
  const extra = hechas.filter((item) => item.accion !== caso.accion)
  if (extra.length) return `hizo además/en su lugar: ${extra.map((item) => item.accion).join(', ')}`
  const hecha = hechas.find((item) => !caso.tarea || item.tarea === caso.tarea)
  if (!hecha) return `actuó sobre otra tarea (#${hechas[0].tarea})`
  const local = hecha.dueAt ? localTime(hecha.dueAt, timeZone) : null
  if (caso.fecha && local?.slice(0, 10) !== caso.fecha) return `fecha ${local?.slice(0, 10) ?? 'ninguna'} en vez de ${caso.fecha}`
  if (caso.hora && local?.slice(11, 16) !== caso.hora) return `hora ${local?.slice(11, 16) ?? 'ninguna'} en vez de ${caso.hora}`
  if (caso.repetir && hecha.repetir !== caso.repetir) return `repetición ${hecha.repetir ?? 'ninguna'} en vez de ${caso.repetir}`
  return null
}

const results = []
for (const caso of casos.filter((item) => !filter || item.mensaje.toLowerCase().includes(filter))) {
  const result = await run(caso)
  results.push(result)
  console.log(`${result.ok ? '✔' : '✘'} ${result.segundos.toFixed(1)} s · ${caso.accion.padEnd(9)} · ${caso.mensaje}${result.ok ? '' : `  → ${result.motivo}`}`)
}
const pct = (list) => list.length ? Math.round(list.filter((item) => item.ok).length / list.length * 100) : 0
const byAction = [...new Set(results.map((item) => item.accion))].map((accion) => { const list = results.filter((item) => item.accion === accion); return `| ${accion} | ${list.filter((item) => item.ok).length}/${list.length} | ${pct(list)} % |` })
const model = process.env.OLLAMA_MODEL ?? 'qwen3.5:9b'
const day = new Date().toISOString().slice(0, 10)
const report = `# Evaluación de acciones · ${day}

Modelo: \`${model}\` (Ollama). Casos: ${results.length}. **Aciertos: ${results.filter((item) => item.ok).length}/${results.length} (${pct(results)} %).** Tiempo medio: ${(results.reduce((total, item) => total + item.segundos, 0) / results.length).toFixed(1)} s por mensaje.

Un caso acierta solo si Jarvis hace la acción pedida, sobre la tarea correcta, con fecha, hora y repetición correctas, y nada más. En «ninguna», cualquier acción es un fallo.

| Acción esperada | Aciertos | % |
|---|---|---|
${byAction.join('\n')}

## Fallos
${results.filter((item) => !item.ok).map((item) => `- **${item.mensaje}** (esperado: ${item.accion}) → ${item.motivo}${item.hechas?.length ? ` · hizo: ${item.hechas.join('; ')}` : ''}`).join('\n') || 'Ninguno.'}
`
console.log(`\n${results.filter((item) => item.ok).length}/${results.length} (${pct(results)} %)`)
if (!filter) {
  mkdirSync(new URL('../../docs/eval/', import.meta.url), { recursive: true })
  writeFileSync(new URL(`../../docs/eval/${day}-${model.replace(/[^\w.-]/g, '_')}.md`, import.meta.url), report)
  writeFileSync(new URL(`../../docs/eval/${day}-${model.replace(/[^\w.-]/g, '_')}.json`, import.meta.url), JSON.stringify(results, null, 2))
}
