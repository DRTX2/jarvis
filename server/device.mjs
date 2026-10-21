import os from 'node:os'
import { statfsSync } from 'node:fs'
import { execFile } from 'node:child_process'
import { promisify } from 'node:util'

const run = promisify(execFile)
const gb = (bytes) => Math.round(bytes / 2 ** 30 * 10) / 10

// shortcut: procesos solo en Linux (ps --sort), usar systeminformation si se soporta macOS/Windows.
async function topProcesses() {
  if (process.platform !== 'linux') return []
  try {
    const { stdout } = await run('ps', ['-eo', 'comm,%cpu,%mem', '--sort=-%mem', '--no-headers'], { timeout: 2000 })
    const merged = new Map()
    for (const line of stdout.trim().split('\n')) {
      const [mem, cpu, ...name] = line.trim().split(/\s+/).reverse()
      const command = name.reverse().join(' ')
      // Sin esta etiqueta la IA recomienda cerrar su propio motor.
      const key = /^(llama-server|ollama)/.test(command) ? `${command} (IA local de Jarvis)` : command
      const item = merged.get(key) ?? { name: key, cpuPercent: 0, memPercent: 0, count: 0 }
      merged.set(key, { ...item, cpuPercent: item.cpuPercent + Number(cpu), memPercent: item.memPercent + Number(mem), count: item.count + 1 })
    }
    return [...merged.values()].sort((a, b) => b.memPercent - a.memPercent).slice(0, 6)
      .map((item) => ({ ...item, cpuPercent: Math.round(item.cpuPercent), memPercent: Math.round(item.memPercent * 10) / 10 }))
  } catch { return [] }
}

// shortcut: solo NVIDIA (nvidia-smi); AMD/Intel/Apple aparecen como «no detectada» hasta añadir rocm-smi o system_profiler.
export async function gpuInfo() {
  try {
    const { stdout } = await run('nvidia-smi', ['--query-gpu=name,memory.total', '--format=csv,noheader,nounits'], { timeout: 3000 })
    const [name, memory] = stdout.trim().split('\n')[0].split(',').map((value) => value.trim())
    return { name, vramGb: Math.round(Number(memory) / 1024 * 10) / 10 }
  } catch { return null }
}

export function deviceTips({ cores, load1, memory, disk, uptimeHours, processes }) {
  const tips = []
  const heavy = processes.find((item) => !item.name.endsWith('(IA local de Jarvis)'))
  if (memory.usedPercent >= 85) tips.push(`Memoria al ${memory.usedPercent}%. ${heavy ? `${heavy.name} usa ${heavy.memPercent}% de la RAM; ciérralo o reduce pestañas si no lo necesitas.` : 'Cierra aplicaciones que no uses.'}`)
  if (load1 > cores) tips.push(`CPU saturada (carga ${load1} con ${cores} núcleos). Espera a que termine la tarea pesada o ciérrala.`)
  if (disk && disk.usedPercent >= 90) tips.push(`Disco al ${disk.usedPercent}% (${disk.freeGb} GB libres). Vacía la papelera, descargas y cachés de paquetes.`)
  if (uptimeHours >= 24 * 7) tips.push(`Encendido hace ${Math.round(uptimeHours / 24)} días. Reiniciar aplica actualizaciones y libera memoria.`)
  return tips
}

export async function deviceSnapshot() {
  const total = os.totalmem()
  const memory = { totalGb: gb(total), availableGb: gb(os.freemem()), usedPercent: Math.round((1 - os.freemem() / total) * 100) }
  let disk = null
  try {
    const stats = statfsSync(os.homedir())
    disk = { totalGb: gb(stats.blocks * stats.bsize), freeGb: gb(stats.bavail * stats.bsize), usedPercent: Math.round((1 - stats.bavail / stats.blocks) * 100) }
  } catch { /* Sin disco legible: se omite, no se inventa. */ }
  const cores = os.cpus().length
  const load1 = Math.round(os.loadavg()[0] * 10) / 10
  const uptimeHours = Math.round(os.uptime() / 360) / 10
  const processes = await topProcesses()
  const snapshot = { platform: `${os.type()} ${os.release()}`, cpu: os.cpus()[0]?.model ?? 'desconocida', cores, load1, memory, disk, uptimeHours, processes }
  return { ...snapshot, tips: deviceTips(snapshot), capturedAt: new Date().toISOString() }
}
