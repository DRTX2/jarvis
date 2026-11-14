// Service worker de Jarvis: solo muestra avisos push y atiende sus botones. No guarda caché ni intercepta peticiones.
self.addEventListener('push', (event) => {
  const data = event.data ? event.data.json() : { title: 'Jarvis', body: '' }
  const actions = data.taskId ? [{ action: 'done', title: 'Hecho' }, { action: 'snooze', title: 'En 10 min' }] : []
  event.waitUntil(self.registration.showNotification(data.title, {
    body: data.body, tag: data.tag, icon: '/icon.svg', badge: '/icon.svg', data, actions,
    // Un recordatorio se queda visible hasta que respondas; un resumen se cierra solo.
    requireInteraction: Boolean(data.taskId),
  }))
})

self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  const { taskId } = event.notification.data ?? {}
  const send = (method, path, body) => fetch(path, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
  if (taskId && event.action === 'done') return event.waitUntil(send('PATCH', `/api/tasks/${taskId}`, { done: true }))
  if (taskId && event.action === 'snooze') return event.waitUntil(send('POST', `/api/reminders/${taskId}/snooze`, { minutes: 10 }))
  event.waitUntil(self.clients.matchAll({ type: 'window', includeUncontrolled: true })
    .then((windows) => windows[0] ? windows[0].focus() : self.clients.openWindow('/')))
})
