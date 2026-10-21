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

// Plan simple y explícito. No es FSRS ni una medida certificada de dominio.
export function nextReview(grade, previousStage = 0, now = new Date()) {
  const stage = grade === 'again' ? 0 : Math.min(previousStage + 1, 5)
  const delay = grade === 'again' ? 10 * 60_000 : [1, 3, 7, 14, 30][stage - 1] * 86_400_000
  return { stage, nextReviewAt: new Date(now.getTime() + delay).toISOString() }
}
