import { useEffect, useState } from 'react'
import type { ReactNode } from 'react'
import { Check, CircleAlert } from 'lucide-react'
import type { Jarvis } from '../useJarvis'
import type { Setup } from '../types'

const engines = { ollama: 'IA local (Ollama)', claude: 'Nube (Claude)', gemini: 'Gemini, con consentimiento por mensaje', demo: 'Demo, sin IA' }

// Lo que falta para que Jarvis funcione, con el comando exacto. `compact` solo avisa si la IA local no está lista.
export function SetupStatus({ jarvis, compact = false }: { jarvis: Jarvis; compact?: boolean }) {
  const [setup, setSetup] = useState<Setup | null>(null)
  useEffect(() => { jarvis.loadSetup().then(setSetup, () => setSetup(null)) }, [])
  if (!setup) return null
  const { gpu, ollama, cloud, provider } = setup
  const localReady = ollama.running && ollama.modelReady
  const fix = !ollama.running ? <>Instala Ollama desde <a href="https://ollama.com/download" target="_blank" rel="noreferrer">ollama.com</a> o inícialo con <code>ollama serve</code>.</>
    : !ollama.modelReady ? <>Descarga el modelo: <code>ollama pull {ollama.model}</code></> : null
  if (compact) return provider === 'ollama' && fix ? <p className="setup-alert" role="status"><CircleAlert size={15} /> La IA local no está lista. {fix}{cloud && ' Mientras tanto puedes usar la nube.'}</p> : null
  const row = (ok: boolean, label: string, detail: ReactNode) => <li className={ok ? 'ok' : 'todo'}>{ok ? <Check size={15} /> : <CircleAlert size={15} />}<span><strong>{label}:</strong> {detail}</span></li>
  return <section className="setup-panel" aria-label="Configura tu Jarvis"><h2>Configura tu Jarvis</h2><ul>
    {row(provider !== 'demo', 'Motor activo', engines[provider])}
    {row((gpu?.vramGb ?? 0) >= 8, 'GPU', gpu ? `${gpu.name} · ${gpu.vramGb} GB${gpu.vramGb < 8 ? ' (el modelo local recomendado necesita 8 GB; usa la nube)' : ''}` : 'No se detectó una GPU NVIDIA. Sin GPU, la nube (AI_PROVIDER=claude) es la opción recomendada.')}
    {row(localReady, 'IA local', localReady ? `${ollama.model} listo` : fix)}
    {row(Boolean(cloud), 'Nube', cloud ? `${cloud} configurado` : <>Opcional: añade <code>ANTHROPIC_API_KEY</code> y <code>EXTERNAL_AI_TERMS_ACCEPTED=true</code> en <code>.env</code> y reinicia.</>)}
    {provider === 'demo' && localReady && row(false, 'Siguiente paso', <>La IA local está lista: quita <code>AI_PROVIDER=demo</code> de <code>.env</code> y reinicia.</>)}
  </ul></section>
}
