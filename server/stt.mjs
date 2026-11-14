import { env, pipeline } from '@huggingface/transformers'

// Dictado local con Whisper (ONNX en CPU): el audio nunca sale del equipo. En la CPU no compite por la VRAM con el modelo del chat.
// El modelo (~600 MB) se descarga de Hugging Face la primera vez y queda en data/models; se libera tras `idleMs` sin uso.
export function createTranscriber({ model = 'onnx-community/whisper-large-v3-turbo', dtype = 'q4', cacheDir = './data/models', idleMs = 10 * 60_000, load = pipeline } = {}) {
  env.cacheDir = cacheDir
  let loading = null
  let queue = Promise.resolve()
  let timer = null
  const get = () => (loading ??= load('automatic-speech-recognition', model, { dtype, device: 'cpu' }).catch((error) => { loading = null; throw error }))
  const release = async () => { const current = loading; loading = null; (await current?.catch(() => null))?.dispose?.() }
  return {
    model,
    // Una transcripción a la vez: dos en paralelo solo se estorbarían en la CPU.
    transcribe(samples) {
      const run = queue.then(async () => {
        clearTimeout(timer)
        try {
          const output = await (await get())(samples, { language: 'spanish', task: 'transcribe', chunk_length_s: 30 })
          return output.text.trim()
        } finally {
          timer = setTimeout(release, idleMs)
          timer.unref?.()
        }
      })
      queue = run.catch(() => {})
      return run
    },
  }
}

// PCM de 16 bits mono a 16 kHz (lo que envía el navegador) → Float32 en [-1, 1], el formato que espera Whisper.
export function pcmToFloat(buffer) {
  // Copia alineada: un Buffer de Node puede empezar en un byte impar dentro de su bloque compartido.
  const pcm = new Int16Array(Uint8Array.from(buffer.subarray(0, buffer.length - buffer.length % 2)).buffer)
  return Float32Array.from(pcm, (value) => value / 32768)
}
