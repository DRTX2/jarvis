import { useEffect, useRef, useState } from 'react'
import type { FormEvent } from 'react'
import { AudioLines, Check, Cloud, CloudOff, Mic, MicOff, MessageCircle, Send, ShieldCheck, Trash2, Undo2, Volume2, VolumeX } from 'lucide-react'
import type { Jarvis } from '../useJarvis'
import type { AppliedAction, ChatContext, TaskProposal, TaskAction } from '../types'
import { ChatTask } from './ChatTask'
import { ChatMemory } from './ChatMemory'
import { useDraft } from '../useDraft'
import { MemoryContext } from './MemoryContext'
import { Markdown } from './Markdown'
import { SetupStatus } from './SetupStatus'

type Recognition = { lang: string; interimResults: boolean; start(): void; stop(): void; onend: () => void; onerror: (event: { error: string }) => void; onresult: (event: { results: ArrayLike<{ isFinal: boolean; 0: { transcript: string } }> }) => void }
const speech = window as unknown as { SpeechRecognition?: new () => Recognition; webkitSpeechRecognition?: new () => Recognition }
const Recognizer = speech.SpeechRecognition ?? speech.webkitSpeechRecognition
const lang = navigator.language.startsWith('es') ? navigator.language : 'es-ES'
// Termina al acabar de hablar: el modo conversación espera a que Jarvis calle antes de volver a escuchar.
function speak(text: string) {
  return new Promise<void>((resolve) => {
    try {
      speechSynthesis.cancel()
      const utterance = new SpeechSynthesisUtterance(text.replace(/```[\s\S]*?```/g, ' (código en pantalla) ').replace(/[*#`|•«»]/g, ''))
      utterance.lang = lang
      utterance.onend = () => resolve(); utterance.onerror = () => resolve()
      speechSynthesis.speak(utterance)
    } catch { resolve() /* Sin síntesis de voz en este navegador. */ }
  })
}
const STOP = /^\s*(para|detente|basta|termina|terminar|adiós|adios)\b/i

export function ChatView({ jarvis }: { jarvis: Jarvis }) {
  const { data, busy } = jarvis
  const messageDraft = useDraft('chat-message', '')
  const draft = messageDraft.value
  const setDraft = messageDraft.change
  const [consent, setConsent] = useState(false)
  const [context, setContext] = useState<ChatContext>({ history: false, profile: false, tasks: false, memories: false, memoryIds: [] })
  const [targetId, setTargetId] = useState<number | null>(null)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [proposal, setProposal] = useState<TaskProposal | null>(null)
  const [applied, setApplied] = useState<AppliedAction[]>([])
  const [action, setAction] = useState<TaskAction>('edit')
  const [listening, setListening] = useState(false)
  const [voiceError, setVoiceError] = useState('')
  const [readAloud, setReadAloud] = useState(() => { try { return localStorage.getItem('jarvis:read-aloud') === 'on' } catch { return false } })
  const recognition = useRef<Recognition | null>(null)
  // Modo conversación: escuchar → responder en voz alta → volver a escuchar, hasta que lo apagues o digas «para».
  const [conversation, setConversation] = useState(false)
  const talking = useRef(false)
  const silences = useRef(0)
  const [pending, setPending] = useState<string | null>(null)
  const end = useRef<HTMLDivElement>(null)
  const local = data.health.provider === 'ollama'
  const claude = data.health.provider === 'claude'
  // Híbrido: la nube queda activa en esta sesión mientras el interruptor esté visible y encendido.
  const [useCloud, setUseCloud] = useState(false)
  const hybrid = local && Boolean(data.health.cloud)
  useEffect(() => { end.current?.scrollIntoView({ block: 'nearest' }) }, [data.messages.length, busy, jarvis.live])
  useEffect(() => () => { talking.current = false; recognition.current?.stop(); try { speechSynthesis.cancel() } catch { /* sin voz */ } }, [])
  async function submit(text: string) {
    setPending(text)
    const result = await jarvis.sendMessage(text, consent, context, hybrid && useCloud)
    setPending(null)
    if (!result) { stopConversation(); return }
    messageDraft.clear(); setConsent(false)
    setApplied(result.applied ?? [])
    if (result.proposals?.tasks[0]) setProposal(result.proposals.tasks[0])
    if ((readAloud || talking.current) && result.reply?.content) await speak(result.reply.content)
    if (talking.current) listen()
  }
  function stopConversation(note = '') {
    talking.current = false; setConversation(false); recognition.current?.stop()
    try { speechSynthesis.cancel() } catch { /* sin voz */ }
    if (note) setVoiceError(note)
  }
  function toggleConversation() {
    if (talking.current) { stopConversation(); return }
    talking.current = true; silences.current = 0; setConversation(true); listen()
  }
  async function send(event: FormEvent) { event.preventDefault(); await submit(draft) }
  function listen() {
    if (!Recognizer) return
    if (recognition.current) { recognition.current.stop(); return }
    const recognizer = new Recognizer()
    let heard = ''
    recognizer.lang = lang; recognizer.interimResults = true
    recognizer.onresult = (event) => {
      heard = Array.from(event.results).map((result) => result[0].transcript).join('')
      setDraft(heard)
    }
    recognizer.onerror = (event) => {
      if (event.error === 'no-speech' && talking.current) return
      stopConversation()
      setVoiceError(event.error === 'not-allowed' ? 'Permite el micrófono en el navegador para dictar.' : 'No se pudo escuchar. Vuelve a intentar o escribe tu mensaje.')
    }
    // Enviar al terminar de hablar, salvo que la IA externa requiera consentimiento.
    recognizer.onend = () => {
      recognition.current = null; setListening(false)
      if (talking.current && STOP.test(heard)) { setDraft(''); stopConversation('Conversación terminada.'); return }
      if (heard.trim() && !data.health.externalAIEnabled) { silences.current = 0; void submit(heard); return }
      // En conversación, el silencio vuelve a escuchar una vez; dos seguidos la pausan.
      if (talking.current) { if (++silences.current < 2) listen(); else stopConversation('Pausé la conversación por silencio. Pulsa de nuevo para seguir.') }
    }
    setVoiceError(''); recognition.current = recognizer; recognizer.start(); setListening(true)
  }
  function toggleReadAloud() {
    const next = !readAloud
    setReadAloud(next)
    if (!next) try { speechSynthesis.cancel() } catch { /* sin voz */ }
    try { localStorage.setItem('jarvis:read-aloud', next ? 'on' : 'off') } catch { /* solo esta sesión */ }
  }
  async function clear() { if (await jarvis.clearChat()) setConfirmDelete(false) }
  async function propose() { const next = await jarvis.proposeTask(draft || action, consent, targetId, action); setConsent(false); if (next) setProposal(next) }
  return <>
    <div className="page-heading"><div><p className="date-label">Un espacio para pensar</p><h1>Hablemos un momento.</h1><p>{local ? `IA local en tu equipo: tus datos no salen de aquí${hybrid ? ' salvo en los mensajes que envíes con la nube' : ''}. Pídele recordatorios o tareas: quedan guardados al instante y puedes deshacerlos.` : claude ? 'IA en la nube (Claude): tus mensajes y tu contexto se envían a Anthropic. Pídele recordatorios o tareas: quedan guardados al instante y puedes deshacerlos.' : data.health.externalAIEnabled ? 'Tú eliges qué contexto compartir con Gemini en cada mensaje.' : 'Respuestas predefinidas y locales. La IA externa está desactivada.'}</p></div>{data.messages.length > 0 && <button className="button subtle" disabled={busy} onClick={() => confirmDelete ? void clear() : setConfirmDelete(true)}><Trash2 size={15} />{confirmDelete ? 'Confirmar borrado del chat' : 'Borrar historial'}</button>}</div>
    {data.health.externalAIEnabled && <fieldset className="task-editor"><legend>Contexto opcional para este mensaje</legend>{([['history', 'Últimos 8 mensajes de conversación Gemini (hasta 1200 caracteres por mensaje)'], ['profile', 'Nombre, objetivo y tono del perfil'], ['tasks', 'Hasta 15 pendientes: títulos, prioridad, duración y avisos']] as const).map(([key, label]) => <label className="consent-label" key={key}><input type="checkbox" disabled={busy} checked={context[key]} onChange={(event) => { setContext({ ...context, [key]: event.target.checked }); setConsent(false) }} />{label}</label>)}<p className="field-note">Los cierres, planes, recuerdos e intentos de estudio no se adjuntan. Desmarca todo para enviar solo tu mensaje.</p></fieldset>}
    {data.health.externalAIEnabled && <MemoryContext jarvis={jarvis} context={context} message={draft} change={(next) => { setContext(next); setConsent(false) }} />}
    {confirmDelete && <p className="delete-note">Esto elimina el historial local del chat, no tus tareas ni recuerdos ni el registro de consumo. <button className="text-button" onClick={() => setConfirmDelete(false)}>Cancelar</button></p>}
    <SetupStatus jarvis={jarvis} compact />
    <section className="chat-workspace" aria-label="Conversación"><div className="chat-history" role="log" aria-live="polite" aria-label="Mensajes">
      {data.messages.length === 0 && <div className="chat-welcome"><span className="assistant-symbol"><MessageCircle size={27} /></span><h2>¿Por dónde empezamos?</h2><p>Podemos mirar tus pendientes, preparar un momento de estudio o hacer una pausa con una broma.</p><div className="prompt-list">{['Ayúdame a organizar mi día', 'Quiero estudiar mejor', 'Cuéntame una broma'].map((prompt) => <button className="button outline" key={prompt} onClick={() => setDraft(prompt)}>{prompt}</button>)}</div></div>}
      {data.messages.map((message) => <article className={`message ${message.role}`} key={message.id}><span className="message-author">{message.role === 'user' ? 'Tú' : message.provider === 'gemini' ? 'Jarvis · Gemini' : message.provider === 'ollama' ? 'Jarvis · IA local' : message.provider === 'claude' ? 'Jarvis · Claude (nube)' : 'Jarvis · demo'}</span>{message.role === 'assistant' ? <div className="markdown"><Markdown text={message.content} /></div> : <p>{message.content}</p>}{message.role === 'assistant' && message.context?.memories?.length ? <p className="field-note">Recuerdos compartidos en esta respuesta: {message.context.memories.map((item) => `${item.title} (v${item.version})`).join(', ')}. Esto registra el contexto enviado, no prueba qué influyó en el razonamiento.</p> : null}</article>)}
      {pending && <article className="message user"><span className="message-author">Tú</span><p>{pending}</p></article>}
      {busy && (jarvis.live ? <article className="message assistant chat-live" aria-busy="true"><span className="message-author">Jarvis · escribiendo…</span><div className="markdown"><Markdown text={jarvis.live} /></div></article> : <p className="replying" role="status">{local || claude ? 'Jarvis está pensando…' : 'Preparando respuesta…'}</p>)}{applied.length > 0 && <section className="applied-actions" aria-label="Cambios aplicados">{applied.map((item) => <div key={`${item.action}-${item.task.id}`}><span><Check size={14} /> {{ created: 'Creada', completed: 'Completada', reopened: 'Reabierta' }[item.action]}: {item.task.title}</span><button className="button subtle small" disabled={busy} onClick={async () => { if (await jarvis.undo(item)) setApplied((list) => list.filter((other) => other !== item)) }} aria-label={`Deshacer: ${item.task.title}`}><Undo2 size={14} /> Deshacer</button></div>)}</section>}<div ref={end} />
    </div><form className="chat-composer" onSubmit={send}><label htmlFor="chat-message" className="sr-only">Tu mensaje</label><textarea id="chat-message" placeholder="Escribe lo que tienes en mente…" value={draft} onChange={(e) => { setDraft(e.target.value); setConsent(false) }} rows={2} maxLength={3000} required disabled={busy} /><div className="composer-actions">{hybrid && <button type="button" className={`icon-button mic${useCloud ? ' cloud-on' : ''}`} disabled={busy} onClick={() => setUseCloud(!useCloud)} aria-pressed={useCloud} aria-label="Usar la nube (Claude) para mis mensajes" title={useCloud ? 'Nube activa: pulsa para volver a la IA local' : 'Usar la nube (Claude) para preguntas difíciles'}>{useCloud ? <Cloud size={18} /> : <CloudOff size={18} />}</button>}{Recognizer && <button type="button" className={`icon-button mic${listening ? ' listening' : ''}`} disabled={busy} onClick={listen} aria-pressed={listening} aria-label={listening ? 'Dejar de escuchar' : 'Dictar mensaje por voz'} title={listening ? 'Dejar de escuchar' : 'Dictar por voz'}>{listening ? <MicOff size={18} /> : <Mic size={18} />}</button>}{Recognizer && 'speechSynthesis' in window && !data.health.externalAIEnabled && <button type="button" className={`icon-button mic${conversation ? ' listening' : ''}`} onClick={toggleConversation} aria-pressed={conversation} aria-label="Conversación por voz manos libres" title={conversation ? 'Terminar conversación por voz' : 'Conversar por voz: te escucho, respondo en voz alta y vuelvo a escuchar'}><AudioLines size={18} /></button>}{'speechSynthesis' in window && <button type="button" className="icon-button mic" onClick={toggleReadAloud} aria-pressed={readAloud} aria-label="Leer respuestas en voz alta" title="Leer respuestas en voz alta">{readAloud ? <Volume2 size={18} /> : <VolumeX size={18} />}</button>}<button className="button primary" disabled={busy || !draft.trim() || (data.health.externalAIEnabled && !consent)}><Send size={17} /> Enviar</button></div>{data.health.externalAIEnabled && <label className="consent-label"><input type="checkbox" disabled={busy} checked={consent} onChange={(e) => setConsent(e.target.checked)} /> Autorizo enviar este mensaje y el contexto seleccionado a Gemini. No incluyo información sensible.</label>}{hybrid && useCloud && <p className="cloud-note" role="status">Nube activa ({data.health.cloud?.model}): tu mensaje, los últimos mensajes y tu contexto (pendientes, plan, recuerdos, objetivos y equipo) se envían a Anthropic. Hoy: {data.health.dailyRequests}/{data.health.maxDailyRequests} mensajes.</p>}{(listening || voiceError || conversation) && <p className={`field-note${conversation ? ' voice-status' : ''}`} role="status">{voiceError || (conversation ? (listening ? 'Te escucho… di «para» para terminar.' : busy ? 'Pensando…' : 'Hablando…') : 'Escuchando… habla y haré una pausa para enviar.')}</p>}{Recognizer && !listening && !voiceError && <p className="field-note">El dictado lo procesa tu navegador (en Chrome, en servidores de Google). En el móvil también puedes usar el micrófono del teclado.</p>}</form></section>
    {proposal && <ChatTask key={proposal.id} proposal={proposal} jarvis={jarvis} close={() => setProposal(null)} />}
    <section aria-label="Propuestas pendientes"><h2>Propuestas pendientes</h2><p>Caducan en 24 horas. Las ediciones se conservan en esta pestaña al recargar, sin aprobarse automáticamente.</p>{data.proposals.tasks.filter((item) => item.id !== proposal?.id).map((item) => <button className="button outline" disabled={busy} key={item.id} onClick={() => setProposal(item)}>Revisar propuesta: {item.target?.title ?? item.task.title} · {item.action ?? 'edit'}</button>)}{data.proposals.memories.map((item) => <ChatMemory key={item.id} proposal={item} jarvis={jarvis} />)}</section>
    <details className="library-tools" open={!local}><summary>Proponer acciones manualmente</summary>
    <label>Tarea para la propuesta<select aria-label="Tarea para la propuesta" disabled={busy || Boolean(proposal)} value={targetId ?? ''} onChange={(event) => { setTargetId(event.target.value ? Number(event.target.value) : null); setAction('edit'); setConsent(false) }}><option value="">Crear tarea nueva</option>{data.tasks.map((task) => <option key={task.id} value={task.id}>Modificar #{task.id}: {task.title}</option>)}</select></label>
    {targetId && <label>Acción sobre la tarea<select aria-label="Acción sobre la tarea" disabled={busy || Boolean(proposal)} value={action} onChange={(event) => { setAction(event.target.value as TaskAction); setConsent(false) }}><option value="edit">Modificar campos y aviso</option><option value="complete">Completar</option><option value="reopen">Reabrir</option><option value="delete">Borrar</option></select></label>}
    <div className="form-actions"><button className="button outline" disabled={busy || (action === 'edit' && (!draft.trim() || (data.health.externalAIEnabled && !consent))) || Boolean(proposal)} onClick={() => void propose()}>{action !== 'edit' ? 'Proponer acción sobre la tarea' : targetId ? 'Proponer cambios a la tarea' : 'Proponer tarea con este mensaje'}</button><button className="button outline" disabled={busy || !draft.trim() || (data.health.externalAIEnabled && !consent)} onClick={() => { void jarvis.proposeMemory(draft, consent); setConsent(false) }}>Proponer recuerdo con este mensaje</button></div>
    <p className="field-note">Gemini recibe el mensaje y la tarea elegida solo al proponer cambios, con consentimiento. Completar, reabrir y borrar son acciones locales y no usan cuota. Los recuerdos se proponen solo desde el mensaje. Nada se aplica sin confirmar.</p>
    <p className="field-note">Borrador local en esta pestaña; se conserva al navegar y recargar. No incluye el consentimiento. {messageDraft.warning}</p><button className="button subtle" disabled={busy || !draft} onClick={messageDraft.clear}>Vaciar borrador del mensaje</button></details>
    <p className="privacy-note"><ShieldCheck size={15} /> El chat se guarda en SQLite en este equipo. Crear y completar se pueden deshacer; borrar, editar y guardar recuerdos piden tu confirmación. No sustituye asesoramiento profesional.</p>
  </>
}
