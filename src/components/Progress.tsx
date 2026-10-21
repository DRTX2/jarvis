import { ArrowLeft, ArrowRight, Check, NotebookPen } from 'lucide-react'
import { dayLabel, localDay, shiftDay } from '../api'
import type { Page } from '../types'
import type { Jarvis } from '../useJarvis'
import { DayPicker } from './DayPicker'

const energyLabels = { low: 'Energía baja', medium: 'Energía media', high: 'Energía alta' }

export function ProgressView({ jarvis, navigate }: { jarvis: Jarvis; navigate: (page: Page) => void }) {
  const { data, busy } = jarvis
  const week = data.weekly
  if (!week) return <p role="status">No se pudo cargar la semana. Comprueba la conexión con la API.</p>
  const choose = (day: string) => { jarvis.selectDay(day); navigate('today') }
  return <>
    <div className="page-heading"><div><p className="date-label">Seguimiento sin culpa</p><h1>Tu semana, con perspectiva.</h1><p>Lo registrado, tus reflexiones y un ajuste pequeño. No una puntuación sobre ti.</p></div><DayPicker jarvis={jarvis} /></div>
    <div className="week-heading"><button className="icon-button" disabled={busy || shiftDay(week.startDay, -7) < '2000-01-01'} aria-label="Semana anterior" onClick={() => jarvis.selectDay(shiftDay(week.startDay, -7))}><ArrowLeft size={18} /></button><h2>{dayLabel(week.startDay, { day: 'numeric', month: 'short' })} — {dayLabel(week.endDay, { day: 'numeric', month: 'short', year: 'numeric' })}</h2><button className="icon-button" disabled={busy || shiftDay(week.startDay, 7) > '2100-12-31'} aria-label="Semana siguiente" onClick={() => jarvis.selectDay(shiftDay(week.startDay, 7))}><ArrowRight size={18} /></button></div>
    <div className="weekly-summary" aria-label="Actividad semanal"><div><strong>{week.summary.completedTasks}</strong><span>Tareas distintas completadas</span></div><div><strong>{week.summary.studyAttempts}</strong><span>Intentos de estudio</span></div><div><strong>{week.summary.reviewedDays}</strong><span>Días con cierre</span></div><div><strong>{week.summary.plannedDays}</strong><span>Días planificados</span></div></div>
    <div className="week-layout"><section className="week-journal" aria-label="Registro de la semana"><div className="section-heading"><h2>De lunes a domingo</h2><span className="muted">Actividad en {week.timeZone}</span></div>
      <p className="field-note">Una tarea cuenta una vez por día y una vez en el total semanal, aunque la reabras y completes varias veces. El tiempo planificado no es tiempo trabajado.</p>
      <ol className="week-days">{week.days.map((item) => <li key={item.day} className={item.day === localDay() ? 'current-day' : ''}>
        <div className="week-day-label"><strong>{dayLabel(item.day, { weekday: 'short' })}</strong><span>{dayLabel(item.day, { day: 'numeric', month: 'short' })}</span></div>
        <div className="week-day-details"><p>{item.activity.completedTasks} completadas <span>{item.activity.studyAttempts} intentos de estudio</span></p><small>{item.review ? <><Check size={12} /> Cierre guardado{item.review.notes.energy ? ` · ${energyLabels[item.review.notes.energy]}` : ''}</> : item.day > localDay() ? 'Todavía por venir' : 'Sin cierre guardado'}</small>{item.review?.notes.nextStep && <blockquote>Próximo paso: {item.review.notes.nextStep}</blockquote>}{item.review && item.timeZone !== week.timeZone && <small>El cierre original usa {item.review.timeZone}.</small>}</div>
        <button className="button subtle small" disabled={busy || item.day < '2000-01-01' || item.day > '2100-12-31'} aria-label={`Ver día ${item.day}`} onClick={() => choose(item.day)}>Ver día</button>
      </li>)}</ol>
    </section><aside className="weekly-observations"><NotebookPen size={23} /><h2>Una pausa para ajustar.</h2>{week.observations.map((observation) => <p key={observation}>{observation}</p>)}<p className="observation-note">Observaciones por reglas simples y tus registros. No se ha llamado a una IA ni se han cambiado tus pendientes.</p></aside></div>
    <section className="reflections-history" aria-label="Reflexiones guardadas"><h2>Lo que escribiste</h2>{week.days.some((item) => item.review) ? week.days.filter((item) => item.review).map((item) => <article key={item.day}><div className="section-heading"><h3>{dayLabel(item.day, { weekday: 'long', day: 'numeric', month: 'long' })}</h3><button className="text-button" disabled={busy} onClick={() => choose(item.day)}>Editar este cierre</button></div>{item.review!.notes.worked && <p><strong>Funcionó:</strong> {item.review!.notes.worked}</p>}{item.review!.notes.obstacle && <p><strong>Dificultó:</strong> {item.review!.notes.obstacle}</p>}{item.review!.notes.nextStep && <p><strong>Próximo paso:</strong> {item.review!.notes.nextStep}</p>}</article>) : <p className="muted">Todavía no hay reflexiones en esta semana. Puedes guardar un cierre desde Hoy, incluso sin un plan aprobado.</p>}</section>
    <p className="field-note">Las finalizaciones se registran desde esta versión. No reconstruimos fechas de tareas antiguas ni medimos dominio por contar intentos.</p>
  </>
}
