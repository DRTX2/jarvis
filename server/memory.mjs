import { randomUUID } from 'node:crypto'
import { z } from 'zod'
import { problem } from './planning.mjs'
import { daySchema } from './planning.mjs'

export const memorySchema = z.object({ title: z.string().trim().min(1).max(80), content: z.string().trim().min(1).max(500), origin: z.string().trim().min(1).max(120).default('Declaración manual'), validUntil: daySchema.nullable().default(null) }).strict()
export function createMemoryStore(db, clock) {
  const list = () => db.prepare('SELECT id, title, content, version, origin, valid_until AS validUntil, created_at AS createdAt, source_text AS sourceText, updated_at AS updatedAt FROM memories ORDER BY updated_at DESC, id').all().map((row) => ({ ...row, expired: Boolean(row.validUntil && row.validUntil < clock().toISOString().slice(0, 10)) }))
  return {
    memories: list,
    pendingMemoryProposals() {
      return db.prepare('SELECT id, memory_json, created_at FROM memory_proposals WHERE result_json IS NULL AND created_at >= ? ORDER BY created_at, id').all(new Date(clock().getTime() - 86_400_000).toISOString()).map((row) => ({ id: row.id, memory: JSON.parse(row.memory_json) }))
    },
    createMemoryProposal(memory, sourceText = null) {
      const id = randomUUID()
      db.prepare('INSERT INTO memory_proposals (id, memory_json, created_at, source_text) VALUES (?, ?, ?, ?)').run(id, JSON.stringify(memory), clock().toISOString(), sourceText)
      return { id, memory }
    },
    approveMemoryProposal(id, memory) {
      db.exec('BEGIN IMMEDIATE')
      try {
        const row = db.prepare('SELECT * FROM memory_proposals WHERE id = ?').get(id)
        if (!row) throw problem('Propuesta no encontrada.', 404)
        if (row.result_json) { db.exec('COMMIT'); return JSON.parse(row.result_json) }
        if (Date.parse(row.created_at) < clock().getTime() - 86_400_000) throw problem('La propuesta caducó.', 409)
        const saved = this.saveMemory(null, 0, { ...memory, origin: 'Propuesta de chat revisada' }, row.source_text)
        db.prepare('UPDATE memory_proposals SET result_json = ? WHERE id = ?').run(JSON.stringify(saved), id)
        db.exec('COMMIT'); return saved
      } catch (error) { db.exec('ROLLBACK'); throw error }
    },
    discardMemoryProposal(id) { db.prepare('DELETE FROM memory_proposals WHERE id = ? AND result_json IS NULL').run(id) },
    saveMemory(id, expectedVersion, input, sourceText = null) {
      const old = id ? db.prepare('SELECT version FROM memories WHERE id = ?').get(id) : null
      if (id && !old) throw problem('Recuerdo no encontrado.', 404)
      if ((old?.version ?? 0) !== expectedVersion) throw problem('El recuerdo cambió. Actualiza antes de corregirlo.', 409)
      if (!id && list().length >= 50) throw problem('El límite es de 50 recuerdos explícitos.')
      const key = id ?? randomUUID()
      const now = clock().toISOString()
      db.prepare(`INSERT INTO memories (id, title, content, version, updated_at, origin, valid_until, created_at, source_text) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(id) DO UPDATE SET title = excluded.title, content = excluded.content, version = excluded.version, updated_at = excluded.updated_at, origin = excluded.origin, valid_until = excluded.valid_until`).run(key, input.title, input.content, expectedVersion + 1, now, input.origin ?? 'Declaración manual', input.validUntil ?? null, now, sourceText)
      return list().find((item) => item.id === key)
    },
    deleteMemory(id, version) {
      db.exec('BEGIN IMMEDIATE')
      try {
        if (!db.prepare('DELETE FROM memories WHERE id = ? AND version = ?').run(id, version).changes) throw problem('El recuerdo cambió o ya fue borrado. Actualiza la lista.', 409)
        db.prepare("DELETE FROM memory_proposals WHERE json_extract(result_json, '$.id') = ?").run(id)
        db.exec('COMMIT')
      } catch (error) { db.exec('ROLLBACK'); throw error }
    },
  }
}
