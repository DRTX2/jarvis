import { existsSync, mkdirSync, readdirSync, unlinkSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'

// Copia diaria con VACUUM INTO: consistente aunque Jarvis esté escribiendo. Conserva las `keep` más recientes.
export function backupDatabase(db, path, now = new Date(), keep = 7) {
  if (!path || path === ':memory:') return null
  const directory = join(dirname(resolve(path)), 'backups')
  mkdirSync(directory, { recursive: true, mode: 0o700 })
  const file = join(directory, `jarvis-${now.toLocaleDateString('sv')}.sqlite`)
  if (existsSync(file)) return null
  db.exec(`VACUUM INTO '${file.replaceAll("'", "''")}'`)
  const copies = readdirSync(directory).filter((name) => /^jarvis-\d{4}-\d{2}-\d{2}\.sqlite$/.test(name)).sort()
  for (const name of copies.slice(0, -keep)) unlinkSync(join(directory, name))
  return file
}
