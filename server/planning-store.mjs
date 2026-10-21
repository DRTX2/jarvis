import { addDays, buildPlan, dateInZone, dayBounds, problem } from './planning.mjs'

export function createPlanningStore(db, { getTask, listTasks, clock }) {
  const storedPlan = (day) => db.prepare('SELECT * FROM daily_plans WHERE day = ?').get(day)
  function getPlan(day) {
    const row = storedPlan(day)
    if (!row) return null
    const plan = JSON.parse(row.plan_json)
    return {
      ...plan, revision: row.revision, approvedAt: row.updated_at,
      blocks: plan.blocks.map((block) => {
        if (block.kind !== 'task') return block
        const task = getTask(block.taskId) ?? null
        return { ...block, task, changed: Boolean(task && (task.title !== block.title || task.estimatedMinutes !== block.durationMinutes)) }
      }),
    }
  }
  function activity(day, timeZone) {
    const bounds = dayBounds(day, timeZone)
    const completions = db.prepare('SELECT DISTINCT task_id AS id FROM task_completions WHERE created_at >= ? AND created_at < ?')
      .all(bounds.start, bounds.end).map((row) => row.id)
    const study = db.prepare('SELECT COUNT(*) AS count, MAX(created_at) AS lastAt FROM attempts WHERE created_at >= ? AND created_at < ?')
      .get(bounds.start, bounds.end)
    const lastCompletion = db.prepare('SELECT MAX(created_at) AS lastAt FROM task_completions WHERE created_at >= ? AND created_at < ?')
      .get(bounds.start, bounds.end).lastAt
    const plan = getPlan(day)
    const planned = plan?.blocks.filter((block) => block.kind === 'task') ?? []
    return {
      completedTasks: completions.length, studyAttempts: study.count,
      plannedTasks: planned.length,
      completedPlannedTasks: planned.filter((block) => completions.includes(block.taskId)).length,
      plannedMinutes: plan?.focusMinutes ?? 0,
      unplacedTasks: plan?.unscheduled.length ?? 0,
      planRevision: plan?.revision ?? 0,
      lastActivityAt: [lastCompletion, study.lastAt].filter(Boolean).sort().at(-1) ?? null,
    }
  }
  function getDailyReview(day) {
    const row = db.prepare('SELECT * FROM daily_reviews WHERE day = ?').get(day)
    return row ? {
      day, timeZone: row.time_zone, notes: JSON.parse(row.notes_json), snapshot: JSON.parse(row.snapshot_json),
      createdAt: row.created_at, updatedAt: row.updated_at,
    } : null
  }
  function getDaily(day, requestedZone) {
    const plan = getPlan(day)
    const review = getDailyReview(day)
    const timeZone = plan?.input.timeZone ?? review?.timeZone ?? requestedZone
    const current = activity(day, timeZone)
    const needsReviewUpdate = Boolean(review && (
      review.snapshot.planRevision !== current.planRevision || review.timeZone !== timeZone
      || review.snapshot.completedTasks !== current.completedTasks
      || review.snapshot.studyAttempts !== current.studyAttempts
      || (current.lastActivityAt && current.lastActivityAt > review.updatedAt)
    ))
    return { day, timeZone, plan, review, activity: current, needsReviewUpdate }
  }
  return {
    getPlan, getDaily, getDailyReview,
    previewPlan(input) {
      if (input.day < dateInZone(clock(), input.timeZone)) throw problem('Puedes consultar días anteriores, pero no crearles una agenda retroactiva.')
      return buildPlan(input, listTasks(), storedPlan(input.day)?.revision ?? 0)
    },
    approvePlan(input, expectedRevision, taskVersions) {
      db.exec('BEGIN IMMEDIATE')
      try {
        const proposal = this.previewPlan(input)
        if (proposal.expectedRevision !== expectedRevision) throw problem('El plan cambió desde la propuesta. Genera otra antes de reemplazarlo.', 409)
        const expected = new Map(taskVersions.map((item) => [item.id, item.version]))
        if (expected.size !== proposal.taskVersions.length || proposal.taskVersions.some((item) => expected.get(item.id) !== item.version)) {
          throw problem('Un pendiente cambió desde la propuesta. Genera otra para no aprobar información desactualizada.', 409)
        }
        if (!proposal.plannedTasks) throw problem('Ninguna tarea cabe en esta ventana. Ajusta disponibilidad, compromisos o duración antes de aprobar.')
        const now = clock().toISOString()
        db.prepare(`INSERT INTO daily_plans (day, time_zone, plan_json, revision, created_at, updated_at)
          VALUES (?, ?, ?, ?, ?, ?) ON CONFLICT(day) DO UPDATE SET
          time_zone = excluded.time_zone, plan_json = excluded.plan_json,
          revision = excluded.revision, updated_at = excluded.updated_at`)
          .run(input.day, input.timeZone, JSON.stringify(proposal), expectedRevision + 1, now, now)
        db.exec('COMMIT')
        return getPlan(input.day)
      } catch (error) { db.exec('ROLLBACK'); throw error }
    },
    saveDailyReview(day, input) {
      const daily = getDaily(day, input.timeZone)
      if (day > dateInZone(clock(), daily.timeZone)) throw problem('El cierre es para hoy o un día anterior, no para días futuros.')
      if (input.timeZone !== daily.timeZone) throw problem('La zona horaria no coincide con el registro del día. Actualiza la página antes de guardar.', 409)
      const now = clock().toISOString()
      const { timeZone, ...notes } = input
      const snapshot = { ...daily.activity, capturedAt: now }
      db.prepare(`INSERT INTO daily_reviews (day, time_zone, notes_json, snapshot_json, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?) ON CONFLICT(day) DO UPDATE SET
        notes_json = excluded.notes_json, snapshot_json = excluded.snapshot_json,
        time_zone = excluded.time_zone, updated_at = excluded.updated_at`)
        .run(day, timeZone, JSON.stringify(notes), JSON.stringify(snapshot), now, now)
      return getDailyReview(day)
    },
    weekly(day, timeZone) {
      const weekday = new Date(`${day}T12:00:00.000Z`).getUTCDay()
      const startDay = addDays(day, -((weekday + 6) % 7))
      const endDay = addDays(startDay, 6)
      const days = Array.from({ length: 7 }, (_, index) => {
        const date = addDays(startDay, index)
        const daily = getDaily(date, timeZone)
        return { day: date, timeZone: daily.timeZone, activity: activity(date, timeZone), review: daily.review, plan: daily.plan, needsReviewUpdate: daily.needsReviewUpdate }
      })
      const from = dayBounds(startDay, timeZone).start
      const to = dayBounds(endDay, timeZone).end
      const completedTasks = db.prepare('SELECT COUNT(DISTINCT task_id) AS count FROM task_completions WHERE created_at >= ? AND created_at < ?').get(from, to).count
      const summary = {
        completedTasks, studyAttempts: days.reduce((sum, item) => sum + item.activity.studyAttempts, 0),
        plannedDays: days.filter((item) => item.plan).length,
        reviewedDays: days.filter((item) => item.review).length,
        unplacedTasks: days.reduce((sum, item) => sum + item.activity.unplacedTasks, 0),
      }
      const observations = []
      if (!summary.completedTasks && !summary.studyAttempts && !summary.reviewedDays) observations.push('Todavía hay pocos registros en esta semana. Un cierre breve o un intento de estudio puede darte un punto de partida.')
      if (summary.unplacedTasks) observations.push(`Hay ${summary.unplacedTasks} selección(es) que no cabían en sus planes. Puedes dividirlas o revisar tu disponibilidad; no se han movido automáticamente.`)
      const lowEnergy = days.filter((item) => item.review?.notes.energy === 'low').length
      if (lowEnergy >= 2) observations.push(`En ${lowEnergy} cierres marcaste energía baja. Si te resulta útil, prueba una carga menor; es una observación de tus registros, no un diagnóstico.`)
      if (!observations.length) observations.push('Mira qué te funcionó y elige un ajuste pequeño para la próxima semana. No necesitas aumentar la carga para avanzar.')
      return { startDay, endDay, timeZone, days, summary, observations }
    },
    exportPlanning() {
      return {
        plans: db.prepare('SELECT day FROM daily_plans ORDER BY day').all().map((row) => getPlan(row.day)),
        dailyReviews: db.prepare('SELECT day FROM daily_reviews ORDER BY day').all().map((row) => getDailyReview(row.day)),
        taskCompletions: db.prepare('SELECT task_id AS taskId, task_title AS title, created_at AS createdAt FROM task_completions ORDER BY id').all(),
      }
    },
  }
}
