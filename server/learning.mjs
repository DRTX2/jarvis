import { z } from 'zod'
import { randomUUID } from 'node:crypto'
import { studyCards } from './study.mjs'
import { problem } from './planning.mjs'

const text = (max) => z.string().trim().min(1).max(max)
export const materialSchema = z.object({
  topic: text(120), question: text(1500), hint: text(1000), answer: text(6000),
  checkpoints: z.array(text(500)).min(1).max(6),
}).strict()
export const groundedSchema = materialSchema.extend({ citations: z.array(z.object({ sourceId: z.string().uuid(), quote: text(1000) }).strict()).min(1).max(3) })
export const feedbackSchema = z.object({
  strengths: z.array(text(500)).max(5), gaps: z.array(text(500)).max(5),
  guidance: text(2000), followUp: text(1000), uncertainty: text(1000),
}).strict()
export const contextSchema = z.object({
  history: z.boolean().default(false), profile: z.boolean().default(false), tasks: z.boolean().default(false),
  memories: z.boolean().default(false),
  memoryIds: z.array(z.string().uuid()).max(10).refine((ids) => new Set(ids).size === ids.length).optional(),
  memoryVersions: z.array(z.object({ id: z.string().uuid(), version: z.number().int().positive() }).strict()).max(10).optional(),
}).strict()

export function selectedContext(store, selection) {
  if (!selection || !Object.values(selection).some(Boolean)) return null
  let memories = []
  if (selection.memories) {
    const all = store.memories().filter((item) => !item.expired)
    if (selection.memoryIds?.some((id) => !all.some((item) => item.id === id))) throw problem('Un recuerdo seleccionado cambió, venció o fue borrado. Revisa la selección.', 409)
    if (selection.memoryVersions && (!selection.memoryIds || selection.memoryVersions.length !== selection.memoryIds.length || new Set(selection.memoryVersions.map((item) => item.id)).size !== selection.memoryVersions.length || selection.memoryVersions.some((expected) => !selection.memoryIds.includes(expected.id) || all.find((item) => item.id === expected.id)?.version !== expected.version))) throw problem('Un recuerdo cambió después de seleccionarlo. Revisa su contenido y vuelve a seleccionarlo.', 409)
    memories = (selection.memoryIds ? selection.memoryIds.map((id) => all.find((item) => item.id === id)) : all.slice(0, 10)).map(({ id, title, content, origin, version, validUntil }) => ({ id, title, content, origin, version, validUntil }))
  }
  return {
    ...(selection.history ? { history: store.messages().filter((item) => item.provider === 'gemini').slice(-8).map(({ role, content }) => ({ role, content: content.slice(0, 1200) })) } : {}),
    ...(selection.profile ? { profile: store.getProfile() } : {}),
    ...(selection.memories ? { memories } : {}),
    ...(selection.tasks ? { pendingTasks: store.listTasks().filter((item) => !item.done).slice(0, 15).map(({ title, priority, estimatedMinutes, dueAt }) => ({ title, priority, estimatedMinutes, dueAt })) } : {}),
  }
}

export function parseAI(text, schema) {
  // Algunos modelos envuelven el JSON en un bloque de código: se toma del primer { al último }.
  try { return schema.parse(JSON.parse(text.slice(text.indexOf('{'), text.lastIndexOf('}') + 1))) }
  catch { throw problem('La IA devolvió contenido incompleto o no válido. No se guardó: genera otra propuesta.', 502) }
}

export function createLearningStore(db, clock) {
  function cards() {
    const overrides = new Map(db.prepare('SELECT * FROM learning_cards').all().map((row) => [row.id, row]))
    const original = studyCards.map((card) => {
      const row = overrides.get(card.id)
      overrides.delete(card.id)
      return row ? { ...JSON.parse(row.content_json), id: card.id, revision: row.revision, generated: true, source: null } : { ...card, revision: 1, generated: false }
    })
    return [...original, ...[...overrides.values()].map((row) => ({ ...JSON.parse(row.content_json), id: row.id, revision: row.revision, generated: true, source: null }))]
  }
  return {
    learningCards: cards,
    learningCard: (id) => cards().find((card) => card.id === id),
    approveMaterial(id, expectedRevision, material, transaction = true) {
      const existing = id ? cards().find((card) => card.id === id) : null
      if (id && !existing) throw problem('No se encontró la pregunta.', 404)
      if ((existing?.revision ?? 0) !== expectedRevision) throw problem('El material cambió. Actualiza y genera otra propuesta.', 409)
      if (!id && cards().length >= 100) throw problem('La biblioteca admite hasta 100 preguntas en esta versión.')
      const cardId = id ?? randomUUID()
      const revision = expectedRevision + 1
      if (transaction) db.exec('BEGIN IMMEDIATE')
      try {
        if (existing) db.prepare('INSERT INTO learning_versions (card_id, revision, content_json, created_at) VALUES (?, ?, ?, ?)').run(cardId, existing.revision, JSON.stringify(existing), clock().toISOString())
        db.prepare(`INSERT INTO learning_cards (id, content_json, revision) VALUES (?, ?, ?)
          ON CONFLICT(id) DO UPDATE SET content_json = excluded.content_json, revision = excluded.revision`).run(cardId, JSON.stringify(material), revision)
        db.prepare('DELETE FROM reviews WHERE card_id = ?').run(cardId)
        if (transaction) db.exec('COMMIT')
      } catch (error) { if (transaction) db.exec('ROLLBACK'); throw error }
      return cards().find((card) => card.id === cardId)
    },
    sourceExcerpts(ids) {
      const all = this.knowledge()
      return ids.map((id) => {
        const source = all.find((item) => item.id === id)
        if (!source) throw problem('Un material seleccionado ya no existe.', 409)
        return { id, title: source.title, origin: source.origin, url: source.url, excerpt: source.content.slice(0, 4000) }
      })
    },
    createSourcedProposal(cardId, revision, excerpts, citations) {
      const references = citations.map((citation) => {
        const source = excerpts.find((item) => item.id === citation.sourceId)
        if (!source || !source.excerpt.includes(citation.quote)) throw problem('La IA citó una fuente o un extracto que no recibió. No se guardó la propuesta.', 502)
        return { ...source, quote: citation.quote }
      })
      const id = randomUUID()
      db.prepare('INSERT INTO sourced_proposals (id, card_id, revision, references_json, created_at) VALUES (?, ?, ?, ?, ?)').run(id, cardId, revision, JSON.stringify(references), clock().toISOString())
      return { proposalId: id, references }
    },
    approveSourcedMaterial(proposalId, cardId, revision, material) {
      db.exec('BEGIN IMMEDIATE')
      try {
        const row = db.prepare('SELECT * FROM sourced_proposals WHERE id = ?').get(proposalId)
        if (!row) throw problem('Propuesta con fuentes no encontrada.', 404)
        if (row.card_id !== cardId || row.revision !== revision) throw problem('La propuesta no corresponde a esta pregunta.', 409)
        if (row.result_json) { db.exec('COMMIT'); return JSON.parse(row.result_json) }
        if (Date.parse(row.created_at) < clock().getTime() - 86400000) throw problem('La propuesta con fuentes caducó.', 409)
        const references = JSON.parse(row.references_json)
        if (references.some((reference) => !this.knowledge().some((source) => source.id === reference.id && source.content.slice(0, 4000) === reference.excerpt))) throw problem('Una fuente fue borrada o cambió. Genera otra propuesta.', 409)
        const saved = this.approveMaterial(cardId, revision, { ...material, references }, false)
        db.prepare('UPDATE sourced_proposals SET result_json = ? WHERE id = ?').run(JSON.stringify(saved), proposalId)
        db.exec('COMMIT'); return saved
      } catch (error) { db.exec('ROLLBACK'); throw error }
    },
    saveFeedback(card, answer, feedback) {
      if (this.learningCard(card.id)?.revision !== card.revision) throw problem('El material cambió durante la revisión. Reintenta sobre la versión actual.', 409)
      db.prepare('INSERT INTO learning_feedback (card_json, answer, feedback_json, created_at) VALUES (?, ?, ?, ?)').run(JSON.stringify(card), answer, JSON.stringify(feedback), clock().toISOString())
    },
    exportLearning() {
      return {
        learningVersions: db.prepare('SELECT card_id AS cardId, revision, content_json AS content, created_at AS createdAt FROM learning_versions ORDER BY id').all().map((row) => ({ ...row, content: JSON.parse(row.content) })),
        learningFeedback: db.prepare('SELECT card_json AS card, answer, feedback_json AS feedback, created_at AS createdAt FROM learning_feedback ORDER BY id').all().map((row) => ({ ...row, card: JSON.parse(row.card), feedback: JSON.parse(row.feedback) })),
        sourcedProposals: db.prepare('SELECT * FROM sourced_proposals').all(),
      }
    },
  }
}
