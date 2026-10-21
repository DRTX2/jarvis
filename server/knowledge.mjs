import { randomUUID } from 'node:crypto'
import { z } from 'zod'
import { problem } from './planning.mjs'

export const knowledgeSchema = z.object({
  title: z.string().trim().min(1).max(160), topic: z.string().trim().min(1).max(80),
  content: z.string().trim().min(1).max(16000),
  origin: z.string().trim().min(1).max(300),
  url: z.string().max(2000).url().refine((value) => { const url = new URL(value); return ['https:', 'http:'].includes(url.protocol) && !url.username && !url.password }).nullable(),
}).strict()
export function createKnowledgeStore(db, clock) {
  const list = () => db.prepare('SELECT id, title, topic, content, origin, url, created_at AS createdAt FROM knowledge ORDER BY created_at DESC, id').all()
  return {
    knowledge: list,
    addKnowledge(input) {
      if (db.prepare('SELECT COUNT(*) AS n FROM knowledge').get().n >= 100) throw problem('El límite inicial es de 100 materiales. Elimina uno antes de añadir otro.')
      const id = randomUUID()
      db.prepare('INSERT INTO knowledge (id, title, topic, content, origin, url, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)').run(id, input.title, input.topic, input.content, input.origin, input.url, clock().toISOString())
      return list().find((item) => item.id === id)
    },
    deleteKnowledge(id) { return db.prepare('DELETE FROM knowledge WHERE id = ?').run(id).changes > 0 },
  }
}
