import { z } from 'zod'
import { randomUUID } from 'node:crypto'
import { daySchema, problem } from './planning.mjs'

const ids = z.array(z.string().min(1).max(80)).max(20).refine((value) => new Set(value).size === value.length)
export const goalSchema = z.object({
  title: z.string().trim().min(1).max(160), topic: z.string().trim().min(1).max(120),
  outcome: z.string().trim().min(1).max(1000), targetDate: daySchema.nullable(),
  budgetMinutes: z.number().int().min(10).max(120), knowledgeIds: ids, cardIds: ids,
  steps: z.array(z.object({ id: z.string().uuid(), title: z.string().trim().min(1).max(200), minutes: z.number().int().min(5).max(120) }).strict()).min(1).max(12).refine((value) => new Set(value.map((item) => item.id)).size === value.length),
}).strict()

export function createGoalStore(db, clock) {
  return {
    goals() {
      return db.prepare('SELECT * FROM goals ORDER BY created_at, id').all().map((row) => ({ ...JSON.parse(row.content_json), id: row.id, version: row.version, createdAt: row.created_at, updatedAt: row.updated_at,
        steps: JSON.parse(row.content_json).steps.map((step) => {
          const link = db.prepare('SELECT task_id FROM goal_tasks WHERE goal_id = ? AND step_id = ?').get(row.id, step.id)
          return { ...step, taskId: link?.task_id ?? null, task: link ? this.getTask(link.task_id) ?? null : null }
        }),
      }))
    },
    getGoal(id) { return this.goals().find((item) => item.id === id) },
    saveGoal(id, expectedVersion, input) {
      const old = id ? this.getGoal(id) : null
      if (id && !old) throw problem('Objetivo no encontrado.', 404)
      if ((old?.version ?? 0) !== expectedVersion) throw problem('El objetivo cambió. Conserva tu texto y actualiza.', 409)
      if (!id && this.goals().length >= 30) throw problem('El límite inicial es de 30 objetivos.')
      if (input.knowledgeIds.some((key) => !this.knowledge().some((item) => item.id === key)) || input.cardIds.some((key) => !this.learningCard(key))) throw problem('Algún material o pregunta ya no existe. Revisa las selecciones.', 409)
      const key = id ?? randomUUID()
      const now = clock().toISOString()
      db.prepare(`INSERT INTO goals (id, content_json, version, created_at, updated_at) VALUES (?, ?, ?, ?, ?)
        ON CONFLICT(id) DO UPDATE SET content_json = excluded.content_json, version = excluded.version, updated_at = excluded.updated_at`).run(key, JSON.stringify(input), expectedVersion + 1, now, now)
      return this.getGoal(key)
    },
    deleteGoal(id, version) {
      if (!db.prepare('DELETE FROM goals WHERE id = ? AND version = ?').run(id, version).changes) throw problem('El objetivo cambió o ya no existe.', 409)
      db.prepare('DELETE FROM goal_tasks WHERE goal_id = ?').run(id)
    },
    createStepTask(goalId, stepId, version) {
      db.exec('BEGIN IMMEDIATE')
      try {
        const goal = this.getGoal(goalId)
        if (!goal || goal.version !== version) throw problem('El objetivo cambió. Actualiza antes de crear la tarea.', 409)
        const step = goal.steps.find((item) => item.id === stepId)
        if (!step) throw problem('Paso no encontrado.', 404)
        if (step.taskId) {
          if (!step.task) throw problem('La tarea vinculada fue borrada. Añade un nuevo paso si quieres otra.', 409)
          db.exec('COMMIT'); return step.task
        }
        const task = this.createTask({ title: step.title, category: 'study', priority: 'normal', dueAt: null, estimatedMinutes: step.minutes })
        db.prepare('INSERT INTO goal_tasks (goal_id, step_id, task_id) VALUES (?, ?, ?)').run(goalId, stepId, task.id)
        db.exec('COMMIT'); return task
      } catch (error) { db.exec('ROLLBACK'); throw error }
    },
    practicePlan(goalId, version) {
      const goal = this.getGoal(goalId)
      if (!goal || goal.version !== version) throw problem('El objetivo cambió. Actualiza antes de preparar la práctica.', 409)
      const cards = this.study().cards.filter((item) => goal.cardIds.includes(item.id))
      const latest = (card) => {
        const row = db.prepare('SELECT grade, card_snapshot FROM attempts WHERE card_id = ? ORDER BY id DESC LIMIT 1').get(card.id)
        return row && JSON.parse(row.card_snapshot ?? '{}').revision === card.revision ? row : null
      }
      const now = clock().getTime()
      const ranked = cards.map((card) => {
        const attempt = latest(card)
        const overdue = card.nextReviewAt && Date.parse(card.nextReviewAt) <= now
        const rank = overdue ? 0 : attempt?.grade === 'again' ? 1 : !attempt ? 2 : 3
        return { cardId: card.id, revision: card.revision, title: card.question, topic: card.topic, rank, minutes: 10, reason: overdue ? 'Repaso vencido' : rank === 1 ? 'Último intento con dificultad; práctica adelantada' : rank === 2 ? 'Sin intento en esta versión: diagnóstico' : 'Práctica adelantada; aún no vence', nextReviewAt: card.nextReviewAt }
      }).sort((a, b) => a.rank - b.rank || (a.nextReviewAt ?? '').localeCompare(b.nextReviewAt ?? '') || a.cardId.localeCompare(b.cardId))
      const selected = ranked.slice(0, Math.min(6, Math.floor(goal.budgetMinutes / 10)))
      return { goalId, goalVersion: version, budgetMinutes: goal.budgetMinutes, estimatedMinutes: selected.length * 10, items: selected, missingCardIds: goal.cardIds.filter((id) => !cards.some((card) => card.id === id)) }
    },
  }
}
