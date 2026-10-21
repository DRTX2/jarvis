import { useEffect, useState } from 'react'
import { BookOpen, Check, ChevronRight, ExternalLink, Lightbulb, RotateCcw } from 'lucide-react'
import type { Jarvis } from '../useJarvis'
import { isDue, readableDate } from '../api'
import { AIFeedback, DynamicLearning } from './DynamicLearning'
import { blankSession, StudyCoach } from './StudyCoach'
import type { StudySession } from '../types'
import { KnowledgeLibrary } from './KnowledgeLibrary'
import { PracticeSession } from './PracticeSession'

export function StudyView({ jarvis }: { jarvis: Jarvis }) {
  const { data, busy } = jarvis
  const [selected, setSelected] = useState(data.study.cards.find((card) => isDue(card.nextReviewAt))?.id ?? data.study.cards[0]?.id)
  const [answer, setAnswer] = useState('')
  const [revealed, setRevealed] = useState(false)
  const [hint, setHint] = useState(false)
  const [saved, setSaved] = useState(false)
  const [technique, setTechnique] = useState<StudySession>(blankSession)
  const [hidden, setHidden] = useState(false)
  const [progressSaved, setProgressSaved] = useState(false)
  const [filter, setFilter] = useState('')
  const [completed, setCompleted] = useState<{ cardId: string; revision: number; attempt: number } | null>(null)
  const goal = data.goals.find((item) => item.id === jarvis.studyGoalId)
  const card = data.study.cards.find((item) => item.id === selected)
  useEffect(() => {
    const draft = data.study.sessions.find((item) => item.cardId === card?.id && item.revision === card?.revision)?.session ?? blankSession
    setAnswer(draft.answer); setRevealed(draft.revealed); setHint(false); setSaved(false); setTechnique(draft); setHidden(false); setProgressSaved(false)
  }, [card?.id, card?.revision])
  const session = { ...technique, answer, revealed }
  const update = (changes: Partial<StudySession>) => { setTechnique((old) => ({ ...old, ...changes })); setProgressSaved(false) }
  const due = data.study.cards.filter((item) => isDue(item.nextReviewAt)).sort((a, b) => (a.nextReviewAt ?? '9999').localeCompare(b.nextReviewAt ?? '9999'))
  const mixed = due.find((item) => item.id !== selected && item.topic !== card?.topic) ?? due.find((item) => item.id !== selected)
  const choose = (id: string) => { if (id !== selected) setSelected(id) }
  async function review(grade: 'again' | 'good') {
    if (card && await jarvis.review(card.id, answer, grade, session, card.revision)) { setSaved(true); setCompleted((old) => ({ cardId: card.id, revision: card.revision, attempt: (old?.attempt ?? 0) + 1 })) }
  }
  return <>
    <div className="page-heading"><div><p className="date-label">Recuperación activa</p><h1>Primero, con tus palabras.</h1><p>Intenta recordar antes de mirar. Una dificultad es información, no un fracaso.</p></div><span className="tag">Autoevaluación guiada</span></div>
    <details className="library-tools"><summary>Crear o revisar material de estudio</summary><DynamicLearning jarvis={jarvis} card={card} /></details>
    <details className="library-tools"><summary>Aportar y consultar mis materiales</summary><KnowledgeLibrary jarvis={jarvis} /></details>
    <label>Objetivo de práctica<select aria-label="Objetivo de práctica" disabled={busy} value={goal?.id ?? ''} onChange={(event) => { jarvis.selectStudyGoal(event.target.value); setCompleted(null) }}><option value="">Práctica libre</option>{data.goals.map((item) => <option key={item.id} value={item.id}>{item.title}</option>)}</select></label>
    {goal && <PracticeSession key={`${goal.id}-${goal.version}`} jarvis={jarvis} goal={goal} choose={choose} completed={completed} />}
    <div className="form-actions"><button className="button outline" disabled={busy || !due.length} onClick={() => choose(due[0].id)}>Practicar repaso pendiente</button><button className="button outline" disabled={busy || !mixed} onClick={() => { if (mixed) choose(mixed.id) }}>Alternar pregunta de práctica</button></div><p className="field-note">Primero los repasos vencidos. Alternar busca otro tema pendiente cuando existe; es práctica intercalada, no una promesa de que mezclar siempre sea mejor. Guarda tu progreso antes de cambiar.</p>
    <label>Buscar en la biblioteca<input value={filter} onChange={(event) => setFilter(event.target.value)} placeholder="Tema o pregunta" /></label>
    <div className="study-layout">
      <aside className="study-index"><BookOpen size={22} /><h2>Biblioteca de estudio</h2><p>{due.length} preguntas disponibles para repasar</p><ul>{data.study.cards.map((item, index) => ({ item, index })).filter(({ item }) => `${item.topic} ${item.question}`.toLocaleLowerCase().includes(filter.toLocaleLowerCase())).map(({ item, index }) => <li key={item.id}><button className={selected === item.id ? 'selected' : ''} onClick={() => choose(item.id)} disabled={busy}><span className="question-number">{index + 1}</span><span>{item.generated ? item.topic : ['Cliente y servidor', 'Estados HTTP', 'Idempotencia'][index]}<small>{item.nextReviewAt ? `Próximo: ${readableDate(item.nextReviewAt)}` : 'Sin practicar todavía'}</small></span>{selected === item.id && <ChevronRight size={15} />}</button></li>)}</ul><p className="index-note">{data.study.attempts} intentos registrados. Este contador no mide dominio.</p></aside>
      <section className="study-workspace" aria-label="Pregunta de estudio">{card ? <>
        <div className="section-heading"><span className="muted">Pregunta {data.study.cards.indexOf(card) + 1} de {data.study.cards.length}</span><span className="tag quiet">{session.method === 'feynman' ? 'Feynman' : session.method === 'transfer' ? 'Transferencia' : 'Active recall'}</span></div>
        <h2 className="study-question">{card.question}</h2>
        <StudyCoach session={session} change={update} busy={busy} hideExplanation={() => setHidden(true)} save={() => void jarvis.saveStudySession(card.id, card.revision, session).then((ok) => { if (ok) setProgressSaved(true) })} attempt={<><label htmlFor="first-attempt">Tu explicación</label><textarea id="first-attempt" value={answer} onChange={(e) => { setAnswer(e.target.value); setProgressSaved(false) }} placeholder="Sin consultar apuntes: ¿qué recuerdas y cómo lo explicarías?" rows={5} maxLength={4000} disabled={revealed || busy} /></>} />
        {progressSaved && <p role="status">Progreso guardado. Puedes retomar esta pregunta.</p>}
        {!revealed && <div className="study-controls"><button className="button subtle" disabled={busy} onClick={() => { setHint(!hint); update({ hintUsed: true }) }} aria-expanded={hint}><Lightbulb size={16} /> {hint ? 'Ocultar pista' : 'Necesito una pista'}</button><button className="button primary" disabled={busy || !answer.trim()} onClick={() => setRevealed(true)}>Mostrar explicación</button></div>}
        {hint && <p className="hint-box">{card.hint}</p>}
        {revealed && !hidden && <div className="answer-panel"><h3>Compara, no solo releas.</h3><p>{card.answer}</p><ul>{card.checkpoints.map((point) => <li key={point}><Check size={14} /><span>{point}</span></li>)}</ul>{card.source ? <a href={card.source} target="_blank" rel="noreferrer">Consultar referencia en MDN <ExternalLink size={13} /></a> : <p className="field-note">Material generado, versión {card.revision}. Las citas son trazables, no una verificación de exactitud: contrástalo antes de confiar en él.</p>}{card.references?.map((reference, index) => <details key={index}><summary>Fuente: {reference.title}</summary><p>Procedencia: {reference.origin}</p><blockquote>{reference.quote}</blockquote>{reference.url && <a href={reference.url} target="_blank" rel="noreferrer">Consultar fuente externa</a>}<p className="field-note">Copia del extracto usado; puede conservarse aunque borres el material de la biblioteca.</p></details>)}</div>}
        {revealed && hidden && <button className="button subtle" onClick={() => setHidden(false)}>Volver a comparar la explicación</button>}
        {revealed && !hidden && <AIFeedback key={`${card.id}-${card.revision}-${answer}`} jarvis={jarvis} card={card} answer={answer} />}
        {revealed && !saved && <div className="self-review"><p>Antes de ampliar el intervalo, reconstruye la respuesta y aplica la idea a un caso nuevo. Tú valoras el intento; la IA no certifica dominio. Si hubo pistas o dificultades declaradas, se mantiene un repaso corto.</p><div className="form-actions"><button className="button outline" disabled={busy} onClick={() => void review('again')}><RotateCcw size={15} /> Necesito practicar</button><button className="button primary" disabled={busy || !session.retry.trim() || !session.transfer.trim()} onClick={() => void review('good')}><Check size={16} /> Lo recordé</button></div></div>}
        {saved && <div className="review-saved" role="status"><Check size={19} /><div><strong>Repaso guardado.</strong><p>{card.nextReviewAt ? `Próximo repaso: ${readableDate(card.nextReviewAt)}.` : 'Actualizando la próxima fecha…'}</p></div>{due.find((item) => item.id !== card.id) && <button className="button outline" onClick={() => choose(due.find((item) => item.id !== card.id)!.id)}>Siguiente pregunta <ChevronRight size={16} /></button>}</div>}
        <p className="study-disclaimer">Plan de repaso inicial: 10 minutos si necesitas practicar; 1, 3, 7, 14 y 30 días tras valoraciones positivas sucesivas. No es una certificación de conocimiento.</p>
      </> : <div className="empty-state"><h2>Aún no hay preguntas disponibles.</h2><p>Comprueba que la API esté activa y vuelve a intentar.</p></div>}</section>
    </div>
    <section className="self-review" aria-label="Historial de práctica"><h2>Tus últimos intentos</h2><p className="field-note">Hasta 20 intentos recientes de la biblioteca. Son evidencias y dificultades declaradas, no una puntuación de dominio. La exportación conserva todo el historial.</p>{data.study.recentAttempts.length ? data.study.recentAttempts.map((attempt) => <details key={attempt.id}><summary>{readableDate(attempt.createdAt)} · {data.study.cards.find((item) => item.id === attempt.cardId)?.topic ?? 'Material anterior'} · {attempt.grade === 'again' ? 'Repaso corto' : 'Intervalo ampliado'}</summary><p><strong>Primer intento:</strong> {attempt.answer}</p>{attempt.technique && <><p><strong>Técnica:</strong> {attempt.technique.method} · Confianza declarada: {attempt.technique.confidence || 'sin registrar'} · Pista: {attempt.technique.hintUsed ? 'sí' : 'no'}</p><p><strong>Segundo intento:</strong> {attempt.technique.retry || 'Sin registrar'}</p><p><strong>Aplicación:</strong> {attempt.technique.transfer || 'Sin registrar'}</p><p><strong>Dificultades declaradas:</strong> {attempt.technique.errors.map((error) => ({ recall: 'recuerdo', understanding: 'comprensión', application: 'aplicación', aids: 'dependencia de ayudas' })[error]).join(', ') || 'Ninguna marcada'}</p></>}</details>) : <p className="muted">Al cerrar una práctica aparecerá aquí tu evidencia.</p>}</section>
  </>
}
