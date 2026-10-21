import { useDraft } from '../useDraft'
import type { MemoryProposal } from '../types'
import type { Jarvis } from '../useJarvis'

export function ChatMemory({ proposal, jarvis }: { proposal: MemoryProposal; jarvis: Jarvis }) {
  const draft = useDraft(`memory-proposal-${proposal.id}`, proposal.memory)
  const memory = draft.value
  const setMemory = draft.change
  return <form className="task-editor" aria-label="Recuerdo propuesto desde el chat" onSubmit={(event) => { event.preventDefault(); void jarvis.approveMemoryProposal({ ...proposal, memory }).then((ok) => { if (ok) draft.clear() }) }}>
    <h2>Recuerdo propuesto, aún sin guardar</h2>
    <label>Título del recuerdo propuesto<input required maxLength={80} disabled={jarvis.busy} value={memory.title} onChange={(event) => setMemory({ ...memory, title: event.target.value })} /></label>
    <label htmlFor={`memory-proposal-${proposal.id}`}>Contenido del recuerdo propuesto</label><textarea id={`memory-proposal-${proposal.id}`} required maxLength={500} disabled={jarvis.busy} value={memory.content} onChange={(event) => setMemory({ ...memory, content: event.target.value })} />
    <p>Revisa y corrige antes de aprobar. No guardes secretos. La propuesta caduca en 24 horas; el borrador se conserva en esta pestaña. {draft.warning}</p>
    <div className="form-actions"><button type="button" className="button subtle" disabled={jarvis.busy} onClick={() => void jarvis.discardMemoryProposal(proposal.id).then((ok) => { if (ok) draft.clear() })}>Descartar recuerdo propuesto</button><button className="button primary" disabled={jarvis.busy || !memory.title.trim() || !memory.content.trim()}>Confirmar recuerdo</button></div>
  </form>
}
