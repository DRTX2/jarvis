export type Page = 'today' | 'study' | 'chat' | 'progress' | 'profile'
export type Category = 'personal' | 'study' | 'work'
export type Priority = 'high' | 'normal' | 'low'
export type Task = {
  id: number; title: string; category: Category; priority: Priority
  done: boolean; dueAt: string | null; createdAt: string
  estimatedMinutes: number; completedAt: string | null; version: number
  repeat?: Repeat | null; snoozedUntil?: string | null
}
export type Repeat = 'daily' | 'weekdays' | 'weekly'
export type TaskInput = Pick<Task, 'title' | 'category' | 'priority' | 'dueAt' | 'estimatedMinutes' | 'repeat'>
export type Profile = { name: string; goal: string; tone: 'cercano' | 'directo' | 'tranquilo' }
export type Message = { id: number; role: 'user' | 'assistant'; content: string; provider: string; createdAt: string; context?: { memories: { id: string; title: string; version: number }[] } | null }
export type Health = {
  provider: 'demo' | 'gemini' | 'ollama' | 'claude'; externalAIEnabled: boolean; model?: string | null; storage: string; reminders: string
  cloud?: { provider: 'claude'; model: string } | null
  dailyRequests: number; maxDailyRequests: number
}
export type StudyCard = {
  id: string; topic: string; question: string; hint: string; answer: string
  checkpoints: string[]; source: string | null; stage: number; nextReviewAt: string | null; recall?: number | null; stability?: number | null
  revision: number; generated: boolean
  references?: Reference[]
}
export type Material = Pick<StudyCard, 'topic' | 'question' | 'hint' | 'answer' | 'checkpoints'>
export type Reference = { id: string; title: string; origin: string; url: string | null; excerpt: string; quote: string }
export type MaterialProposal = { material: Material; cardId: string | null; expectedRevision: number; proposalId?: string; references?: Reference[] }
export type Feedback = { strengths: string[]; gaps: string[]; guidance: string; followUp: string; uncertainty: string }
export type ChatContext = { history: boolean; profile: boolean; tasks: boolean; memories: boolean; memoryIds?: string[]; memoryVersions?: { id: string; version: number }[] }
export type Memory = { id: string; title: string; content: string; version: number; updatedAt: string; origin: string; validUntil: string | null; createdAt: string | null; sourceText: string | null; expired: boolean }
export type GoalInput = { title: string; topic: string; outcome: string; targetDate: string | null; budgetMinutes: number; knowledgeIds: string[]; cardIds: string[]; steps: { id: string; title: string; minutes: number }[] }
export type Goal = Omit<GoalInput, 'steps'> & { id: string; version: number; createdAt: string; updatedAt: string; steps: (GoalInput['steps'][number] & { taskId: number | null; task: Task | null })[] }
export type PracticePlan = { goalId: string; goalVersion: number; budgetMinutes: number; estimatedMinutes: number; missingCardIds: string[]; items: { cardId: string; revision: number; title: string; topic: string; minutes: number; reason: string; nextReviewAt: string | null }[] }
export type StudySession = { method: 'recall' | 'feynman' | 'transfer'; answer: string; retry: string; transfer: string; confidence: number; hintUsed: boolean; revealed: boolean; errors: ('recall' | 'understanding' | 'application' | 'aids')[] }
export type TaskAction = 'edit' | 'complete' | 'reopen' | 'delete'
export type TaskProposal = { id: string; task: Omit<TaskInput, 'dueAt'> & { dueAt?: string | null }; target?: Task | null; action?: TaskAction }
export type MemoryProposal = { id: string; memory: { title: string; content: string } }
export type KnowledgeInput = { title: string; topic: string; content: string; origin: string; url: string | null }
export type Knowledge = KnowledgeInput & { id: string; createdAt: string }
export type Study = { cards: StudyCard[]; attempts: number; sessions: { cardId: string; revision: number; version: number; session: StudySession; updatedAt: string }[]; recentAttempts: { id: number; cardId: string; answer: string; grade: string; createdAt: string; technique: StudySession | null }[] }
export type Commitment = { title: string; startTime: string; endTime: string }
export type PlanInput = {
  day: string; timeZone: string; startTime: string; endTime: string
  breakMinutes: number; taskIds: number[]; commitments: Commitment[]
}
export type PlanBlock = {
  kind: 'task' | 'break' | 'commitment'; title: string; startTime: string; endTime: string
  durationMinutes: number; startAt: string; endAt: string; taskId?: number
  task?: Task | null; changed?: boolean
}
export type PlanProposal = {
  input: PlanInput; expectedRevision: number; taskVersions: { id: number; version: number }[]
  blocks: PlanBlock[]; unscheduled: { taskId: number; title: string; reason: string }[]
  availableMinutes: number; focusMinutes: number; pauseMinutes: number
  remainingMinutes: number; plannedTasks: number; algorithmVersion: number
}
export type ApprovedPlan = PlanProposal & { revision: number; approvedAt: string }
export type Activity = {
  completedTasks: number; studyAttempts: number; plannedTasks: number
  completedPlannedTasks: number; plannedMinutes: number; unplacedTasks: number
  planRevision: number; lastActivityAt: string | null
}
export type ReviewNotes = { worked: string; obstacle: string; nextStep: string; energy: 'low' | 'medium' | 'high' | null }
export type DailyReview = {
  day: string; timeZone: string; notes: ReviewNotes
  snapshot: Activity & { capturedAt: string }; createdAt: string; updatedAt: string
}
export type Daily = {
  day: string; timeZone: string; plan: ApprovedPlan | null; review: DailyReview | null
  activity: Activity; needsReviewUpdate: boolean
}
export type Weekly = {
  startDay: string; endDay: string; timeZone: string
  days: { day: string; timeZone: string; activity: Activity; review: DailyReview | null; plan: ApprovedPlan | null; needsReviewUpdate: boolean }[]
  summary: { completedTasks: number; studyAttempts: number; plannedDays: number; reviewedDays: number; unplacedTasks: number }
  observations: string[]
}
export type Device = {
  platform: string; cpu: string; cores: number; load1: number; uptimeHours: number; capturedAt: string
  memory: { totalGb: number; availableGb: number; usedPercent: number }
  disk: { totalGb: number; freeGb: number; usedPercent: number } | null
  processes: { name: string; cpuPercent: number; memPercent: number; count: number }[]
  tips: string[]
}
export type Setup = { provider: Health['provider']; gpu: { name: string; vramGb: number } | null; ollama: { url: string; running: boolean; model: string; modelReady: boolean }; cloud: string | null }
export type AppliedAction = { action: 'created' | 'completed' | 'reopened'; task: Task; previous?: Task }
export type ChatReply = { reply: Message; messages: Message[]; proposals: { tasks: TaskProposal[]; memories: MemoryProposal[] } | null; applied?: AppliedAction[] }
export type Data = {
  profile: Profile; tasks: Task[]; messages: Message[]; reminders: Task[]; study: Study; health: Health
  daily: Daily; weekly: Weekly | null
  memories: Memory[]
  knowledge: Knowledge[]
  goals: Goal[]
  proposals: { tasks: TaskProposal[]; memories: MemoryProposal[] }
}
