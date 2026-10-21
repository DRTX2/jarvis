import { useState } from 'react'
import type { Jarvis } from '../useJarvis'
import { useDraft } from '../useDraft'

export function QuickCapture({ jarvis }: { jarvis: Jarvis }) {
  const draft = useDraft('quick-task', '')
  const [saved, setSaved] = useState('')
  return <form className="task-editor" aria-label="Captura rápida" onSubmit={(event) => {
    event.preventDefault()
    void jarvis.saveTask({ title: draft.value.trim(), category: 'personal', priority: 'normal', dueAt: null, estimatedMinutes: 25 }).then((ok) => { if (ok) { setSaved(`Guardado: ${draft.value.trim()}`); draft.clear() } })
  }}><h2>Captura y sigue</h2><label htmlFor="quick-task">Pendiente rápido</label><input id="quick-task" maxLength={200} required disabled={jarvis.busy} value={draft.value} onChange={(event) => { draft.change(event.target.value); setSaved('') }} placeholder="Una cosa que no quieres olvidar" /><p className="field-note">Enter para guardar. Personal, prioridad normal, 25 min estimados y sin aviso; puedes ajustarlo después. Borrador local en esta pestaña. {draft.warning}</p><div className="form-actions"><button type="button" className="button subtle" disabled={jarvis.busy || !draft.value} onClick={draft.clear}>Vaciar captura</button><button className="button primary" disabled={jarvis.busy || !draft.value.trim()}>Guardar captura</button></div>{saved && <p role="status">{saved}</p>}</form>
}
