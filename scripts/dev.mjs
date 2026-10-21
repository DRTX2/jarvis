import { spawn } from 'node:child_process'

// Dos procesos propios, sin intérprete shell ni dependencia de concurrencia.
const children = [
  spawn(process.execPath, ['--env-file-if-exists=.env', '--watch', 'server/index.mjs'], { stdio: 'inherit' }),
  spawn(process.execPath, ['node_modules/vite/bin/vite.js', '--host', '127.0.0.1'], { stdio: 'inherit' }),
]
let stopping = false
function stop(code = 0) {
  if (stopping) return
  stopping = true
  process.exitCode = code
  for (const child of children) if (child.exitCode === null) child.kill('SIGTERM')
}
for (const child of children) {
  child.once('error', (error) => { console.error(error.message); stop(1) })
  child.once('exit', (code) => { if (!stopping) stop(code ?? 1) })
}
process.on('SIGINT', () => stop())
process.on('SIGTERM', () => stop())
