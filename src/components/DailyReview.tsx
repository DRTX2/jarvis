import { useEffect, useId, useState } from 'react'
import type { FormEvent } from 'react'
import { Check, ChevronDown, NotebookPen } from 'lucide-react'
import { dayLabel, localDay, readableDate } from '../api'
import type { ReviewNotes } from '../types'
import type { Jarvis } from '../useJarvis'

const empty: ReviewNotes = { worked: '', obstacle: '', nextStep: '', energy: null }

export function DailyReviewPanel({ jarvis }: { jarvis: Jarvis }) {
  const { data, day, busy } = jarvis
  const [open, setOpen] = useState(false)
  const [notes, setNotes] = useState<ReviewNotes>(data.daily.review?.notes ?? empty)
  const [saved, setSaved] = useState(false)
  const formId = useId()
  useEffect(() => { setNotes(data.daily.review?.notes ?? empty) }, [day, data.daily.review?.updatedAt])
  const change = (changes: Partial<ReviewNotes>) => { setNotes({ ...notes, ...changes }); setSaved(false) }
  const hasContent = Boolean(notes.worked.trim() || notes.obstacle.trim() || notes.nextStep.trim() || notes.energy)
  const future = day > localDay()
  async function save(event: FormEvent) {
    event.preventDefault()
    if (await jarvis.saveDailyReview(notes)) setSaved(true)
  }

  return <section className="daily-review" aria-labelledby="daily-review-title">
    <div className="review-heading"><NotebookPen size={21} /><div><h2 id="daily-review-title">Cierre del día</h2><p>{dayLabel(day)}. Qué mantener, qué ajustar y cómo volver a empezar.</p></div><button className="button outline" disabled={busy || future} onClick={() => setOpen(!open)} aria-expanded={open}>{open ? 'Ocultar cierre' : data.daily.review ? 'Editar mi cierre' : 'Revisar mi día'}<ChevronDown size={15} /></button></div>
    {future && <p className="field-note">Podrás cerrar este día cuando llegue. Planificarlo no significa haberlo completado.</p>}
    {data.daily.needsReviewUpdate && <p className="review-update-note" role="status">Hay actividad o cambios de plan posteriores al cierre. Tu resumen guardado no se modifica solo; puedes actualizarlo.</p>}
    {data.daily.review && !open && <p className="review-last-saved">Último cierre: {readableDate(data.daily.review.updatedAt)}. {data.daily.review.snapshot.completedTasks} tareas distintas completadas y {data.daily.review.snapshot.studyAttempts} intentos de estudio registrados al guardarlo.</p>}
    {open && <form onSubmit={save} className="daily-review-form" aria-label="Reflexión del día">
      <div className="review-activity"><span>{data.daily.activity.completedTasks} tareas distintas completadas</span><span>{data.daily.activity.studyAttempts} intentos de estudio</span>{data.daily.plan && <span>{data.daily.activity.completedPlannedTasks} de {data.daily.activity.plannedTasks} tareas del plan registradas como completadas ese día</span>}</div>
      <div className="review-fields"><div><label htmlFor={`${formId}-worked`}>¿Qué te funcionó?</label><textarea id={`${formId}-worked`} rows={3} maxLength={1000} disabled={busy} value={notes.worked} onChange={(event) => change({ worked: event.target.value })} placeholder="Una acción o decisión concreta" /></div><div><label htmlFor={`${formId}-obstacle`}>¿Qué te dificultó avanzar?</label><textarea id={`${formId}-obstacle`} rows={3} maxLength={1000} disabled={busy} value={notes.obstacle} onChange={(event) => change({ obstacle: event.target.value })} placeholder="Describe el obstáculo, sin castigarte" /></div></div>
      <div className="review-field"><label htmlFor={`${formId}-next`}>Tu próximo paso pequeño</label><textarea id={`${formId}-next`} rows={2} maxLength={1000} disabled={busy} value={notes.nextStep} onChange={(event) => change({ nextStep: event.target.value })} placeholder="Algo concreto que puedas retomar" /></div>
      <label>¿Cómo estuvo tu energía? (opcional)<select aria-label="Energía declarada" value={notes.energy ?? ''} disabled={busy} onChange={(event) => change({ energy: (event.target.value || null) as ReviewNotes['energy'] })}><option value="">Prefiero no registrarla</option><option value="low">Baja</option><option value="medium">Media</option><option value="high">Alta</option></select></label>
      <p className="field-note">Todo queda local. Es una reflexión y una foto de tus registros al guardar, no un diagnóstico ni una evaluación de tu valor. No se crean tareas desde estas notas.</p>
      <div className="form-actions">{saved && <span className="save-status" role="status"><Check size={16} /> Cierre guardado</span>}<button className="button primary" disabled={busy || future || !hasContent}>{busy ? 'Guardando…' : data.daily.review ? 'Actualizar mi cierre' : 'Guardar mi cierre'}</button></div>
    </form>}
  </section>
}
