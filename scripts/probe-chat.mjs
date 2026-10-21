// Prueba la IA real con mensajes de chat. Úsalo contra un servidor temporal, nunca contra tus datos:
//   PORT=3201 DATABASE_PATH=/tmp/jarvis-prueba.sqlite npm start
//   node scripts/probe-chat.mjs "recuérdame llamar a mamá el viernes a las 7pm" "ya terminé eso"
const base = process.env.JARVIS_API ?? 'http://127.0.0.1:3201/api'
for (const message of process.argv.slice(2)) {
  const start = Date.now()
  const response = await fetch(`${base}/chat`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ message, timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone }) })
  const json = await response.json()
  console.log(`=== ${message} (${((Date.now() - start) / 1000).toFixed(1)} s)\n${json.reply?.content ?? json.error}`)
  console.log(`tareas: ${JSON.stringify(json.proposals?.tasks?.map((p) => [p.action, p.task.title, p.task.dueAt]) ?? [])} · recuerdos: ${json.proposals?.memories?.length ?? 0}\n`)
}
