import type { Material } from '../types'

export function MaterialEditor({ material, change, busy }: { material: Material; change: (material: Material) => void; busy: boolean }) {
  return <div className="material-fields">
    <label htmlFor="material-topic">Tema del material</label><input id="material-topic" maxLength={120} disabled={busy} value={material.topic} onChange={(event) => change({ ...material, topic: event.target.value })} />
    {([['question', 'Pregunta propuesta', 1500], ['hint', 'Pista propuesta', 1000], ['answer', 'Explicación propuesta', 6000]] as const).map(([field, label, maxLength]) => <div key={field}><label htmlFor={`material-${field}`}>{label}</label><textarea id={`material-${field}`} rows={field === 'answer' ? 6 : 3} maxLength={maxLength} disabled={busy} value={material[field]} onChange={(event) => change({ ...material, [field]: event.target.value })} /></div>)}
    <label htmlFor="material-checkpoints">Criterios de comprobación (uno por línea, hasta seis)</label><textarea id="material-checkpoints" rows={4} disabled={busy} value={material.checkpoints.join('\n')} onChange={(event) => change({ ...material, checkpoints: event.target.value.split('\n') })} />
  </div>
}
