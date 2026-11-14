import { useEffect, useState } from 'react'
import { MessageCircle, Sun, Volume2 } from 'lucide-react'
import type { Jarvis } from '../useJarvis'
import type { Briefing as BriefingData, Page } from '../types'
import { useDraft } from '../useDraft'

export function Briefing({ jarvis, navigate }: { jarvis: Jarvis; navigate: (page: Page) => void }) {
  const [briefing, setBriefing] = useState<BriefingData | null>(null)
  const chatDraft = useDraft('chat-message', '')
  const { tasks, study } = jarvis.data
  // Se recalcula cuando cambian tus tareas o repasos: siempre refleja lo que hay ahora.
  const key = `${tasks.map((task) => `${task.id}-${task.version}`).join()}|${study.attempts}`
  useEffect(() => { jarvis.loadBriefing().then(setBriefing, () => setBriefing(null)) }, [key])
  if (!briefing) return null
  const text = [briefing.greeting, ...briefing.lines].join(' ')
  function listen() {
    try { speechSynthesis.cancel(); const utterance = new SpeechSynthesisUtterance(text); utterance.lang = 'es-ES'; speechSynthesis.speak(utterance) } catch { /* sin voz */ }
  }
  return <section className="briefing" aria-label="Tu día en 30 segundos">
    <div className="section-heading"><h2><Sun size={16} /> {briefing.greeting}</h2>{'speechSynthesis' in window && <button className="icon-button" onClick={listen} aria-label="Escuchar el resumen del día" title="Escuchar"><Volume2 size={16} /></button>}</div>
    <ul>{briefing.lines.map((line) => <li key={line}>{line}</li>)}</ul>
    {jarvis.data.health.provider !== 'demo' && <button className="button outline small" onClick={() => { chatDraft.change(`${text}\n\nAyúdame a ordenar el día: ¿qué hago primero y cuándo?`); navigate('chat') }}><MessageCircle size={15} /> Ordénalo conmigo</button>}
  </section>
}
