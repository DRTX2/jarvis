import { useState } from 'react'
import type { FormEvent } from 'react'
import { ArrowUpRight, BookOpen, CalendarClock, Check, Pencil, Plus, Repeat2, Trash2, X } from 'lucide-react'
import type { Jarvis } from '../useJarvis'
import type { Category, Page, Priority, Repeat, Task, TaskInput } from '../types'
import { dayLabel, isDue, localDay, readableDate } from '../api'
import { DailyPlanner } from './DailyPlanner'
import { DailyReviewPanel } from './DailyReview'
import { useDraft } from '../useDraft'
import { exactLocalDate, localDateTime } from '../dates'
import { QuickCapture } from './QuickCapture'
import { Goals } from './Goals'
import { Notifications } from './Notifications'
import { Briefing } from './Briefing'

const categories = { personal: 'Personal', study: 'Estudio', work: 'Trabajo' }
const priorities = { high: 'Alta', normal: 'Normal', low: 'Baja' }
export const repeatLabels: Record<Repeat, string> = { daily: 'Cada día', weekdays: 'Entre semana', weekly: 'Cada semana' }

function localDate(value: string | null) {
  return localDateTime(value)
}

function TaskEditor({ task, busy, save, cancel }: {
  task?: Task; busy: boolean; save: (input: TaskInput, id?: number, expectedVersion?: number) => Promise<boolean>; cancel: () => void
}) {
  const draft = useDraft(`task-${task ? `${task.id}-${task.version}` : 'new'}`, { title: task?.title ?? '', category: task?.category ?? 'personal', priority: task?.priority ?? 'normal', due: localDate(task?.dueAt ?? null), estimatedMinutes: String(task?.estimatedMinutes ?? 25), repeat: task?.repeat ?? '' })
  const { title, category, priority, due, estimatedMinutes, repeat } = draft.value
  const setTitle = (title: string) => draft.change({ ...draft.value, title })
  const setCategory = (category: Category) => draft.change({ ...draft.value, category })
  const setPriority = (priority: Priority) => draft.change({ ...draft.value, priority })
  const setDue = (due: string) => draft.change({ ...draft.value, due })
  const setEstimatedMinutes = (estimatedMinutes: string) => draft.change({ ...draft.value, estimatedMinutes })
  const setRepeat = (repeat: string) => draft.change({ ...draft.value, repeat })
  const [dateError, setDateError] = useState('')
  async function submit(event: FormEvent) {
    event.preventDefault()
    try {
      setDateError('')
      const dueAt = due === localDate(task?.dueAt ?? null) ? task?.dueAt ?? null : exactLocalDate(due)
      const success = await save({ title: title.trim(), category, priority, estimatedMinutes: Number(estimatedMinutes), dueAt, repeat: dueAt && repeat ? repeat as Repeat : null }, task?.id, task?.version)
      if (success) { draft.clear(); cancel() }
    } catch (error) { setDateError((error as Error).message) }
  }
  return <form className="task-editor" onSubmit={submit} aria-label={task ? 'Editar pendiente' : 'Nuevo pendiente'}>
    <div className="section-heading"><h3>{task ? 'Ajusta tu pendiente' : 'Un primer paso concreto'}</h3><button className="icon-button" type="button" onClick={cancel} aria-label="Cerrar formulario"><X size={18} /></button></div>
    <label>¿Qué quieres hacer?<input autoFocus required maxLength={200} value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Por ejemplo, practicar redes durante 20 minutos" /></label>
    <div className="form-grid">
      <label>Área<select value={category} onChange={(e) => setCategory(e.target.value as Category)}>{Object.entries(categories).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
      <label>Prioridad<select value={priority} onChange={(e) => setPriority(e.target.value as Priority)}>{Object.entries(priorities).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
    </div>
    <label>Duración estimada (minutos)<input type="number" min={5} max={240} step={1} required value={estimatedMinutes} onChange={(event) => setEstimatedMinutes(event.target.value)} /></label>
    <p className="field-note">Una estimación editable, no tiempo medido. Si supera cuatro horas, divídela en pasos más pequeños.</p>
    <div className="form-grid">
      <label>Aviso (opcional)<input type="datetime-local" value={due} onChange={(e) => setDue(e.target.value)} /></label>
      <label>Repetir<select aria-label="Repetir" value={due ? repeat : ''} disabled={!due} onChange={(e) => setRepeat(e.target.value)}><option value="">No se repite</option>{Object.entries(repeatLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
    </div>
    <p className="field-note">Zona horaria: {Intl.DateTimeFormat().resolvedOptions().timeZone}. El aviso suena en este PC y en los dispositivos donde actives los avisos. {draft.warning}</p>{dateError && <p role="alert">{dateError}</p>}
    <button type="button" className="button subtle" disabled={busy} onClick={() => { draft.clear(); cancel() }}>Descartar borrador del pendiente</button>
    <div className="form-actions"><button type="button" className="button subtle" onClick={cancel}>Cancelar</button><button className="button primary" disabled={busy || !title.trim()}>{busy ? 'Guardando…' : task ? 'Guardar cambios' : 'Guardar pendiente'}</button></div>
  </form>
}

function TaskRow({ task, jarvis, edit }: { task: Task; jarvis: Jarvis; edit: () => void }) {
  const [confirm, setConfirm] = useState(false)
  return <li className={`task-row ${task.done ? 'is-done' : ''}`}>
    <label className="task-check"><input type="checkbox" checked={task.done} disabled={jarvis.busy} onChange={() => void jarvis.toggleTask(task)} aria-label={`${task.done ? 'Reabrir' : 'Completar'} ${task.title}`} /><span className="check-visual"><Check size={13} /></span></label>
    <div className="task-content"><span className="task-title">{task.title}</span><div className="task-meta"><span>{categories[task.category]}</span><span>{task.estimatedMinutes} min estimados</span>{task.priority === 'high' && <span className="priority-dot">Prioridad alta</span>}{task.dueAt && <span><CalendarClock size={12} /> {readableDate(task.dueAt)}</span>}{task.repeat && <span><Repeat2 size={12} /> {repeatLabels[task.repeat]}</span>}</div></div>
    <div className="task-actions">{confirm ? <><button className="button danger small" disabled={jarvis.busy} onClick={() => void jarvis.deleteTask(task.id)}>Eliminar definitivamente</button><button className="icon-button" onClick={() => setConfirm(false)} aria-label="Cancelar eliminación"><X size={16} /></button></> : <><button className="icon-button" disabled={jarvis.busy} onClick={edit} aria-label={`Editar ${task.title}`}><Pencil size={16} /></button><button className="icon-button" disabled={jarvis.busy} onClick={() => setConfirm(true)} aria-label={`Eliminar ${task.title}`}><Trash2 size={16} /></button></>}</div>
  </li>
}

export function Today({ jarvis, navigate }: { jarvis: Jarvis; navigate: (page: Page) => void }) {
  const { data, busy } = jarvis
  const [editor, setEditor] = useState<Task | 'new' | null>(null)
  const pending = data.tasks.filter((task) => !task.done)
  const done = data.tasks.filter((task) => task.done)
  const focus = data.daily.plan
    ? data.daily.plan.blocks.flatMap((block) => block.kind === 'task' && block.task && !block.task.done ? [block.task] : [])
    : pending.slice(0, 3)
  const dueCards = data.study.cards.filter((card) => isDue(card.nextReviewAt)).length
  return <>
    <div className="page-heading"><div><p className="date-label">{dayLabel(jarvis.day, { weekday: 'long', day: 'numeric', month: 'long' })}</p><h1>{data.profile.name ? `${data.profile.name}, vamos paso a paso.` : 'Tu día, con intención.'}</h1><p>No necesitas hacerlo todo. Elige lo que importa y empieza pequeño.</p></div><button className="button primary" onClick={() => setEditor('new')} disabled={busy}><Plus size={17} /> Añadir pendiente</button></div>
    {jarvis.day === localDay() && <Briefing jarvis={jarvis} navigate={navigate} />}
    <div className="daily-summary" aria-label="Resumen de tu lista"><div><strong>{pending.length}</strong><span>Pendientes</span></div><div><strong>{done.length}</strong><span>Completados</span></div><div><strong>{dueCards}</strong><span>Preguntas por repasar</span></div><span className="summary-note">Tu ritmo, no una carrera.</span></div>
    <QuickCapture jarvis={jarvis} />
    <Notifications jarvis={jarvis} compact />
    <details className="library-tools"><summary>Mis objetivos y rutas de aprendizaje</summary><Goals jarvis={jarvis} practice={() => navigate('study')} /></details>
    <DailyPlanner jarvis={jarvis} />
    <div className="today-grid">
      <section className="task-section" aria-labelledby="tasks-title"><div className="section-heading"><h2 id="tasks-title">Tus pendientes</h2><span className="muted">Ordenados por prioridad</span></div>
        {jarvis.day !== localDay() && <p className="field-note">Esta lista muestra tus tareas actuales, no una reconstrucción de ese día.</p>}
        {editor && <TaskEditor key={editor === 'new' ? 'new' : `${editor.id}-${editor.version}`} task={editor === 'new' ? undefined : editor} busy={busy} save={jarvis.saveTask} cancel={() => setEditor(null)} />}
        {pending.length ? <ul className="task-list" aria-label="Pendientes">{pending.map((task) => <TaskRow key={task.id} task={task} jarvis={jarvis} edit={() => setEditor(task)} />)}</ul> : <div className="empty-state"><span className="empty-symbol"><Check size={25} /></span><h3>Espacio para lo importante.</h3><p>Añade un pendiente concreto. Después decidimos qué va primero.</p><button className="button outline" onClick={() => setEditor('new')}>Añadir primer pendiente</button></div>}
        {done.length > 0 && <details className="completed-tasks"><summary>Completados ({done.length})</summary><ul className="task-list" aria-label="Completados">{done.map((task) => <TaskRow key={task.id} task={task} jarvis={jarvis} edit={() => setEditor(task)} />)}</ul></details>}
      </section>
      <aside className="focus-column">
        <section className="focus-panel"><div className="section-heading"><h2>Tu enfoque</h2><span className="focus-mark" aria-hidden="true" /></div><p className="focus-goal">{data.profile.goal || '¿Qué te gustaría conseguir esta semana?'}</p>{!data.profile.goal && <button className="text-button" onClick={() => navigate('profile')}>Definir mi objetivo <ArrowUpRight size={15} /></button>}{focus.length > 0 && <><p className="muted focus-caption">Empieza por estas prioridades</p><ol className="focus-list">{focus.map((task) => <li key={task.id}>{task.title}</li>)}</ol></>}<p className="focus-footnote">Una sugerencia basada en tu lista, no una agenda modificada automáticamente.</p></section>
        <section className="study-invitation"><BookOpen size={23} /><h2>Aprender es recuperar.</h2><p>Una pregunta, tu explicación y una oportunidad de comprobar lo que recuerdas.</p><button className="button outline" onClick={() => navigate('study')}>Ir a estudiar <ArrowUpRight size={15} /></button><span className="field-note">Fundamentos web · 3 preguntas</span></section>
      </aside>
    </div>
    <DailyReviewPanel jarvis={jarvis} />
  </>
}
