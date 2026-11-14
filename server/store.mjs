import { DatabaseSync } from 'node:sqlite'
import { mkdirSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { legacyState, nextReview, retrievability } from './study.mjs'
import { migrate } from './migrations.mjs'
import { createPlanningStore } from './planning-store.mjs'
import { createLearningStore } from './learning.mjs'
import { createCoachStore } from './coach.mjs'
import { createMemoryStore } from './memory.mjs'
import { createKnowledgeStore } from './knowledge.mjs'
import { createGoalStore } from './goals.mjs'
import { createReminderStore, nextOccurrence } from './reminders.mjs'

export function createStore(path = './data/jarvis.sqlite', { clock = () => new Date() } = {}) {
  if (path !== ':memory:') mkdirSync(dirname(resolve(path)), { recursive: true, mode: 0o700 })
  const db = new DatabaseSync(path)
  try { migrate(db) } catch (error) { db.close(); throw error }

  const taskFromRow = (row) => row && ({
    id: row.id, title: row.title, category: row.category, priority: row.priority,
    done: Boolean(row.done), dueAt: row.due_at, createdAt: row.created_at,
    estimatedMinutes: row.estimated_minutes, completedAt: row.completed_at, version: row.version,
    repeat: row.repeat ?? null, snoozedUntil: row.snoozed_until ?? null,
  })
  const getTask = (id) => taskFromRow(db.prepare('SELECT * FROM tasks WHERE id = ?').get(id))
  const listTasks = () => db.prepare(`SELECT * FROM tasks ORDER BY done,
    CASE priority WHEN 'high' THEN 0 WHEN 'normal' THEN 1 ELSE 2 END, created_at, id`).all().map(taskFromRow)
  const getProfile = () => ({ ...db.prepare('SELECT name, goal, tone FROM profile WHERE id = 1').get() })

  return {
    db, getTask, listTasks, getProfile,
    ...createPlanningStore(db, { getTask, listTasks, clock }),
    ...createLearningStore(db, clock),
    ...createCoachStore(db, clock),
    ...createMemoryStore(db, clock),
    ...createKnowledgeStore(db, clock),
    ...createGoalStore(db, clock),
    ...createReminderStore(db, { getTask, clock }),
    close: () => db.close(),
    setProfile(profile) {
      db.prepare('UPDATE profile SET name = ?, goal = ?, tone = ? WHERE id = 1')
        .run(profile.name, profile.goal, profile.tone)
      return getProfile()
    },
    createTask(task) {
      const result = db.prepare('INSERT INTO tasks (title, category, priority, due_at, estimated_minutes, created_at, repeat) VALUES (?, ?, ?, ?, ?, ?, ?)')
        .run(task.title, task.category, task.priority, task.dueAt, task.estimatedMinutes ?? 25, clock().toISOString(), task.dueAt ? task.repeat ?? null : null)
      return getTask(Number(result.lastInsertRowid))
    },
    updateTask(id, changes, transaction = true) {
      const old = getTask(id)
      if (!old) return null
      const next = { ...old, ...changes }
      if (!next.dueAt) next.repeat = null
      const now = clock().toISOString()
      // Completar una tarea repetida registra el cierre y la deja lista para su siguiente aviso.
      const recurring = !old.done && next.done && next.repeat
      if (recurring) { next.done = false; next.dueAt = nextOccurrence(next.dueAt, next.repeat, clock()) }
      const completedAt = next.done ? (old.done ? old.completedAt : now) : null
      if (transaction) db.exec('BEGIN IMMEDIATE')
      try {
        db.prepare(`UPDATE tasks SET title = ?, category = ?, priority = ?, done = ?, due_at = ?,
          estimated_minutes = ?, completed_at = ?, version = version + 1, repeat = ?,
          acknowledged_at = CASE WHEN due_at IS NOT ? THEN NULL ELSE acknowledged_at END,
          notified_at = CASE WHEN due_at IS NOT ? THEN NULL ELSE notified_at END,
          snoozed_until = CASE WHEN due_at IS NOT ? OR ? THEN NULL ELSE snoozed_until END WHERE id = ?`)
          .run(next.title, next.category, next.priority, Number(next.done), next.dueAt, next.estimatedMinutes, completedAt, next.repeat, next.dueAt, next.dueAt, next.dueAt, Number(next.done), id)
        if ((!old.done && next.done) || recurring) db.prepare('INSERT INTO task_completions (task_id, task_title, created_at) VALUES (?, ?, ?)').run(id, next.title, now)
        if (transaction) db.exec('COMMIT')
      } catch (error) { if (transaction) db.exec('ROLLBACK'); throw error }
      return getTask(id)
    },
    deleteTask: (id) => db.prepare('DELETE FROM tasks WHERE id = ?').run(id).changes > 0,
    reminders(now = clock()) {
      return db.prepare('SELECT * FROM tasks WHERE done = 0 AND COALESCE(snoozed_until, due_at) <= ? AND acknowledged_at IS NULL ORDER BY COALESCE(snoozed_until, due_at)')
        .all(now.toISOString()).map(taskFromRow)
    },
    messages: () => db.prepare('SELECT id, role, content, provider, created_at AS createdAt, context_json AS context FROM messages ORDER BY id DESC LIMIT 60').all().reverse().map((row) => ({ ...row, context: row.context ? JSON.parse(row.context) : null })),
    saveConversation(message, reply, provider, context = null) {
      db.exec('BEGIN')
      try {
        const insert = db.prepare('INSERT INTO messages (role, content, provider, created_at, context_json) VALUES (?, ?, ?, ?, ?)')
        const now = clock().toISOString()
        insert.run('user', message, provider, now, context ? JSON.stringify(context) : null)
        const result = insert.run('assistant', reply, provider, now, context ? JSON.stringify(context) : null)
        db.exec('COMMIT')
        return { id: Number(result.lastInsertRowid), role: 'assistant', content: reply, provider, createdAt: now }
      } catch (error) { db.exec('ROLLBACK'); throw error }
    },
    clearMessages: () => db.prepare('DELETE FROM messages').run(),
    aiUsage(now = clock()) {
      return db.prepare('SELECT COUNT(*) AS count FROM ai_requests WHERE created_at >= ?')
        .get(`${now.toISOString().slice(0, 10)}T00:00:00.000Z`).count
    },
    reserveAIRequest(limit) {
      // Se reserva ANTES de la llamada, también si el proveedor falla.
      // Operaciones síncronas sin await: una única instancia local serializa reservas.
      if (this.aiUsage() >= limit) return false
      db.prepare('INSERT INTO ai_requests (created_at) VALUES (?)').run(clock().toISOString())
      return true
    },
    study() {
      const reviews = new Map(db.prepare('SELECT * FROM reviews').all().map((row) => [row.card_id, row]))
      return {
        cards: this.learningCards().map((card) => {
          const row = reviews.get(card.id)
          const state = row?.stability ? { stability: row.stability, lastReviewAt: row.last_review_at } : legacyState(row?.stage, row?.next_review_at)
          return { ...card, stage: row?.stage ?? 0, nextReviewAt: row?.next_review_at ?? null,
            // Estimación FSRS de recordarla hoy; null si nunca se repasó.
            recall: state ? Math.round(retrievability(Math.max(0, (clock().getTime() - Date.parse(state.lastReviewAt)) / 86_400_000), state.stability) * 100) : null,
            stability: state?.stability ?? null }
        }),
        attempts: db.prepare('SELECT COUNT(*) AS count FROM attempts').get().count,
        sessions: this.sessions(),
        recentAttempts: db.prepare('SELECT id, card_id AS cardId, answer, grade, created_at AS createdAt, technique_json AS technique FROM attempts ORDER BY id DESC LIMIT 20').all()
          .map((row) => ({ ...row, technique: row.technique ? JSON.parse(row.technique) : null })),
      }
    },
    review(cardId, answer, grade, technique = null) {
      if (technique?.hintUsed || technique?.errors.length) grade = 'again'
      const row = db.prepare('SELECT * FROM reviews WHERE card_id = ?').get(cardId)
      const previous = row && (row.stability ? { stage: row.stage, stability: row.stability, difficulty: row.difficulty, lastReviewAt: row.last_review_at } : { stage: row.stage, ...legacyState(row.stage, row.next_review_at) })
      const schedule = nextReview(grade, previous, clock())
      db.exec('BEGIN')
      try {
        db.prepare('INSERT INTO attempts (card_id, answer, grade, created_at, card_snapshot, technique_json) VALUES (?, ?, ?, ?, ?, ?)')
          .run(cardId, answer, grade, clock().toISOString(), JSON.stringify(this.learningCard(cardId)), technique ? JSON.stringify(technique) : null)
        db.prepare(`INSERT INTO reviews (card_id, stage, next_review_at, stability, difficulty, last_review_at) VALUES (?, ?, ?, ?, ?, ?)
          ON CONFLICT(card_id) DO UPDATE SET stage = excluded.stage, next_review_at = excluded.next_review_at,
          stability = excluded.stability, difficulty = excluded.difficulty, last_review_at = excluded.last_review_at`)
          .run(cardId, schedule.stage, schedule.nextReviewAt, schedule.stability, schedule.difficulty, schedule.lastReviewAt)
        if (technique) db.prepare('DELETE FROM study_sessions WHERE card_id = ? AND revision = ?').run(cardId, this.learningCard(cardId).revision)
        db.exec('COMMIT')
        return schedule
      } catch (error) { db.exec('ROLLBACK'); throw error }
    },
  }
}
