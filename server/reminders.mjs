import { execFile } from 'node:child_process'
import webpush from 'web-push'

const DAY = 86_400_000
export const repeats = ['daily', 'weekdays', 'weekly']

// Siguiente aviso de una tarea repetida, siempre en el futuro respecto a `now`.
// shortcut: suma días de 24 h y usa la zona del equipo para saltar fines de semana; un cambio de horario desplaza 1 h hasta que se edite el aviso.
export function nextOccurrence(dueAt, repeat, now) {
  let next = Date.parse(dueAt)
  const step = repeat === 'weekly' ? 7 * DAY : DAY
  do {
    next += step
    while (repeat === 'weekdays' && [0, 6].includes(new Date(next).getDay())) next += DAY
  } while (next <= now.getTime())
  return new Date(next).toISOString()
}

export function createReminderStore(db, { getTask, clock }) {
  const setting = (key) => db.prepare('SELECT value FROM settings WHERE key = ?').get(key)?.value ?? null
  const setSetting = (key, value) => db.prepare('INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value').run(key, value)
  const fresh = (id, dueAt) => db.prepare('UPDATE tasks SET due_at = ?, acknowledged_at = NULL, notified_at = NULL, snoozed_until = NULL, version = version + 1 WHERE id = ?').run(dueAt, id)
  return {
    setting, setSetting,
    acknowledgeReminder(id) {
      const task = getTask(id)
      if (!task) return false
      // Una tarea repetida no se apaga: «Visto» la pasa a su siguiente aviso.
      if (task.repeat && task.dueAt) fresh(id, nextOccurrence(task.dueAt, task.repeat, clock()))
      else db.prepare('UPDATE tasks SET acknowledged_at = COALESCE(acknowledged_at, ?) WHERE id = ?').run(clock().toISOString(), id)
      return true
    },
    snoozeReminder(id, minutes) {
      if (!getTask(id)) return null
      const until = new Date(clock().getTime() + minutes * 60_000).toISOString()
      db.prepare('UPDATE tasks SET snoozed_until = ?, acknowledged_at = NULL, notified_at = NULL WHERE id = ?').run(until, id)
      return getTask(id)
    },
    // Avisos vencidos que aún no salieron por escritorio ni push.
    unsentReminders(now = clock()) {
      return db.prepare(`SELECT id FROM tasks WHERE done = 0 AND acknowledged_at IS NULL AND notified_at IS NULL
        AND COALESCE(snoozed_until, due_at) <= ? ORDER BY COALESCE(snoozed_until, due_at)`).all(now.toISOString()).map((row) => getTask(row.id))
    },
    markNotified(ids) {
      const update = db.prepare('UPDATE tasks SET notified_at = ? WHERE id = ?')
      for (const id of ids) update.run(clock().toISOString(), id)
    },
    pushSubscriptions: () => db.prepare('SELECT subscription_json FROM push_subscriptions').all().map((row) => JSON.parse(row.subscription_json)),
    savePushSubscription(subscription) {
      db.prepare(`INSERT INTO push_subscriptions (endpoint, subscription_json, created_at) VALUES (?, ?, ?)
        ON CONFLICT(endpoint) DO UPDATE SET subscription_json = excluded.subscription_json`).run(subscription.endpoint, JSON.stringify(subscription), clock().toISOString())
    },
    deletePushSubscription: (endpoint) => db.prepare('DELETE FROM push_subscriptions WHERE endpoint = ?').run(endpoint).changes > 0,
    // Claves VAPID propias de esta instalación: se crean una vez y no salen del equipo (solo la pública).
    vapidKeys() {
      const saved = setting('vapid')
      if (saved) return JSON.parse(saved)
      const keys = webpush.generateVAPIDKeys()
      setSetting('vapid', JSON.stringify(keys))
      return keys
    },
  }
}

const readable = (value) => new Intl.DateTimeFormat('es', { weekday: 'short', hour: '2-digit', minute: '2-digit' }).format(new Date(value))

// Mensajes de aviso: uno por tarea; si se acumulan (equipo apagado), uno solo con el resumen.
export function reminderMessages(tasks, dueReviews = 0) {
  const messages = tasks.length > 3
    ? [{ title: `Tienes ${tasks.length} avisos pendientes`, body: tasks.map((task) => task.title).join(' · ').slice(0, 300), tag: 'jarvis-resumen' }]
    : tasks.map((task) => ({ title: task.title, body: `Aviso de ${readable(task.snoozedUntil ?? task.dueAt)}${task.repeat ? ' · se repite' : ''}`, tag: `task-${task.id}`, taskId: task.id }))
  if (dueReviews) messages.push({ title: `${dueReviews} ${dueReviews === 1 ? 'pregunta lista' : 'preguntas listas'} para repasar`, body: 'Repasar justo antes de olvidar es lo que fija el recuerdo. Te toma unos minutos.', tag: 'jarvis-repasos', url: '/?page=study' })
  return messages
}

export function desktopNotifier(run = execFile) {
  // shortcut: notify-send cubre Linux; macOS y Windows reciben los avisos por push del navegador.
  return (message) => new Promise((resolve) => {
    if (process.platform !== 'linux') return resolve(false)
    run('notify-send', ['--app-name=Jarvis', '--urgency=normal', '--icon=appointment-soon', message.title, message.body], { timeout: 5000 }, (error) => resolve(!error))
  })
}

export function pushNotifier(store, send = webpush.sendNotification.bind(webpush)) {
  return async (message) => {
    const { publicKey, privateKey } = store.vapidKeys()
    let delivered = false
    for (const subscription of store.pushSubscriptions()) {
      try {
        // El contenido va cifrado de extremo a extremo (RFC 8291): el servicio push del navegador no puede leerlo.
        await send(subscription, JSON.stringify(message), { vapidDetails: { subject: 'mailto:jarvis@localhost', publicKey, privateKey }, TTL: 4 * 3600, urgency: 'high' })
        delivered = true
      } catch (error) {
        // 404/410: el navegador anuló la suscripción; se borra para no reintentar para siempre.
        if ([404, 410].includes(error.statusCode)) store.deletePushSubscription(subscription.endpoint)
      }
    }
    return delivered
  }
}

// Repasos: como mucho un aviso al día, desde las 9:00 hora del equipo.
function dueReviewCount(store, now) {
  const today = now.toLocaleDateString('sv')
  if (now.getHours() < 9 || store.setting('reviews-notified') === today) return 0
  const count = store.study().cards.filter((card) => card.nextReviewAt && Date.parse(card.nextReviewAt) <= now.getTime()).length
  if (count) store.setSetting('reviews-notified', today)
  return count
}

export async function checkReminders(store, notifiers, clock = () => new Date()) {
  const now = clock()
  const tasks = store.unsentReminders(now)
  const messages = reminderMessages(tasks, dueReviewCount(store, now))
  if (!messages.length) return []
  // Se marca antes de enviar: un fallo de red no debe repetir el aviso cada 30 s; el aviso sigue visible dentro de la app.
  store.markNotified(tasks.map((task) => task.id))
  for (const message of messages) await Promise.all(notifiers.map((notify) => notify(message).catch(() => false)))
  return messages
}

export function startReminders(store, notifiers, clock, interval = 30_000) {
  let running = false
  const tick = async () => {
    if (running) return
    running = true
    try { await checkReminders(store, notifiers, clock) } catch (error) { console.error('Avisos:', error.message) } finally { running = false }
  }
  void tick()
  const timer = setInterval(tick, interval)
  timer.unref()
  return () => clearInterval(timer)
}
