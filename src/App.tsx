import { useState } from 'react'
import { BarChart3, BookOpen, CircleHelp, Compass, MessageCircle, ShieldCheck, UserRound, X } from 'lucide-react'
import { useJarvis } from './useJarvis'
import type { Page } from './types'
import { Today } from './components/Today'
import { StudyView } from './components/Study'
import { ChatView } from './components/Chat'
import { ProfileView } from './components/Profile'
import { ProgressView } from './components/Progress'
import { DayPicker } from './components/DayPicker'

const navigation = [
  { id: 'today', label: 'Hoy', icon: Compass }, { id: 'study', label: 'Estudiar', icon: BookOpen },
  { id: 'chat', label: 'Conversar', icon: MessageCircle }, { id: 'progress', label: 'Mi semana', icon: BarChart3 },
  { id: 'profile', label: 'Mi perfil', icon: UserRound },
] as const

export default function App() {
  const jarvis = useJarvis()
  const [page, setPage] = useState<Page>('today')
  return <div className="app-shell"><a className="skip-link" href="#main">Saltar al contenido</a><aside className="sidebar"><a className="brand" href="#main" onClick={() => setPage('today')} aria-label="Jarvis, inicio"><span className="brand-symbol" aria-hidden="true"><span /></span><span>jarvis<small>Tu espacio personal</small></span></a><nav aria-label="Navegación principal">{navigation.map(({ id, label, icon: Icon }) => <button key={id} className={page === id ? 'nav-item active' : 'nav-item'} aria-label={label} title={label} aria-current={page === id ? 'page' : undefined} onClick={() => setPage(id)}><Icon size={19} /><span>{label}</span>{page === id && <span className="nav-indicator" />}</button>)}</nav><div className="sidebar-bottom"><div className="local-status"><ShieldCheck size={17} /><span>{jarvis.data.health.provider === 'claude' ? 'IA en la nube (Claude)' : jarvis.data.health.provider === 'ollama' ? 'IA privada en tu equipo' : jarvis.data.health.externalAIEnabled ? 'IA externa autorizable' : 'Un comienzo local'}</span></div><p>Organizar. Aprender.<br />Volver a intentarlo.</p><span className="version">Jarvis v0.2</span></div></aside>
    <div className="workspace"><header className="topbar"><span className="breadcrumb">Mi espacio <span>/</span> {navigation.find((item) => item.id === page)?.label}</span><div className="topbar-right"><span className="engine-badge"><span />{jarvis.data.health.provider === 'claude' ? `Nube · ${jarvis.data.health.model}` : jarvis.data.health.provider === 'ollama' ? `IA local · ${jarvis.data.health.model}${jarvis.data.health.cloud ? ' + nube' : ''}` : jarvis.data.health.externalAIEnabled ? 'Gemini' : 'Modo demo'}</span><button className="avatar" onClick={() => setPage('profile')} aria-label="Abrir mi perfil">{jarvis.data.profile.name.slice(0, 1).toUpperCase() || <UserRound size={17} />}</button></div></header>
    <main id="main" className="main-content" tabIndex={-1}>{jarvis.error && <div className="error-banner" role="alert"><CircleHelp size={18} /><p>{jarvis.error}</p><button className="text-button" disabled={jarvis.busy} onClick={() => void jarvis.retry()}>Reintentar</button><button className="icon-button" onClick={jarvis.dismissError} aria-label="Cerrar aviso"><X size={16} /></button></div>}
      {jarvis.data.reminders.length > 0 && <section className="reminder-banner" aria-label="Avisos pendientes"><h2>Un pendiente que querías recordar</h2>{jarvis.data.reminders.map((task) => <div key={task.id}><p>{task.title}</p><button className="button outline small" disabled={jarvis.busy} onClick={() => void jarvis.acknowledge(task.id)}>Visto</button></div>)}</section>}
      {jarvis.loading ? <div className="loading-state" role="status"><span className="brand-symbol" aria-hidden="true"><span /></span><p>Preparando tu espacio…</p></div> : !jarvis.ready ? <section aria-label="Datos sin cargar"><h2>No se pudo cargar tu espacio.</h2><p>Reintenta la conexión o elige otra fecha. No mostramos registros de otro día.</p><DayPicker jarvis={jarvis} /></section> : <>{page === 'today' && <Today jarvis={jarvis} navigate={setPage} />}{page === 'study' && <StudyView jarvis={jarvis} />}{page === 'chat' && <ChatView jarvis={jarvis} />}{page === 'progress' && <ProgressView jarvis={jarvis} navigate={setPage} />}{page === 'profile' && <ProfileView jarvis={jarvis} />}</>}
    </main><footer className="workspace-footer"><span>Hecho para avanzar a tu ritmo.</span><span>Datos locales · Sin analítica</span></footer></div>
  </div>
}
