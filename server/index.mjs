import { createApp } from './app.mjs'
import { desktopNotifier, pushNotifier, startReminders } from './reminders.mjs'

process.umask(0o077)
const notifiers = []
const { app, store } = createApp({
  notifiers,
  databasePath: process.env.DATABASE_PATH,
  provider: process.env.AI_PROVIDER ?? 'ollama',
  ollamaUrl: process.env.OLLAMA_URL,
  ollamaModel: process.env.OLLAMA_MODEL,
  anthropicApiKey: process.env.ANTHROPIC_API_KEY,
  claudeModel: process.env.CLAUDE_MODEL,
  allowedHosts: process.env.JARVIS_ALLOWED_HOSTS?.split(',').map((host) => host.trim()).filter(Boolean),
  externalAIEnabled: process.env.EXTERNAL_AI_ENABLED === 'true',
  termsAccepted: process.env.EXTERNAL_AI_TERMS_ACCEPTED === 'true',
  apiKey: process.env.GEMINI_API_KEY,
  model: process.env.GEMINI_MODEL,
  maxDailyRequests: process.env.AI_MAX_DAILY_REQUESTS,
})
// Avisos con la app cerrada: escritorio (notify-send) y push a los navegadores suscritos, cada 30 s.
notifiers.push(desktopNotifier(), pushNotifier(store))
const stopReminders = startReminders(store, notifiers)
const port = Number(process.env.PORT ?? 3001)
const server = app.listen(port, '127.0.0.1', () => {
  console.log(`Jarvis API: http://127.0.0.1:${port} · base privada local`)
})
function shutdown() {
  stopReminders()
  server.close(() => { store.close(); process.exit(0) })
  server.closeAllConnections()
}
process.on('SIGTERM', shutdown)
process.on('SIGINT', shutdown)
