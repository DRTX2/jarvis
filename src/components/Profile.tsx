import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import { Check, Download, Headphones, Languages, LockKeyhole, Mic, Dumbbell } from 'lucide-react'
import type { Profile } from '../types'
import type { Jarvis } from '../useJarvis'
import { Memories } from './Memories'
import { SetupStatus } from './SetupStatus'

export function ProfileView({ jarvis }: { jarvis: Jarvis }) {
  const { data, busy } = jarvis
  const [profile, setProfile] = useState<Profile>(data.profile)
  const [saved, setSaved] = useState(false)
  useEffect(() => { setProfile(data.profile) }, [data.profile])
  const change = (update: Partial<Profile>) => { setProfile({ ...profile, ...update }); setSaved(false) }
  async function save(event: FormEvent) { event.preventDefault(); if (await jarvis.saveProfile(profile)) setSaved(true) }
  return <>
    <SetupStatus jarvis={jarvis} />
    <Memories jarvis={jarvis} />
    <div className="page-heading"><div><p className="date-label">Tú decides</p><h1>Un asistente a tu medida.</h1><p>Empieza con lo necesario. Tus preferencias siempre se pueden cambiar.</p></div></div>
    <div className="profile-grid"><form className="profile-form" onSubmit={save}><h2>Mi perfil</h2><label>¿Cómo te llamo?<input value={profile.name} maxLength={60} onChange={(e) => change({ name: e.target.value })} placeholder="Tu nombre o apodo" /></label><label>Mi objetivo de esta semana<textarea value={profile.goal} maxLength={300} rows={3} onChange={(e) => change({ goal: e.target.value })} placeholder="Un resultado concreto y alcanzable" /></label><label>Tono preferido<select value={profile.tone} onChange={(e) => change({ tone: e.target.value as Profile['tone'] })}><option value="cercano">Cercano y con humor</option><option value="directo">Directo y práctico</option><option value="tranquilo">Tranquilo y paciente</option></select></label><p className="field-note">Se guarda como preferencia. Las respuestas demo siguen siendo predefinidas; no hay personalización avanzada todavía.</p><div className="form-actions">{saved && <span className="save-status" role="status"><Check size={16} /> Perfil guardado</span>}<button className="button primary" disabled={busy}>{busy ? 'Guardando…' : 'Guardar perfil'}</button></div></form>
      <section className="privacy-panel"><LockKeyhole size={23} /><h2>Privacidad, sin letra pequeña.</h2><p>Tu perfil, tareas, planes, cierres, intentos de estudio y chat se guardan en <code>data/jarvis.sqlite</code>. No hay cuentas externas ni analítica.</p><dl><div><dt>Motor de conversación</dt><dd>{{ ollama: 'IA local, sin salir del equipo', claude: 'Claude en la nube (Anthropic)', gemini: 'Gemini, con consentimiento por mensaje', demo: 'Demo local · sin IA' }[data.health.provider]}{data.health.cloud && data.health.provider === 'ollama' ? ' · nube solo en mensajes marcados' : ''}</dd></div><div><dt>Avisos</dt><dd>Dentro de la app abierta</dd></div><div><dt>Zona horaria del dispositivo</dt><dd>{Intl.DateTimeFormat().resolvedOptions().timeZone}</dd></div><div><dt>Solicitudes externas hoy</dt><dd>{data.health.dailyRequests} de {data.health.maxDailyRequests} (día UTC)</dd></div></dl><button className="button outline" disabled={busy} onClick={() => void jarvis.exportData()}><Download size={16} /> Exportar mis datos</button><p className="field-note">La exportación incluye información personal. Guárdala en un lugar privado. Eliminar una tarea no borra su título de planes o finalizaciones históricas. El borrado de chat está en Conversar; todavía no hay borrado global desde la interfaz.</p></section>
    </div>
    <section className="roadmap-section"><div className="section-heading"><h2>Más adelante, sin perder el foco.</h2><span className="muted">En el plan, aún no implementado</span></div><div className="roadmap-list">{[{ icon: Languages, title: 'Inglés', detail: 'Conversación, correcciones y vocabulario.' }, { icon: Dumbbell, title: 'Entrenamiento', detail: 'Rutinas, registro y recuperación.' }, { icon: Mic, title: 'Voz manos libres', detail: 'Conversación continua y dictado local.' }, { icon: Headphones, title: 'Integraciones', detail: 'Calendario y material de estudio propio.' }].map(({ icon: Icon, title, detail }) => <div key={title}><Icon size={20} /><h3>{title}</h3><p>{detail}</p></div>)}</div></section>
  </>
}
