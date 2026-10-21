import { CalendarDays } from 'lucide-react'
import { localDay } from '../api'
import type { Jarvis } from '../useJarvis'

export function DayPicker({ jarvis }: { jarvis: Jarvis }) {
  return <div className="day-picker">
    <label><CalendarDays size={15} /> Fecha a consultar
      <input type="date" value={jarvis.day} min="2000-01-01" max="2100-12-31" disabled={jarvis.busy} onChange={(event) => jarvis.selectDay(event.target.value)} />
    </label>
    {jarvis.day !== localDay() && <button className="button subtle small" disabled={jarvis.busy} onClick={() => jarvis.selectDay(localDay())}>Volver a hoy</button>}
  </div>
}
