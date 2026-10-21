import { useEffect } from 'react'
import type { Goal, PracticePlan } from '../types'
import type { Jarvis } from '../useJarvis'
import { useDraft } from '../useDraft'

export function PracticeSession({ jarvis, goal, choose, completed }: { jarvis: Jarvis; goal: Goal; choose: (id: string) => void; completed: { cardId: string; revision: number; attempt: number } | null }) {
  const empty: PracticePlan & { active: boolean; completedIds: string[] } = { goalId: goal.id, goalVersion: goal.version, budgetMinutes: goal.budgetMinutes, estimatedMinutes: 0, missingCardIds: [], items: [], active: false, completedIds: [] }
  const draft = useDraft(`practice-${goal.id}-${goal.version}`, empty)
  const plan = draft.value
  const invalid = plan.items.some((item) => jarvis.data.study.cards.find((card) => card.id === item.cardId)?.revision !== item.revision)
  useEffect(() => {
    if (!completed || !plan.active || invalid || plan.completedIds.includes(completed.cardId) || !plan.items.some((item) => item.cardId === completed.cardId && item.revision === completed.revision)) return
    draft.change({ ...plan, completedIds: [...plan.completedIds, completed.cardId] })
  }, [completed?.attempt])
  const next = plan.items.find((item) => !plan.completedIds.includes(item.cardId))
  return <section className="task-editor" aria-label="Sesión por objetivo"><h2>Practicar: {goal.title}</h2><p>Resultado esperado: {goal.outcome}</p><p>{goal.budgetMinutes} min disponibles. Selección local: primero vencidos, luego dificultades del último intento y preguntas sin practicar en su versión actual. Hasta seis preguntas, estimando 10 min cada una; no es tiempo medido ni evaluación automática.</p>
    <button className="button outline" disabled={jarvis.busy} onClick={() => void jarvis.preparePractice(goal).then((nextPlan) => { if (nextPlan) draft.change({ ...nextPlan, active: false, completedIds: [] }) })}>Preparar sesión del objetivo</button>
    {plan.items.length > 0 && <><ol>{plan.items.map((item) => <li key={item.cardId}>{item.title}<p className="field-note">{item.reason} · {item.minutes} min estimados {plan.completedIds.includes(item.cardId) ? '· Intento guardado' : ''}</p></li>)}</ol><p>Estimación: {plan.estimatedMinutes} min. Evidencias guardadas en esta sesión: {plan.completedIds.length}/{plan.items.length}.</p>{invalid ? <p role="alert">Una pregunta cambió. Prepara otra sesión; tus intentos y borradores guardados siguen disponibles.</p> : next ? <button className="button primary" disabled={jarvis.busy} onClick={() => { if (!plan.active) draft.change({ ...plan, active: true }); choose(next.cardId) }}>{plan.active ? 'Continuar sesión del objetivo' : 'Iniciar sesión del objetivo'}</button> : <p role="status">Sesión terminada. Revisa tus intentos y aplica lo aprendido a un problema real; terminar no certifica dominio.</p>}<button className="button subtle" disabled={jarvis.busy} onClick={draft.clear}>Cerrar sesión local</button></>}
    {!goal.cardIds.length && <p>Vincula preguntas a este objetivo desde Hoy → Mis objetivos y rutas. Puedes generar preguntas desde tus materiales y luego añadirlas a la ruta.</p>}
    {plan.missingCardIds.length > 0 && <p>Algunas preguntas ya no están disponibles; revisa la ruta.</p>}
    <p className="field-note">Preparar no crea repasos ni modifica fechas. Iniciar es explícito. Guarda cada ciclo de práctica para registrar evidencia; la cola se conserva solo en esta pestaña. {draft.warning}</p>
  </section>
}
