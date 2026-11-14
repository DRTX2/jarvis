import { useCallback, useEffect, useRef, useState } from 'react'
import { api, json, localDay } from './api'
import type { ApprovedPlan, Daily, Data, Health, Message, PlanInput, PlanProposal, Profile, ReviewNotes, Study, Task, TaskInput, Weekly } from './types'
import type { ChatContext, Feedback, MaterialProposal } from './types'
import type { AppliedAction, StudySession, TaskProposal } from './types'
import type { Memory, MemoryProposal, TaskAction, KnowledgeInput } from './types'
import type { Goal, GoalInput, PracticePlan, ChatReply, Device, Setup } from './types'
import { useDraft } from './useDraft'

const initial: Data = {
  profile: { name: '', goal: '', tone: 'cercano' }, tasks: [], messages: [], reminders: [],
  study: { cards: [], attempts: 0, sessions: [], recentAttempts: [] },
  health: { provider: 'demo', externalAIEnabled: false, storage: 'sqlite', reminders: 'desktop-push', dailyRequests: 0, maxDailyRequests: 5 },
  daily: {
    day: localDay(), timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    plan: null, review: null, needsReviewUpdate: false,
    activity: { completedTasks: 0, studyAttempts: 0, plannedTasks: 0, completedPlannedTasks: 0, plannedMinutes: 0, unplacedTasks: 0, planRevision: 0, lastActivityAt: null },
  },
  weekly: null,
  memories: [],
  knowledge: [],
  goals: [],
  proposals: { tasks: [], memories: [] },
}

export function useJarvis() {
  const chosenGoal = useDraft('chosen-goal', '')
  const [data, setData] = useState<Data>(initial)
  const [loading, setLoading] = useState(true)
  const [hasLoaded, setHasLoaded] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [day, setDay] = useState(localDay)
  const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone
  const generation = useRef(0)
  const working = useRef(false)
  const refresh = useCallback(async () => {
    const current = ++generation.current
    const query = `?day=${day}&timeZone=${encodeURIComponent(timeZone)}`
    const [profile, tasks, messages, reminders, study, health, daily, weekly, memories, proposals, knowledge, goals] = await Promise.all([
      api<{ profile: Profile }>('/profile'), api<{ tasks: Task[] }>('/tasks'),
      api<{ messages: Message[] }>('/chat'), api<{ reminders: Task[] }>('/reminders'),
      api<Study>('/study'), api<Health>('/health'),
      api<Daily>(`/daily${query}`), api<Weekly>(`/weekly${query}`),
      api<{ memories: Memory[] }>('/memories'),
      api<Data['proposals']>('/chat/proposals'),
      api<{ knowledge: Data['knowledge'] }>('/knowledge'),
      api<{ goals: Goal[] }>('/goals'),
    ])
    if (current === generation.current) {
      setData({ profile: profile.profile, tasks: tasks.tasks, messages: messages.messages, reminders: reminders.reminders, study, health, daily, weekly, memories: memories.memories, proposals, knowledge: knowledge.knowledge, goals: goals.goals })
      setHasLoaded(true)
    }
  }, [day, timeZone])

  useEffect(() => {
    let active = true
    refresh().catch((e: Error) => { if (active) setError(e.message) }).finally(() => { if (active) setLoading(false) })
    return () => { active = false; generation.current++ }
  }, [refresh])

  useEffect(() => {
    let active = true
    const timer = window.setInterval(() => {
      if (document.visibilityState !== 'visible') return
      api<{ reminders: Task[] }>('/reminders').then(({ reminders }) => {
        if (active) setData((previous) => ({ ...previous, reminders }))
      }).catch((e: Error) => { if (active) setError(e.message) })
    }, 15_000)
    return () => { active = false; window.clearInterval(timer) }
  }, [])

  const perform = async <T>(action: () => Promise<T>, reload = true): Promise<{ value: T } | null> => {
    if (working.current) return null
    working.current = true
    setBusy(true); setError('')
    try {
      const value = await action()
      if (reload) {
        try { await refresh() }
        catch { setError('La operación se realizó, pero no se pudo actualizar la vista. Reintenta la actualización; no hace falta repetir el guardado.') }
      }
      return { value }
    }
    catch (e) { setError(e instanceof Error ? e.message : 'No se pudo completar la operación.'); return null }
    finally { working.current = false; setBusy(false) }
  }
  const run = async (action: () => Promise<unknown>) => Boolean(await perform(action))

  return {
    data, loading, ready: hasLoaded && data.daily.day === day, busy, error, day, timeZone, dismissError: () => setError(''),
    studyGoalId: chosenGoal.value, selectStudyGoal: chosenGoal.change,
    saveGoal: (input: GoalInput, goal?: Goal) => run(() => api(goal ? `/goals/${goal.id}` : '/goals', { method: goal ? 'PUT' : 'POST', body: json(goal ? { ...input, expectedVersion: goal.version } : input) })),
    deleteGoal: (goal: Goal) => run(() => api(`/goals/${goal.id}`, { method: 'DELETE', body: json({ expectedVersion: goal.version }) })),
    createStepTask: (goal: Goal, stepId: string) => run(() => api(`/goals/${goal.id}/steps/${stepId}/task`, { method: 'POST', body: json({ expectedVersion: goal.version }) })),
    preparePractice: async (goal: Goal) => {
      const result = await perform(() => api<{ plan: PracticePlan }>(`/goals/${goal.id}/practice`, { method: 'POST', body: json({ expectedVersion: goal.version }) }), false)
      return result?.value.plan ?? null
    },
    selectDay: (next: string) => {
      if (!next || next === day) return
      if (next < '2000-01-01' || next > '2100-12-31') { setError('Elige una fecha entre los años 2000 y 2100.'); return }
      generation.current++; setLoading(true); setDay(next)
    },
    retry: async () => Boolean(await perform(refresh, false)),
    saveTask: (task: TaskInput, id?: number, expectedVersion?: number) => run(() => api(id ? `/tasks/${id}` : '/tasks', { method: id ? 'PATCH' : 'POST', body: json(id ? { ...task, expectedVersion } : task) })),
    toggleTask: (task: Task) => run(() => api(`/tasks/${task.id}`, { method: 'PATCH', body: json({ done: !task.done }) })),
    deleteTask: (id: number) => run(() => api(`/tasks/${id}`, { method: 'DELETE' })),
    acknowledge: (id: number) => run(() => api(`/reminders/${id}/acknowledge`, { method: 'POST', body: '{}' })),
    snooze: (id: number, minutes: number) => run(() => api(`/reminders/${id}/snooze`, { method: 'POST', body: json({ minutes }) })),
    pushKey: () => api<{ publicKey: string; devices: number }>('/push'),
    savePush: (subscription: PushSubscriptionJSON) => run(() => api('/push', { method: 'POST', body: json(subscription) })),
    deletePush: (endpoint: string) => run(() => api('/push', { method: 'DELETE', body: json({ endpoint }) })),
    testPush: async () => (await perform(() => api<{ delivered: boolean }>('/push/test', { method: 'POST', body: '{}' }), false))?.value.delivered ?? null,
    // Deshacer una acción aplicada desde el chat; la versión evita pisar un cambio posterior.
    undo: ({ action, task, previous }: AppliedAction) => run(() => action === 'created'
      ? api(`/tasks/${task.id}`, { method: 'DELETE' })
      : api(`/tasks/${task.id}`, { method: 'PATCH', body: json(action === 'reopened' ? { done: true, expectedVersion: task.version } : task.repeat ? { dueAt: previous?.dueAt ?? task.dueAt, expectedVersion: task.version } : { done: false, expectedVersion: task.version }) })),
    saveProfile: (profile: Profile) => run(() => api('/profile', { method: 'PUT', body: json(profile) })),
    addKnowledge: (material: KnowledgeInput) => run(() => api('/knowledge', { method: 'POST', body: json(material) })),
    deleteKnowledge: (id: string) => run(() => api(`/knowledge/${id}`, { method: 'DELETE' })),
    sendMessage: async (message: string, consent: boolean, context?: ChatContext, cloud = false) => (await perform(() => api<ChatReply>('/chat', { method: 'POST', body: json({ message, consent, context, timeZone, cloud }) })))?.value ?? null,
    loadDevice: () => api<{ device: Device }>('/device').then((result) => result.device),
    loadSetup: () => api<{ setup: Setup }>('/setup').then((result) => result.setup),
    saveMemory: (input: { title: string; content: string; origin?: string; validUntil?: string | null }, memory?: Memory) => run(() => api(memory ? `/memories/${memory.id}` : '/memories', { method: memory ? 'PUT' : 'POST', body: json(memory ? { ...input, expectedVersion: memory.version } : input) })),
    deleteMemory: (memory: Memory) => run(() => api(`/memories/${memory.id}`, { method: 'DELETE', body: json({ expectedVersion: memory.version }) })),
    proposeTask: async (message: string, consent: boolean, targetId: number | null = null, action: TaskAction = 'edit') => {
      const result = await perform(() => api<{ proposal: TaskProposal }>('/chat/task-proposal', { method: 'POST', body: json({ message, consent, targetId, action }) }))
      return result?.value.proposal ?? null
    },
    approveTaskProposal: (proposal: TaskProposal) => run(() => api(`/chat/task-proposal/${proposal.id}/approve`, { method: 'POST', body: json(proposal.task) })),
    discardTaskProposal: (id: string) => run(() => api(`/chat/task-proposal/${id}`, { method: 'DELETE' })),
    proposeMemory: (message: string, consent: boolean) => run(() => api('/chat/memory-proposal', { method: 'POST', body: json({ message, consent }) })),
    approveMemoryProposal: (proposal: MemoryProposal) => run(() => api(`/chat/memory-proposal/${proposal.id}/approve`, { method: 'POST', body: json(proposal.memory) })),
    discardMemoryProposal: (id: string) => run(() => api(`/chat/memory-proposal/${id}`, { method: 'DELETE' })),
    saveStudySession: (cardId: string, revision: number, session: StudySession) => run(() => api('/study/session', { method: 'PUT', body: json({ cardId, revision, session, expectedVersion: data.study.sessions.find((item) => item.cardId === cardId && item.revision === revision)?.version ?? 0 }) })),
    generateMaterial: async (topic: string, instruction: string, cardId: string | null, consent: boolean, knowledgeIds: string[] = []) => {
      const result = await perform(() => api<{ proposal: MaterialProposal }>('/learning/generate', { method: 'POST', body: json({ topic, instruction, cardId, consent, knowledgeIds }) }), false)
      return result?.value.proposal ?? null
    },
    approveMaterial: (proposal: MaterialProposal) => run(() => api('/learning/approve', { method: 'POST', body: json({ material: proposal.material, cardId: proposal.cardId, expectedRevision: proposal.expectedRevision, proposalId: proposal.proposalId }) })),
    requestFeedback: async (cardId: string, answer: string, consent: boolean) => {
      const result = await perform(() => api<{ feedback: Feedback }>('/learning/feedback', { method: 'POST', body: json({ cardId, answer, consent }) }), false)
      return result?.value.feedback ?? null
    },
    clearChat: () => run(() => api('/chat', { method: 'DELETE' })),
    review: (cardId: string, answer: string, grade: 'again' | 'good', technique?: StudySession, expectedRevision?: number) => run(() => api('/study/review', { method: 'POST', body: json({ cardId, answer, grade, technique, expectedRevision }) })),
    previewPlan: async (input: PlanInput) => {
      const result = await perform(() => api<{ proposal: PlanProposal }>('/plans/preview', { method: 'POST', body: json(input) }), false)
      return result?.value.proposal ?? null
    },
    approvePlan: (proposal: PlanProposal) => run(() => api<{ plan: ApprovedPlan }>('/plans/approve', {
      method: 'POST', body: json({ input: proposal.input, expectedRevision: proposal.expectedRevision, taskVersions: proposal.taskVersions }),
    })),
    saveDailyReview: (notes: ReviewNotes) => run(() => api(`/daily-reviews/${day}`, {
      method: 'PUT', body: json({ ...notes, timeZone: data.daily.timeZone }),
    })),
    exportData: () => run(async () => {
      const content = await api('/export')
      const url = URL.createObjectURL(new Blob([JSON.stringify(content, null, 2)], { type: 'application/json' }))
      const link = document.createElement('a')
      link.href = url; link.download = `jarvis-${new Date().toISOString().slice(0, 10)}.json`; link.click()
      window.setTimeout(() => URL.revokeObjectURL(url), 1000)
    }),
  }
}

export type Jarvis = ReturnType<typeof useJarvis>
