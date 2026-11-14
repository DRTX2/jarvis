// Graba del micrófono hasta que dejas de hablar y devuelve PCM de 16 bits a 16 kHz para el Whisper local.
// Funciona en Chrome, Edge, Firefox y Safari: usa la frecuencia del dispositivo y reduce a 16 kHz aquí
// (Firefox no admite conectar el micrófono a un AudioContext con otra frecuencia).
export type Recording = { stop(): void; cancel(): void; result: Promise<Int16Array | null> }

const TARGET = 16_000
export const canRecord = () => Boolean(navigator.mediaDevices?.getUserMedia) && 'AudioContext' in window

export function downsample(chunks: Float32Array[], rate: number): Int16Array {
  const input = new Float32Array(chunks.reduce((total, chunk) => total + chunk.length, 0))
  let offset = 0
  for (const chunk of chunks) { input.set(chunk, offset); offset += chunk.length }
  const ratio = rate / TARGET
  const output = new Int16Array(Math.floor(input.length / ratio))
  for (let index = 0; index < output.length; index++) {
    // Promedio de las muestras que caen en cada muestra de salida: filtro paso bajo sencillo contra el aliasing.
    const from = Math.floor(index * ratio), to = Math.min(input.length, Math.floor((index + 1) * ratio))
    let sum = 0
    for (let position = from; position < to; position++) sum += input[position]
    const value = Math.max(-1, Math.min(1, sum / Math.max(1, to - from)))
    output[index] = value < 0 ? value * 32768 : value * 32767
  }
  return output
}

export function startRecording({ silenceMs = 1200, maxMs = 30_000, waitMs = 7000 } = {}): Recording {
  // Si se detiene antes de que el navegador dé el micrófono, se aplica en cuanto arranque.
  let requested: boolean | null = null
  let finish: (keep: boolean) => void = (keep) => { requested = keep }
  const result = new Promise<Int16Array | null>((resolve, reject) => {
    navigator.mediaDevices.getUserMedia({ audio: { channelCount: 1, echoCancellation: true, noiseSuppression: true } }).then((stream) => {
      const context = new AudioContext()
      const source = context.createMediaStreamSource(stream)
      // ScriptProcessor está obsoleto pero funciona en todos los navegadores sin servir un archivo de AudioWorklet aparte.
      const processor = context.createScriptProcessor(4096, 1, 1)
      const chunks: Float32Array[] = []
      const started = performance.now()
      let floor = 0.003, spoke = false, lastVoice = started, done = false
      finish = (keep) => {
        if (done) return
        done = true
        processor.disconnect(); source.disconnect(); stream.getTracks().forEach((track) => track.stop()); void context.close()
        resolve(keep && spoke ? downsample(chunks, context.sampleRate) : null)
      }
      processor.onaudioprocess = (event) => {
        const samples = new Float32Array(event.inputBuffer.getChannelData(0))
        chunks.push(samples)
        const rms = Math.sqrt(samples.reduce((total, value) => total + value * value, 0) / samples.length)
        const now = performance.now()
        // Umbral adaptativo: el ruido de fondo de los primeros instantes marca qué es silencio.
        if (!spoke && now - started < 300) floor = Math.min(0.02, Math.max(floor, rms))
        if (rms > Math.max(0.012, floor * 2.5)) { spoke = true; lastVoice = now }
        if ((spoke && now - lastVoice > silenceMs) || now - started > maxMs || (!spoke && now - started > waitMs)) finish(true)
      }
      source.connect(processor); processor.connect(context.destination)
      if (requested !== null) finish(requested)
    }, reject)
  })
  return { stop: () => finish(true), cancel: () => finish(false), result }
}
