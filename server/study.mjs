export const studyCards = [
  {
    id: 'http-purpose',
    topic: 'Fundamentos de la web',
    question: 'Explica con tus palabras qué hace HTTP y cómo participan el cliente y el servidor.',
    hint: 'Piensa en una petición, una respuesta y el intercambio de recursos.',
    answer: 'HTTP es un protocolo de aplicación. Un cliente envía una petición y un servidor responde con un estado, cabeceras y, cuando corresponde, un cuerpo. Se utiliza para intercambiar representaciones de recursos; no es el navegador ni la conexión física.',
    checkpoints: ['Distinguir cliente y servidor.', 'Describir petición y respuesta.', 'No confundir el protocolo con una aplicación.'],
    source: 'https://developer.mozilla.org/es/docs/Web/HTTP/Overview',
  },
  {
    id: 'http-status',
    topic: 'Fundamentos de la web',
    question: 'Una API responde con 404. ¿Qué indica? ¿Por qué no significa necesariamente que estés sin conexión?',
    hint: 'Si recibiste un estado HTTP, alguien pudo responder a tu petición.',
    answer: '404 indica que el servidor no encuentra el recurso solicitado. No demuestra que no haya conexión: recibir la respuesta implica que se obtuvo una respuesta HTTP, posiblemente de un intermediario. Un recurso inexistente es distinto de un fallo de red.',
    checkpoints: ['Identificar un recurso no encontrado.', 'Separar error HTTP y error de red.', 'Evitar deducir la causa exacta solo por el código.'],
    source: 'https://developer.mozilla.org/es/docs/Web/HTTP/Reference/Status/404',
  },
  {
    id: 'http-idempotency',
    topic: 'Fundamentos de la web',
    question: '¿Qué significa que una operación sea idempotente? Explica por qué importa al reintentar una petición.',
    hint: 'Compara el efecto previsto de ejecutarla una vez con el de repetirla.',
    answer: 'Una operación es idempotente si varias peticiones idénticas tienen el mismo efecto previsto sobre el servidor que una sola. Permite reintentar sin multiplicar ese efecto. No exige respuestas idénticas: un DELETE puede devolver éxito primero y 404 después. POST no es idempotente por definición, aunque una aplicación puede usar claves de idempotencia.',
    checkpoints: ['Hablar del efecto previsto, no de respuestas idénticas.', 'Relacionarlo con reintentos.', 'Dar un ejemplo y explicar sus límites.'],
    source: 'https://developer.mozilla.org/en-US/docs/Glossary/Idempotent',
  },
]

// FSRS-5 (Free Spaced Repetition Scheduler): estabilidad S (días hasta caer al 90 % de recuerdo) y dificultad D (1-10) por pregunta.
// shortcut: pesos por defecto publicados, no ajustados a la persona; optimizarlos cuando haya cientos de repasos reales.
const W = [0.40255, 1.18385, 3.173, 15.69105, 7.1949, 0.5345, 1.4604, 0.0046, 1.54575, 0.1192, 1.01925, 1.9395, 0.11, 0.29605, 2.2698, 0.2315, 2.9898, 0.51655, 0.6621]
const DECAY = -0.5
const FACTOR = 19 / 81
const RETENTION = 0.9
const DAY = 86_400_000
const RATING = { again: 1, good: 3 }
const clampD = (value) => Math.min(10, Math.max(1, value))
const initialDifficulty = (rating) => clampD(W[4] - Math.exp(W[5] * (rating - 1)) + 1)

// Probabilidad estimada de recordar tras `days` días con estabilidad `stability`.
export const retrievability = (days, stability) => (1 + FACTOR * days / stability) ** DECAY

// Antes de v9 los repasos solo guardaban una etapa: se traduce a la estabilidad de su intervalo fijo.
export function legacyState(stage, nextReviewAt) {
  if (!stage || !nextReviewAt) return null
  const stability = [1, 3, 7, 14, 30][stage - 1]
  return { stability, difficulty: 5, lastReviewAt: new Date(Date.parse(nextReviewAt) - stability * DAY).toISOString() }
}

export function nextReview(grade, previous = null, now = new Date()) {
  const rating = RATING[grade]
  let stability, difficulty
  if (!previous?.stability) {
    stability = W[rating - 1]
    difficulty = initialDifficulty(rating)
  } else {
    const days = Math.max(0, (now.getTime() - Date.parse(previous.lastReviewAt)) / DAY)
    const recall = retrievability(days, previous.stability)
    const changed = previous.difficulty + (-W[6] * (rating - 3)) * (10 - previous.difficulty) / 9
    difficulty = clampD(W[7] * initialDifficulty(4) + (1 - W[7]) * changed)
    if (days < 1) stability = previous.stability * Math.exp(W[17] * (rating - 3 + W[18]))
    else if (rating === 1) stability = Math.min(previous.stability, W[11] * previous.difficulty ** -W[12] * ((previous.stability + 1) ** W[13] - 1) * Math.exp(W[14] * (1 - recall)))
    else stability = previous.stability * (Math.exp(W[8]) * (11 - previous.difficulty) * previous.stability ** -W[9] * (Math.exp(W[10] * (1 - recall)) - 1) + 1)
  }
  stability = Math.max(0.01, stability)
  // Olvidar se repasa a los 10 minutos; recordar, cuando la probabilidad baja al 90 % (máx. un año).
  const delay = rating === 1 ? 10 * 60_000 : Math.min(365, Math.max(1, Math.round(stability / FACTOR * (RETENTION ** (1 / DECAY) - 1)))) * DAY
  const stage = rating === 1 ? 0 : Math.min((previous?.stage ?? 0) + 1, 99)
  return { stage, stability: Math.round(stability * 1000) / 1000, difficulty: Math.round(difficulty * 1000) / 1000, lastReviewAt: now.toISOString(), nextReviewAt: new Date(now.getTime() + delay).toISOString() }
}
