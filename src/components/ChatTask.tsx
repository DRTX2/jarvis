import { useState } from 'react'
import type { TaskProposal } from '../types'
import type { Jarvis } from '../useJarvis'
import { useDraft } from '../useDraft'
import { exactLocalDate, localDateTime } from '../dates'

export function ChatTask({ proposal, jarvis, close }: { proposal: TaskProposal; jarvis: Jarvis; close: () => void }) {
  const draft = useDraft(`task-proposal-${proposal.id}`, { ...proposal.task, dueAt: proposal.task.dueAt ?? proposal.target?.dueAt ?? null, localDue: localDateTime(proposal.task.dueAt ?? proposal.target?.dueAt) })
  const { localDue, ...task } = draft.value
  const setTask = (next: typeof task) => draft.change({ ...next, localDue })
  const [dateError, setDateError] = useState('')
  const action = proposal.action ?? 'edit'
  if (action !== 'edit') return <section className="task-editor" aria-label="Acción propuesta desde el chat"><h2>{action === 'complete' ? 'Completar tarea' : action === 'reopen' ? 'Reabrir tarea' : 'Borrar tarea'}</h2><p>#{proposal.target?.id}: {proposal.target?.title}</p><p>{action === 'delete' ? 'Se eliminará la tarea y su aviso. Los títulos en planes e historial se conservarán. Esta acción no se puede deshacer.' : 'Solo cambiará el estado; los otros campos se conservan.'}</p><div className="form-actions"><button className="button subtle" disabled={jarvis.busy} onClick={() => void jarvis.discardTaskProposal(proposal.id).then((ok) => { if (ok) close() })}>Descartar tarea propuesta</button><button className={`button ${action === 'delete' ? 'danger' : 'primary'}`} disabled={jarvis.busy} onClick={() => void jarvis.approveTaskProposal(proposal).then((ok) => { if (ok) close() })}>{action === 'delete' ? 'Confirmar borrado de tarea' : action === 'complete' ? 'Confirmar completar tarea' : 'Confirmar reabrir tarea'}</button></div></section>
  return <form className="task-editor" aria-label="Tarea propuesta desde el chat" onSubmit={(event) => {
    event.preventDefault()
    try {
      setDateError('')
      const dueAt = localDue === localDateTime(task.dueAt) ? task.dueAt : exactLocalDate(localDue)
      void jarvis.approveTaskProposal({ ...proposal, task: { ...task, dueAt } }).then((ok) => { if (ok) { draft.clear(); close() } })
    } catch (error) { setDateError((error as Error).message) }
  }}>
    <h2>{proposal.target ? 'Cambios propuestos, aún sin aplicar' : 'Propuesta, aún sin crear'}</h2><p>Elige la fecha y hora con el calendario. No se interpretan fechas ambiguas del mensaje. Déjalo vacío para quitar el aviso.</p>
    <label>Fecha y aviso propuestos<input type="datetime-local" aria-label="Fecha y aviso propuestos" disabled={jarvis.busy} value={localDue} onChange={(event) => draft.change({ ...draft.value, localDue: event.target.value })} /></label>
    <p className="field-note">Zona horaria: {Intl.DateTimeFormat().resolvedOptions().timeZone}. Avisos internos, con app abierta y servidor activo. Borrador conservado en esta pestaña. {draft.warning}</p>{dateError && <p role="alert">{dateError}</p>}
    {proposal.target && <section aria-label="Antes y después"><h3>Revisa los cambios a #{proposal.target.id}</h3><dl><dt>Título</dt><dd>{proposal.target.title} → {task.title}</dd><dt>Área / prioridad</dt><dd>{proposal.target.category} / {proposal.target.priority} → {task.category} / {task.priority}</dd><dt>Duración</dt><dd>{proposal.target.estimatedMinutes} → {task.estimatedMinutes} min</dd><dt>Aviso (hora local)</dt><dd>{localDateTime(proposal.target.dueAt) || 'Sin aviso'} → {localDue || 'Sin aviso'}</dd></dl><p>El estado completado no cambia. Nada se aplica hasta confirmar.</p></section>}
    <label>Título de la tarea propuesta<input maxLength={200} required disabled={jarvis.busy} value={task.title} onChange={(event) => setTask({ ...task, title: event.target.value })} /></label>
    <label>Área propuesta<select aria-label="Área propuesta" disabled={jarvis.busy} value={task.category} onChange={(event) => setTask({ ...task, category: event.target.value as typeof task.category })}><option value="personal">Personal</option><option value="study">Estudio</option><option value="work">Trabajo</option></select></label>
    <label>Prioridad propuesta<select aria-label="Prioridad propuesta" disabled={jarvis.busy} value={task.priority} onChange={(event) => setTask({ ...task, priority: event.target.value as typeof task.priority })}><option value="high">Alta</option><option value="normal">Normal</option><option value="low">Baja</option></select></label>
    <label>Minutos estimados de la propuesta<input type="number" min={5} max={240} required disabled={jarvis.busy} value={task.estimatedMinutes} onChange={(event) => setTask({ ...task, estimatedMinutes: Number(event.target.value) })} /></label>
    <div className="form-actions"><button type="button" className="button subtle" disabled={jarvis.busy} onClick={close}>Cerrar y conservar borrador</button><button type="button" className="button subtle" disabled={jarvis.busy} onClick={() => void jarvis.discardTaskProposal(proposal.id).then((ok) => { if (ok) { draft.clear(); close() } })}>Descartar tarea propuesta</button><button className="button primary" disabled={jarvis.busy || !task.title.trim()}>{proposal.target ? 'Confirmar modificación de tarea' : 'Confirmar creación de tarea'}</button></div>
  </form>
}
