import { useEffect, useState } from 'react'
import { Bell, BellOff } from 'lucide-react'
import type { Jarvis } from '../useJarvis'

type State = 'loading' | 'on' | 'off' | 'denied' | 'unsupported'
const supported = 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window
const subscription = () => navigator.serviceWorker.getRegistration('/').then((registration) => registration?.pushManager.getSubscription() ?? null)
// La clave pública VAPID viaja en base64url; el navegador la pide en bytes.
const bytes = (base64: string) => Uint8Array.from(atob(base64.replace(/-/g, '+').replace(/_/g, '/') + '='.repeat((4 - base64.length % 4) % 4)), (char) => char.charCodeAt(0))

export function Notifications({ jarvis, compact = false }: { jarvis: Jarvis; compact?: boolean }) {
  const [state, setState] = useState<State>(supported ? 'loading' : 'unsupported')
  const [note, setNote] = useState('')
  const [working, setWorking] = useState(false)
  useEffect(() => {
    if (!supported) return
    subscription().then((current) => setState(current ? 'on' : Notification.permission === 'denied' ? 'denied' : 'off'), () => setState('off'))
  }, [])
  async function enable() {
    setWorking(true); setNote('')
    try {
      if (await Notification.requestPermission() !== 'granted') { setState('denied'); return }
      const registration = await navigator.serviceWorker.register('/sw.js', { scope: '/' })
      await navigator.serviceWorker.ready
      const { publicKey } = await jarvis.pushKey()
      const current = await registration.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: bytes(publicKey) })
      if (await jarvis.savePush(current.toJSON())) { setState('on'); setNote('Listo: este dispositivo recibirá tus recordatorios.') }
    } catch {
      setNote('El navegador no pudo registrar los avisos. En Brave, activa «Usar los servicios de Google para la mensajería push» en Configuración → Privacidad. En este PC con Linux los avisos del sistema funcionan igual mientras Jarvis esté encendido.')
    } finally { setWorking(false) }
  }
  async function disable() {
    setWorking(true)
    const current = await subscription()
    if (current) { await jarvis.deletePush(current.endpoint); await current.unsubscribe() }
    setState('off'); setNote(''); setWorking(false)
  }
  async function test() {
    setWorking(true)
    const delivered = await jarvis.testPush()
    setNote(delivered === null ? '' : delivered ? 'Aviso de prueba enviado. Si no aparece, revisa el modo «No molestar» del sistema.' : 'No se pudo entregar el aviso de prueba. Revisa que Jarvis siga encendido.')
    setWorking(false)
  }
  if (compact && state !== 'off') return null
  return <section className={compact ? 'notice-strip' : 'device-panel'} aria-label="Avisos en este dispositivo">
    <div className="section-heading"><h2><Bell size={16} /> Avisos en este dispositivo</h2></div>
    {state === 'unsupported' && <p className="field-note">Este navegador no admite avisos push. En el PC con Linux recibirás igualmente las notificaciones del sistema.</p>}
    {state === 'denied' && <p className="field-note">Bloqueaste las notificaciones para Jarvis. Permítelas desde el candado de la barra de direcciones y vuelve aquí.</p>}
    {state === 'off' && <><p className="field-note">Activa los avisos para que tus recordatorios suenen aunque la app esté cerrada, también en el móvil.</p><button className="button primary small" disabled={working} onClick={() => void enable()}><Bell size={15} /> Activar avisos</button></>}
    {state === 'on' && <><p className="field-note">Activados. Desde el aviso puedes marcar «Hecho» o posponerlo 10 minutos.</p><div className="form-actions"><button className="button outline small" disabled={working} onClick={() => void test()}>Enviar aviso de prueba</button><button className="button subtle small" disabled={working} onClick={() => void disable()}><BellOff size={15} /> Desactivar aquí</button></div></>}
    {note && <p className="field-note" role="status">{note}</p>}
    {!compact && <p className="field-note">El texto del aviso viaja cifrado: el servicio push de tu navegador (Google o Mozilla) lo entrega sin poder leerlo. Para que suenen, Jarvis tiene que estar encendido en tu PC.</p>}
  </section>
}
