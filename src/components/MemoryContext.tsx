import { useState } from 'react'
import type { Jarvis } from '../useJarvis'
import type { ChatContext } from '../types'

export function MemoryContext({ jarvis, context, change, message }: { jarvis: Jarvis; context: ChatContext; change: (next: ChatContext) => void; message: string }) {
  const [filter, setFilter] = useState('')
  const normalize = (value: string) => value.toLocaleLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
  const words = [...new Set(normalize(message).split(/\W+/).filter((word) => word.length >= 4))]
  const selected = context.memoryIds ?? []
  function select(ids: string[]) {
    change({ ...context, memoryIds: ids, memoryVersions: ids.map((id) => ({ id, version: jarvis.data.memories.find((item) => item.id === id)!.version })) })
  }
  const memories = jarvis.data.memories.filter((item) => !item.expired)
    .map((item) => ({ ...item, score: words.filter((word) => normalize(`${item.title} ${item.content}`).includes(word)).length }))
    .filter((item) => normalize(`${item.title} ${item.content}`).includes(normalize(filter)))
    .sort((a, b) => b.score - a.score || b.updatedAt.localeCompare(a.updatedAt) || a.id.localeCompare(b.id))
  return <fieldset className="task-editor"><legend>Recuerdos para este mensaje</legend><label className="consent-label"><input type="checkbox" disabled={jarvis.busy} checked={context.memories} onChange={(event) => change({ ...context, memories: event.target.checked, memoryIds: selected })} />Compartir solo los recuerdos que seleccione</label>
    {context.memories && <><label>Buscar recuerdos para compartir<input disabled={jarvis.busy} value={filter} onChange={(event) => setFilter(event.target.value)} /></label><p>{selected.length}/10 seleccionados. Las coincidencias con tu mensaje aparecen primero; no se seleccionan automáticamente. Los vencidos quedan excluidos.</p>{memories.map((item) => <label className="consent-label" key={item.id}><input type="checkbox" disabled={jarvis.busy || (!selected.includes(item.id) && selected.length >= 10)} checked={selected.includes(item.id)} onChange={() => select((selected.includes(item.id) ? selected.filter((id) => id !== item.id) : [...selected, item.id]).filter((id) => jarvis.data.memories.some((memory) => memory.id === id && !memory.expired)))} />Compartir recuerdo: {item.title} — {item.content}</label>)}{selected.some((id) => !jarvis.data.memories.some((item) => item.id === id && !item.expired)) && <button type="button" className="button subtle" disabled={jarvis.busy} onClick={() => select(selected.filter((id) => jarvis.data.memories.some((item) => item.id === id && !item.expired)))}>Quitar selecciones vencidas o borradas</button>}</>}
  </fieldset>
}
