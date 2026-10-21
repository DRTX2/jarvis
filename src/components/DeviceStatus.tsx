import { useEffect, useState } from 'react'
import { Cpu, RefreshCw } from 'lucide-react'
import type { Jarvis } from '../useJarvis'
import type { Device, Page } from '../types'
import { useDraft } from '../useDraft'

export function DeviceStatus({ jarvis, navigate }: { jarvis: Jarvis; navigate: (page: Page) => void }) {
  const [device, setDevice] = useState<Device | null>(null)
  const [error, setError] = useState('')
  const chatDraft = useDraft('chat-message', '')
  const load = () => { setError(''); jarvis.loadDevice().then(setDevice, (e: Error) => setError(e.message)) }
  useEffect(load, [])
  const meter = (label: string, value: number, detail: string) => <label className="device-meter">{label}<meter min={0} max={100} low={70} high={85} optimum={0} value={value} /><span>{value}% · {detail}</span></label>
  return <section className="device-panel" aria-label="Mi equipo">
    <div className="section-heading"><h2><Cpu size={16} /> Mi equipo</h2><button className="icon-button" onClick={load} aria-label="Actualizar estado del equipo"><RefreshCw size={15} /></button></div>
    {device ? <>
      {meter('Memoria', device.memory.usedPercent, `${device.memory.availableGb} de ${device.memory.totalGb} GB libres`)}
      {meter('CPU', Math.min(100, Math.round(device.load1 / device.cores * 100)), `carga ${device.load1} en ${device.cores} núcleos`)}
      {device.disk && meter('Disco', device.disk.usedPercent, `${device.disk.freeGb} GB libres`)}
      {device.tips.length ? <ul className="device-tips">{device.tips.map((tip) => <li key={tip}>{tip}</li>)}</ul> : <p className="field-note">Todo en orden. Sin acciones recomendadas.</p>}
      {device.processes.length > 0 && <details><summary>Lo que más consume</summary><ul>{device.processes.map((item) => <li key={item.name}>{item.name}{item.count > 1 ? ` (${item.count})` : ''}: {item.memPercent}% RAM · {item.cpuPercent}% CPU</li>)}</ul></details>}
      {jarvis.data.health.provider !== 'demo' && <button className="button outline small" onClick={() => { chatDraft.change('Revisa el estado de mi equipo y dime qué optimizar.'); navigate('chat') }}>Pedir consejo a Jarvis</button>}
    </> : error ? <p role="alert">{error}</p> : <p className="field-note">Midiendo…</p>}
    <p className="field-note">Solo lectura: Jarvis no cierra procesos ni cambia nada en tu equipo.</p>
  </section>
}
