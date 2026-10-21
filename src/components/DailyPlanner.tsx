import { useState } from 'react'
import type { FormEvent } from 'react'
import { CalendarClock, Check, Clock3, Coffee, Plus, ShieldCheck, X } from 'lucide-react'
import { dayLabel, localDay } from '../api'
import type { ApprovedPlan, Commitment, PlanBlock, PlanProposal } from '../types'
import type { Jarvis } from '../useJarvis'
import { DayPicker } from './DayPicker'

function Timeline({ blocks, jarvis, approved = false }: { blocks: PlanBlock[]; jarvis: Jarvis; approved?: boolean }) {
  return <ol className="plan-timeline" aria-label={approved ? 'Bloques aprobados' : 'Bloques propuestos'}>
    {blocks.map((block, index) => <li key={`${block.kind}-${index}`} className={`plan-block ${block.kind}`}>
      <span className="block-time">{block.startTime}<small>{block.endTime}</small></span>
      <span className="block-marker" aria-hidden="true">{block.kind === 'break' ? <Coffee size={15} /> : block.kind === 'commitment' ? <CalendarClock size={15} /> : <span />}</span>
      <div className="block-content">
        <strong>{block.title}</strong>
        <p>{block.durationMinutes} min{block.kind === 'commitment' ? ' · Compromiso fijo' : block.kind === 'break' ? ' · Descanso' : ' · Tiempo estimado'}</p>
        {approved && block.kind === 'task' && !block.task && <span className="block-note">La tarea fue eliminada. El bloque histórico se conserva.</span>}
        {block.changed && <span className="block-note">La tarea cambió; este horario conserva la duración y el título que aprobaste.</span>}
      </div>
      {approved && block.task && jarvis.day === localDay() && <button
        className={`block-complete ${block.task.done ? 'completed' : ''}`}
        disabled={jarvis.busy} aria-label={`${block.task.done ? 'Reabrir' : 'Completar'} bloque: ${block.title}`}
        aria-pressed={block.task.done} onClick={() => void jarvis.toggleTask(block.task!)}
      ><Check size={17} /></button>}
      {approved && block.task?.done && jarvis.day !== localDay() && <span className="block-note">Completada en tu lista actual</span>}
    </li>)}
  </ol>
}

function PlanDetails({ plan, jarvis, approved = false }: { plan: PlanProposal | ApprovedPlan; jarvis: Jarvis; approved?: boolean }) {
  return <>
    <div className="plan-facts"><span><Clock3 size={14} /> {plan.focusMinutes} min de enfoque</span><span>{plan.pauseMinutes} min de descanso</span><span>{plan.remainingMinutes} min sin ocupar</span></div>
    <Timeline blocks={plan.blocks} jarvis={jarvis} approved={approved} />
    {plan.unscheduled.length > 0 && <div className="unplaced-tasks"><h3>Esto no cabe todavía</h3><ul>{plan.unscheduled.map((task) => <li key={task.taskId}><strong>{task.title}</strong><p>{task.reason}</p></li>)}</ul></div>}
  </>
}

function PlanningForm({ jarvis, onClose }: { jarvis: Jarvis; onClose: () => void }) {
  const { data, day, busy } = jarvis
  const pending = data.tasks.filter((task) => !task.done)
  const saved = data.daily.plan?.input
  const [startTime, setStartTime] = useState(saved?.startTime ?? '09:00')
  const [endTime, setEndTime] = useState(saved?.endTime ?? '11:00')
  const [breakMinutes, setBreakMinutes] = useState(saved?.breakMinutes ?? 5)
  const stillPending = saved?.taskIds.filter((id) => pending.some((task) => task.id === id)) ?? []
  const [taskIds, setTaskIds] = useState<number[]>(stillPending.length ? stillPending : pending.slice(0, 3).map((task) => task.id))
  const [commitments, setCommitments] = useState<Commitment[]>(saved?.commitments ?? [])
  const [proposal, setProposal] = useState<PlanProposal | null>(null)
  const update = (action: () => void) => { action(); setProposal(null) }
  const editCommitment = (index: number, changes: Partial<Commitment>) => update(() => setCommitments(commitments.map((item, i) => i === index ? { ...item, ...changes } : item)))

  async function propose(event: FormEvent) {
    event.preventDefault()
    setProposal(null)
    const next = await jarvis.previewPlan({ day, timeZone: data.daily.timeZone, startTime, endTime, breakMinutes, taskIds, commitments })
    if (next) setProposal(next)
  }
  async function approve() { if (proposal && await jarvis.approvePlan(proposal)) onClose() }

  return <div className="planning-editor">
    <form onSubmit={propose} aria-label="Disponibilidad del día">
      <div className="section-heading"><h3>Haz espacio, no una agenda imposible.</h3><button type="button" className="icon-button" onClick={onClose} disabled={busy} aria-label="Cerrar planificación"><X size={18} /></button></div>
      <div className="availability-fields">
        <label>Disponible desde<input type="time" value={startTime} required disabled={busy} onChange={(event) => update(() => setStartTime(event.target.value))} /></label>
        <label>Disponible hasta<input type="time" value={endTime} required disabled={busy} onChange={(event) => update(() => setEndTime(event.target.value))} /></label>
        <label>Descanso entre tareas<select aria-label="Descanso entre tareas" value={breakMinutes} disabled={busy} onChange={(event) => update(() => setBreakMinutes(Number(event.target.value)))}>{[0, 5, 10, 15, 20, 30].map((minutes) => <option key={minutes} value={minutes}>{minutes} minutos</option>)}</select></label>
      </div>
      <fieldset className="priority-selection"><legend>Elige hasta tres pendientes</legend>
        {pending.map((task) => <label key={task.id}><input type="checkbox" checked={taskIds.includes(task.id)} disabled={busy || (!taskIds.includes(task.id) && taskIds.length >= 3)} aria-label={`Incluir ${task.title} en el plan`} onChange={(event) => update(() => setTaskIds(event.target.checked ? [...taskIds, task.id] : taskIds.filter((id) => id !== task.id)))} /><span>{task.title}<small>{task.estimatedMinutes} min estimados{task.priority === 'high' ? ' · Prioridad alta' : ''}</small></span></label>)}
      </fieldset>
      <div className="commitment-section"><div className="section-heading"><h3>Compromisos dentro de esta ventana</h3><button type="button" className="text-button" disabled={busy || commitments.length >= 8} onClick={() => update(() => setCommitments([...commitments, { title: '', startTime, endTime }]))}><Plus size={15} /> Añadir compromiso</button></div>
        {!commitments.length && <p className="field-note">Solo se respetan los compromisos que declares aquí. Todavía no consultamos calendarios externos.</p>}
        {commitments.map((item, index) => <fieldset className="commitment-row" key={index}><legend>Compromiso {index + 1}</legend>
          <label>Nombre<input value={item.title} aria-label={`Nombre del compromiso ${index + 1}`} maxLength={100} required disabled={busy} placeholder="Por ejemplo, clase o reunión" onChange={(event) => editCommitment(index, { title: event.target.value })} /></label>
          <label>Inicio<input type="time" value={item.startTime} aria-label={`Inicio del compromiso ${index + 1}`} required disabled={busy} onChange={(event) => editCommitment(index, { startTime: event.target.value })} /></label>
          <label>Fin<input type="time" value={item.endTime} aria-label={`Fin del compromiso ${index + 1}`} required disabled={busy} onChange={(event) => editCommitment(index, { endTime: event.target.value })} /></label>
          <button type="button" className="icon-button" disabled={busy} aria-label={`Eliminar compromiso ${index + 1}`} onClick={() => update(() => setCommitments(commitments.filter((_, i) => i !== index)))}><X size={17} /></button>
        </fieldset>)}
      </div>
      <div className="form-actions"><button type="button" className="button subtle" disabled={busy} onClick={onClose}>Cancelar</button><button className="button primary" disabled={busy || !taskIds.length}>{busy ? 'Preparando…' : 'Generar propuesta'}</button></div>
    </form>
    {proposal && <section className="proposal-panel" aria-label="Propuesta sin aprobar"><div className="section-heading"><h3>Propuesta, todavía sin guardar</h3><span className="tag">Necesita tu aprobación</span></div><PlanDetails plan={proposal} jarvis={jarvis} /><p className="field-note">Ordenada por prioridad. No cambia tus tareas, sus avisos ni ningún calendario externo.</p><button type="button" className="button primary" disabled={busy || !proposal.plannedTasks} onClick={() => void approve()}><ShieldCheck size={16} />{data.daily.plan ? 'Aprobar y reemplazar el plan' : 'Aprobar este plan'}</button></section>}
  </div>
}

export function DailyPlanner({ jarvis }: { jarvis: Jarvis }) {
  const { data, day, busy } = jarvis
  const [editing, setEditing] = useState(false)
  const pending = data.tasks.some((task) => !task.done)
  const past = day < localDay()
  return <section className="daily-planner" aria-labelledby="daily-plan-title">
    <div className="planner-heading"><div><h2 id="daily-plan-title">Plan del día</h2><p>{dayLabel(day)} <span className="zone-label">{data.daily.timeZone}</span></p></div><DayPicker jarvis={jarvis} /></div>
    {editing ? <PlanningForm jarvis={jarvis} onClose={() => setEditing(false)} /> : <>
      {data.daily.plan ? <section className="approved-plan" aria-label="Plan aprobado"><div className="section-heading"><span className="approved-label"><Check size={15} /> Aprobado por ti</span>{!past && <button className="button outline small" disabled={busy || !pending} onClick={() => setEditing(true)}>Proponer otro plan</button>}</div><PlanDetails plan={data.daily.plan} jarvis={jarvis} approved /></section> : <div className="planner-empty"><CalendarClock size={27} /><div><h3>{past ? 'No hay un plan guardado para este día.' : 'Tus prioridades también necesitan tiempo.'}</h3><p>{past ? 'Puedes consultar su actividad y guardar una reflexión, sin fabricar una agenda retroactiva.' : pending ? 'Declara tu disponibilidad, reserva descansos y revisa la propuesta antes de aprobarla.' : 'Añade un pendiente y su duración estimada para preparar una propuesta.'}</p></div>{!past && <button className="button outline" disabled={busy || !pending} onClick={() => setEditing(true)}>Planificar mi día</button>}</div>}
    </>}
    <p className="planner-footnote">Horarios orientativos, no tiempo trabajado. Aprobar un plan no crea avisos automáticos ni mueve compromisos.</p>
  </section>
}
