import { useEffect, useState } from 'react'
import type { Jarvis } from '../useJarvis'
import type { Feedback, MaterialProposal, StudyCard } from '../types'
import { MaterialEditor } from './MaterialEditor'

export function DynamicLearning({ jarvis, card }: { jarvis: Jarvis; card?: StudyCard }) {
  const [topic, setTopic] = useState('')
  const [instruction, setInstruction] = useState('')
  const [consent, setConsent] = useState(false)
  const [proposal, setProposal] = useState<MaterialProposal | null>(null)
  const [advanced, setAdvanced] = useState(false)
  const [editing, setEditing] = useState('')
  const [error, setError] = useState('')
  const [saved, setSaved] = useState(false)
  const [knowledgeIds, setKnowledgeIds] = useState<string[]>([])
  const goal = jarvis.data.goals.find((item) => item.id === jarvis.studyGoalId)
  const enabled = jarvis.data.health.provider !== 'demo'
  const external = jarvis.data.health.externalAIEnabled
  useEffect(() => { setConsent(false); setProposal(null); setSaved(false) }, [card?.id, card?.revision])
  async function generate(revise: boolean) {
    setProposal(null); setError(''); setSaved(false); setAdvanced(false)
    const next = await jarvis.generateMaterial(revise ? card!.topic : topic, instruction, revise ? card!.id : null, consent, knowledgeIds)
    setConsent(false)
    if (next) { setProposal(next); setEditing(JSON.stringify(next.material, null, 2)) }
  }
  async function approve() {
    if (!proposal) return
    let material
    try { material = JSON.parse(editing) }
    catch { setError('El JSON no es válido. Corrige comillas y campos antes de aprobar.'); return }
    if (await jarvis.approveMaterial({ ...proposal, material })) { setProposal(null); setSaved(true) }
  }
  function switchEditor() {
    if (!proposal) return
    if (advanced) {
      try {
        const material = JSON.parse(editing)
        if (!material || !['topic', 'question', 'hint', 'answer'].every((key) => typeof material[key] === 'string') || !Array.isArray(material.checkpoints) || !material.checkpoints.every((item: unknown) => typeof item === 'string')) throw new Error()
        setProposal({ ...proposal, material })
      } catch { setError('Corrige el JSON antes de volver a los campos. Tu texto se conserva.'); return }
    }
    setError(''); setAdvanced(!advanced)
  }
  return <section className="task-editor" aria-label="Estudio dinámico"><h2>Tu biblioteca, en evolución.</h2><p>Genera ejercicios de ciencia o tecnología, o revisa la pregunta seleccionada. Cada cambio necesita tu aprobación.</p>
    {!enabled && <p className="field-note">Activa la IA local (Ollama) o configura Gemini en .env. Las preguntas locales siguen disponibles.</p>}
    <label>Tema nuevo<input maxLength={120} disabled={jarvis.busy} value={topic} onChange={(event) => { setTopic(event.target.value); setConsent(false) }} placeholder="Por ejemplo: redes, álgebra o React" /></label>
    <label>Qué quieres practicar o corregir<textarea maxLength={1000} value={instruction} disabled={jarvis.busy} onChange={(event) => { setInstruction(event.target.value); setConsent(false) }} placeholder="Nivel, objetivo, errores detectados o cambios deseados" /></label>
    <fieldset><legend>Fuentes que autorizas para esta propuesta (hasta tres)</legend><p className="field-note">Solo se envían los primeros 4.000 caracteres de cada material elegido, con título, procedencia y enlace. Seleccionar no envía nada. Sin selección, la generación no tiene fuentes aportadas.</p>{goal && <button type="button" className="button outline" disabled={jarvis.busy} onClick={() => { setKnowledgeIds(goal.knowledgeIds.filter((id) => jarvis.data.knowledge.some((item) => item.id === id)).slice(0, 3)); setTopic(goal.topic); setInstruction(goal.outcome.slice(0, 1000)); setConsent(false) }}>Usar materiales y objetivo de la ruta</button>}{jarvis.data.knowledge.map((source) => <div key={source.id}><label className="consent-label"><input type="checkbox" disabled={jarvis.busy || (!knowledgeIds.includes(source.id) && knowledgeIds.length >= 3)} checked={knowledgeIds.includes(source.id)} onChange={() => { setKnowledgeIds(knowledgeIds.includes(source.id) ? knowledgeIds.filter((id) => id !== source.id) : [...knowledgeIds, source.id]); setConsent(false) }} />Fuente para generar: {source.title}</label><details><summary>Ver extracto: {source.title}</summary><p style={{ whiteSpace: 'pre-wrap', overflowWrap: 'anywhere' }}>{source.content.slice(0, 4000)}</p></details></div>)}</fieldset>
    {external ? <label className="consent-label"><input type="checkbox" disabled={jarvis.busy} checked={consent} onChange={(event) => setConsent(event.target.checked)} />Autorizo enviar el tema, petición y extractos seleccionados; al revisar, también la pregunta, su explicación y sus referencias.</label> : enabled && <p className="field-note">IA local: el material no sale de tu equipo.</p>}
    <div className="form-actions"><button className="button outline" disabled={!enabled || (external && !consent) || !card || jarvis.busy} onClick={() => void generate(true)}>Proponer revisión de esta pregunta</button><button className="button primary" disabled={!enabled || (external && !consent) || !topic.trim() || jarvis.busy} onClick={() => void generate(false)}>Generar pregunta nueva</button></div>
    {proposal && <section aria-label="Material propuesto"><h3>Propuesta sin guardar</h3><p>Revisa su exactitud. Puedes editar los campos; las fuentes no están verificadas. Cambiar una pregunta reinicia su calendario de repaso, conservando intentos y versión anterior.</p><button className="button subtle" disabled={jarvis.busy} onClick={switchEditor}>{advanced ? 'Volver a campos de edición' : 'Editar JSON avanzado'}</button>{advanced ? <><label htmlFor="material-json">Contenido editable (JSON)</label><textarea id="material-json" rows={14} value={editing} disabled={jarvis.busy} onChange={(event) => setEditing(event.target.value)} /></> : <MaterialEditor material={proposal.material} busy={jarvis.busy} change={(material) => { setProposal({ ...proposal, material }); setEditing(JSON.stringify(material, null, 2)) }} />}{error && <p role="alert">{error}</p>}<div className="form-actions"><button className="button subtle" disabled={jarvis.busy} onClick={() => setProposal(null)}>Descartar propuesta</button><button className="button primary" disabled={jarvis.busy} onClick={() => void approve()}>Aprobar y guardar contenido</button></div></section>}
    {saved && <p role="status">Contenido guardado. Disponible en la lista de preguntas.</p>}
    {proposal?.references?.map((source, index) => <section className="task-editor" key={index} aria-label={`Cita propuesta ${index + 1}`}><h3>{source.title}</h3><p>Procedencia: {source.origin}</p><blockquote>{source.quote}</blockquote><p className="field-note">Cita literal comprobada contra el extracto enviado. No prueba que la interpretación sea correcta. Revisa también las ediciones que hagas en la explicación.</p></section>)}
  </section>
}

export function AIFeedback({ jarvis, card, answer }: { jarvis: Jarvis; card: StudyCard; answer: string }) {
  const [consent, setConsent] = useState(false)
  const [feedback, setFeedback] = useState<Feedback | null>(null)
  const external = jarvis.data.health.externalAIEnabled
  async function request() { setFeedback(null); const result = await jarvis.requestFeedback(card.id, answer, consent); setConsent(false); if (result) setFeedback(result) }
  return <section className="self-review" aria-label="Revisión orientativa de IA"><h3>Revisar tu razonamiento con IA</h3>{external && <label className="consent-label"><input type="checkbox" checked={consent} disabled={jarvis.busy} onChange={(event) => setConsent(event.target.checked)} />Autorizo enviar esta pregunta, su explicación y mi respuesta a Gemini.</label>}<button className="button outline" disabled={jarvis.data.health.provider === 'demo' || (external && !consent) || !answer.trim() || jarvis.busy} onClick={() => void request()}>{external ? 'Pedir revisión a Gemini' : 'Pedir revisión a Jarvis'}</button>{feedback && <div><h3>Aspectos logrados</h3><ul>{feedback.strengths.map((text, index) => <li key={index}>{text}</li>)}</ul><h3>Aspectos por revisar</h3><ul>{feedback.gaps.map((text, index) => <li key={index}>{text}</li>)}</ul><p>{feedback.guidance}</p><p><strong>Prueba de transferencia:</strong> {feedback.followUp}</p><p><strong>Limitaciones:</strong> {feedback.uncertainty}</p></div>}<p className="field-note">Puede equivocarse. No cambia automáticamente tu autoevaluación ni certifica dominio. Puedes corregir el material mediante una propuesta de revisión.</p></section>
}
