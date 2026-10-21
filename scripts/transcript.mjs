// Convierte un transcript .jsonl de Claude Code en Markdown: mensajes del usuario, respuestas y una línea por herramienta.
import { readFileSync, writeFileSync } from 'node:fs'
const [input, output] = process.argv.slice(2)
const clean = (text) => text.replace(/<system-reminder>[\s\S]*?<\/system-reminder>/g, '').replace(/<\/?(command-[a-z]+|local-command-[a-z]+)>/g, '').trim()
const out = ['# Historial de la sesión con Claude Code', '', `Fuente: \`${input.split('/').pop()}\`. Solo texto del usuario, respuestas y una línea por herramienta usada (sin salidas ni razonamiento).`, '']
for (const line of readFileSync(input, 'utf8').trim().split('\n')) {
  const entry = JSON.parse(line)
  const time = entry.timestamp?.replace('T', ' ').slice(0, 16)
  if (entry.type === 'user' && !entry.isMeta) {
    const content = entry.message?.content
    const text = typeof content === 'string' ? content : (content ?? []).filter((b) => b.type === 'text').map((b) => b.text).join('\n')
    if (!clean(text)) continue
    out.push(entry.isCompactSummary ? `## Resumen automático de contexto · ${time}` : `## 🧑 Usuario · ${time}`, '', clean(text), '')
  } else if (entry.type === 'assistant') {
    for (const block of entry.message?.content ?? []) {
      if (block.type === 'text' && block.text.trim()) out.push(`### 🤖 Claude · ${time}`, '', block.text.trim(), '')
      if (block.type === 'tool_use') {
        const i = block.input ?? {}
        const detail = i.description ?? i.file_path ?? i.skill ?? i.query ?? i.prompt?.slice(0, 80) ?? ''
        out.push(`- 🔧 \`${block.name}\` ${String(detail).replace(/\n/g, ' ')}`)
      }
    }
  }
}
writeFileSync(output, out.join('\n') + '\n')
console.log(output, out.length, 'líneas')
