import { useState } from 'react'
import type { Jarvis } from '../useJarvis'
import { useDraft } from '../useDraft'

export function KnowledgeLibrary({ jarvis }: { jarvis: Jarvis }) {
  const draft = useDraft('knowledge-new', { title: '', topic: '', content: '', origin: 'Aporte manual', url: '' })
  const [filter, setFilter] = useState('')
  const [error, setError] = useState('')
  const [reading, setReading] = useState(false)
  const [deleting, setDeleting] = useState<string | null>(null)
  const busy = jarvis.busy || reading
  const input = draft.value
  return <section aria-label="Base de conocimientos"><h2>Tus materiales y fuentes</h2><p>Una biblioteca local, separada de los recuerdos sobre ti y de las preguntas de práctica. Guarda extractos, apuntes y referencias con procedencia. No se envían a Gemini ni generan ejercicios automáticamente.</p>
    <form className="task-editor" aria-label="Aportar material" onSubmit={(event) => { event.preventDefault(); void jarvis.addKnowledge({ ...input, url: input.url.trim() || null }).then((ok) => { if (ok) draft.clear() }) }}>
      <label>Archivo de notas (.md o .txt)<input type="file" accept=".md,.txt,text/plain,text/markdown" disabled={busy} onChange={async (event) => {
        const file = event.target.files?.[0]
        event.target.value = ''
        if (!file) return
        if (!/\.(md|txt)$/i.test(file.name) || file.size > 48000) { setError('Elige un archivo .md o .txt de hasta 48 KB. Puedes pegar un extracto de un archivo más grande.'); return }
        setReading(true); setError('')
        try {
          const content = await file.text()
          if (content.length > 16000 || content.includes('\0')) throw new Error('El archivo debe ser texto y tener hasta 16.000 caracteres. Pega un extracto.')
          draft.change({ ...input, title: input.title || file.name.replace(/\.(md|txt)$/i, ''), origin: file.name, content })
        } catch (error) { setError((error as Error).message) }
        finally { setReading(false) }
      }} /></label>
      <p className="field-note">Seleccionar un archivo solo prepara el formulario. Revisa antes de guardar; el archivo original no se modifica. Puedes elegir notas técnicas de ~/Desktop/notes sin importar carpetas privadas.</p>
      <label>Título del material<input required maxLength={160} disabled={busy} value={input.title} onChange={(event) => draft.change({ ...input, title: event.target.value })} /></label>
      <label>Tema del material<input required maxLength={80} disabled={busy} placeholder="C#, AWS, Azure, DevOps, ciberseguridad…" value={input.topic} onChange={(event) => draft.change({ ...input, topic: event.target.value })} /></label>
      <label>Procedencia del material<input required maxLength={300} disabled={busy} placeholder="Nota propia, documentación oficial, respuesta comunitaria…" value={input.origin} onChange={(event) => draft.change({ ...input, origin: event.target.value })} /></label>
      <label>Enlace de referencia (opcional)<input type="url" maxLength={2000} disabled={busy} value={input.url} onChange={(event) => draft.change({ ...input, url: event.target.value })} /></label>
      <label htmlFor="knowledge-content">Contenido o extracto</label><textarea id="knowledge-content" required maxLength={16000} rows={6} disabled={busy} value={input.content} onChange={(event) => draft.change({ ...input, content: event.target.value })} />
      <p className="field-note">Hasta 16.000 caracteres y 100 materiales. Un enlace no descarga la página: aporta también un resumen o extracto. No incluyas claves ni datos sensibles. Borrador en esta pestaña. {draft.warning}</p>
      {error && <p role="alert">{error}</p>}<div className="form-actions"><button type="button" className="button subtle" disabled={busy} onClick={draft.clear}>Descartar borrador de material</button><button className="button primary" disabled={busy || !input.title.trim() || !input.topic.trim() || !input.content.trim() || !input.origin.trim()}>Guardar material revisado</button></div>
    </form>
    <label>Buscar materiales<input value={filter} onChange={(event) => setFilter(event.target.value)} placeholder="Título, tema, contenido o procedencia" /></label>
    {jarvis.data.knowledge.filter((item) => `${item.title} ${item.topic} ${item.content} ${item.origin}`.toLocaleLowerCase().includes(filter.toLocaleLowerCase())).map((item) => <details className="task-editor" key={item.id}><summary>{item.title} · {item.topic}</summary><p>Procedencia: {item.origin}. Guardado: {new Date(item.createdAt).toLocaleDateString()}.</p>{item.url && <a href={item.url} target="_blank" rel="noreferrer">Consultar referencia externa</a>}<pre style={{ whiteSpace: 'pre-wrap', overflowWrap: 'anywhere' }}>{item.content}</pre><p className="field-note">Aporte sin verificación automática. Guardarlo no demuestra aprendizaje ni valida su exactitud.</p><button className="button danger" disabled={busy} onClick={() => deleting === item.id ? void jarvis.deleteKnowledge(item.id).then((ok) => { if (ok) setDeleting(null) }) : setDeleting(item.id)}>{deleting === item.id ? `Confirmar borrado de material: ${item.title}` : `Borrar material: ${item.title}`}</button>{deleting === item.id && <button className="button subtle" onClick={() => setDeleting(null)}>Cancelar borrado de material</button>}</details>)}
    {!jarvis.data.knowledge.length && <p>Aún no hay materiales aportados. Empieza con una nota técnica que quieras estudiar.</p>}
  </section>
}
