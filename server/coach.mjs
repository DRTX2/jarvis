import { z } from 'zod'
import { randomUUID } from 'node:crypto'
import { problem } from './planning.mjs'

export const sessionSchema = z.object({
  method: z.enum(['recall', 'feynman', 'transfer']),
  answer: z.string().max(4000), retry: z.string().max(2000), transfer: z.string().max(2000),
  confidence: z.number().int().min(0).max(3), hintUsed: z.boolean(), revealed: z.boolean(),
  errors: z.array(z.enum(['recall', 'understanding', 'application', 'aids'])).max(4),
}).strict()
export const proposedTaskSchema = z.object({
  title: z.string().trim().min(1).max(200), category: z.enum(['personal', 'study', 'work']),
  priority: z.enum(['high', 'normal', 'low']), estimatedMinutes: z.number().int().min(5).max(240),
}).strict()
export const taskApprovalSchema = proposedTaskSchema.extend({ dueAt: z.string().datetime({ offset: true }).transform((value) => new Date(value).toISOString()).nullable().optional() })
export function createCoachStore(db, clock) {
  return {
    sessions() { return db.prepare('SELECT card_id AS cardId, revision, version, session_json AS session, updated_at AS updatedAt FROM study_sessions').all().map((row) => ({ ...row, session: JSON.parse(row.session) })) },
    saveSession(cardId, revision, expectedVersion, session) {
      if (this.learningCard(cardId)?.revision !== revision) throw problem('La pregunta cambió. Conserva tu texto y actualiza antes de guardar.', 409)
      const old = db.prepare('SELECT version FROM study_sessions WHERE card_id = ? AND revision = ?').get(cardId, revision)
      if ((old?.version ?? 0) !== expectedVersion) throw problem('La sesión cambió en otra vista. Actualiza antes de guardar.', 409)
      db.prepare(`INSERT INTO study_sessions (card_id, revision, version, session_json, updated_at) VALUES (?, ?, ?, ?, ?)
        ON CONFLICT(card_id, revision) DO UPDATE SET version = excluded.version, session_json = excluded.session_json, updated_at = excluded.updated_at`)
        .run(cardId, revision, expectedVersion + 1, JSON.stringify(session), clock().toISOString())
    },
    pendingTaskProposals() {
      return db.prepare('SELECT * FROM task_proposals WHERE task_id IS NULL AND result_json IS NULL AND created_at >= ? ORDER BY created_at, id').all(new Date(clock().getTime() - 86_400_000).toISOString()).map((row) => ({ id: row.id, task: JSON.parse(row.task_json), target: row.target_json ? JSON.parse(row.target_json) : (row.target_id ? { ...this.getTask(row.target_id), id: row.target_id, version: row.target_version } : null), action: row.action }))
    },
    createTaskProposal(task, target = null, action = 'edit') {
      const id = randomUUID()
      db.prepare('INSERT INTO task_proposals (id, task_json, created_at, target_id, target_version, action, target_json) VALUES (?, ?, ?, ?, ?, ?, ?)').run(id, JSON.stringify(task), clock().toISOString(), target?.id ?? null, target?.version ?? null, action, target ? JSON.stringify(target) : null)
      return { id, task, target, action }
    },
    approveTaskProposal(id, task) {
      db.exec('BEGIN IMMEDIATE')
      try {
        const row = db.prepare('SELECT * FROM task_proposals WHERE id = ?').get(id)
        if (!row) throw problem('Propuesta no encontrada o descartada.', 404)
        if (row.result_json) { db.exec('COMMIT'); return JSON.parse(row.result_json) }
        if (row.task_id) {
          const existing = this.getTask(row.task_id)
          if (!existing) throw problem('La tarea aprobada fue eliminada. Genera otra propuesta.', 409)
          db.exec('COMMIT'); return existing
        }
        if (Date.parse(row.created_at) < clock().getTime() - 86_400_000) throw problem('La propuesta caducó. Genera otra.', 409)
        if (row.target_id && this.getTask(row.target_id)?.version !== row.target_version) throw problem('La tarea cambió o fue eliminada. Genera otra propuesta antes de modificarla.', 409)
        let saved
        if (row.action === 'delete') {
          this.deleteTask(row.target_id); saved = { id: row.target_id, deleted: true }
        } else if (row.action === 'complete' || row.action === 'reopen') {
          saved = this.updateTask(row.target_id, { done: row.action === 'complete' }, false)
        } else saved = row.target_id ? this.updateTask(row.target_id, task, false) : this.createTask({ dueAt: null, ...task })
        db.prepare('UPDATE task_proposals SET task_id = ?, result_json = ? WHERE id = ?').run(saved.id, JSON.stringify(saved), id)
        db.exec('COMMIT'); return saved
      } catch (error) { db.exec('ROLLBACK'); throw error }
    },
    discardTaskProposal(id) { db.prepare('DELETE FROM task_proposals WHERE id = ? AND task_id IS NULL AND result_json IS NULL').run(id) },
  }
}
