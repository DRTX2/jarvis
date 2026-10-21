import express from 'express'
import { createApp } from '../../server/app.mjs'

// Solo se ejecuta en Playwright. Nunca abre archivos ni usa claves externas.
const { app, store } = createApp({
  databasePath: ':memory:', provider: 'demo', externalAIEnabled: false,
  clock: () => new Date('2026-10-09T15:00:00.000Z'),
})
const harness = express()
harness.use(express.json({ limit: '64kb' }))
harness.post('/api/__test/sourced-proposal', (req, res) => {
  const excerpts = store.sourceExcerpts([req.body.knowledgeId])
  const material = { topic: 'Redes', question: '¿Cómo aplicarías la entrega ordenada?', hint: 'Compara los requisitos.', answer: 'TCP entrega datos ordenados; compara esta garantía con lo que requiere tu aplicación.', checkpoints: ['Justificar el requisito de orden.'] }
  res.json({ proposal: { material, cardId: null, expectedRevision: 0, ...store.createSourcedProposal(null, 0, excerpts, [{ sourceId: excerpts[0].id, quote: excerpts[0].excerpt.slice(0, 1000) }]) } })
})
harness.post('/api/__test/reset', (_req, res) => {
  const tables = ['goals', 'goal_tasks', 'sourced_proposals', 'knowledge', 'memory_proposals', 'memories', 'study_sessions', 'task_proposals', 'learning_cards', 'learning_versions', 'learning_feedback', 'tasks', 'task_completions', 'daily_plans', 'daily_reviews', 'messages', 'reviews', 'attempts', 'ai_requests']
  store.db.exec('BEGIN')
  try {
    for (const table of tables) store.db.exec(`DELETE FROM ${table}`)
    store.db.exec("UPDATE profile SET name = '', goal = '', tone = 'cercano'; COMMIT;")
    res.json({ ok: true })
  } catch (error) { store.db.exec('ROLLBACK'); throw error }
})
harness.use(app)
const port = Number(process.env.PORT ?? 3101)
const server = harness.listen(port, '127.0.0.1', () => console.log(`Jarvis pruebas: ${port}, SQLite en memoria`))
function stop() {
  server.close(() => { store.close(); process.exit(0) })
  server.closeAllConnections()
}
process.on('SIGTERM', stop)
process.on('SIGINT', stop)
