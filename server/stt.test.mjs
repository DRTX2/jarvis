import test from 'node:test'
import assert from 'node:assert/strict'
import { createApp } from './app.mjs'
import { createTranscriber, pcmToFloat } from './stt.mjs'

test('dictado local: PCM a Float32 aunque el búfer empiece en un byte impar', () => {
  const pool = Buffer.alloc(7)
  const odd = pool.subarray(1, 7)
  odd.writeInt16LE(16384, 0); odd.writeInt16LE(-32768, 2); odd.writeInt16LE(0, 4)
  assert.deepEqual([...pcmToFloat(odd)], [0.5, -1, 0])
})

test('dictado local: carga el modelo una vez, transcribe en orden y lo libera tras inactividad', async () => {
  const loads = []
  let disposed = 0
  const order = []
  const load = async (task, model, options) => {
    loads.push({ task, model, options })
    const asr = async (samples, settings) => { await new Promise((resolve) => setTimeout(resolve, samples.length)); order.push(samples.length); return { text: ` hola ${samples.length} (${settings.language}) ` } }
    asr.dispose = async () => { disposed++ }
    return asr
  }
  const stt = createTranscriber({ load, idleMs: 30, cacheDir: './data/models' })
  const [slow, fast] = await Promise.all([stt.transcribe(new Float32Array(20)), stt.transcribe(new Float32Array(1))])
  assert.equal(slow, 'hola 20 (spanish)'); assert.equal(fast, 'hola 1 (spanish)')
  assert.deepEqual(order, [20, 1], 'una transcripción a la vez, en orden de llegada')
  assert.equal(loads.length, 1); assert.deepEqual(loads[0].options, { dtype: 'q4', device: 'cpu' })
  await new Promise((resolve) => setTimeout(resolve, 60))
  assert.equal(disposed, 1, 'se libera la memoria del modelo sin uso')
  await stt.transcribe(new Float32Array(1))
  assert.equal(loads.length, 2, 'vuelve a cargarse cuando hace falta')
})

test('dictado local: la ruta acepta audio binario, valida el tamaño y avisa si no está activo', async (t) => {
  const received = []
  const start = async (transcriber) => {
    const { app, store } = createApp({ databasePath: ':memory:', provider: 'demo', transcriber })
    const server = await new Promise((resolve) => { const instance = app.listen(0, '127.0.0.1', () => resolve(instance)) })
    t.after(async () => { await new Promise((resolve) => { server.close(resolve); server.closeAllConnections() }); store.close() })
    return `http://127.0.0.1:${server.address().port}/api`
  }
  const base = await start({ model: 'whisper-prueba', transcribe: async (samples) => { received.push(samples); return 'recuérdame llamar a mamá' } })
  const send = (url, bytes) => fetch(`${url}/transcribe`, { method: 'POST', headers: { 'Content-Type': 'application/octet-stream' }, body: bytes })
  assert.equal((await (await fetch(`${base}/health`)).json()).stt, 'whisper-prueba')
  const ok = await send(base, new Uint8Array(32000))
  assert.deepEqual(await ok.json(), { text: 'recuérdame llamar a mamá' })
  assert.equal(received[0].length, 16000, 'un segundo de audio a 16 kHz')
  assert.equal((await send(base, new Uint8Array(100))).status, 400, 'audio demasiado corto')
  const big = await send(base, new Uint8Array(3 * 1024 * 1024))
  assert.equal(big.status, 413); assert.match((await big.json()).error, /hasta un minuto/)
  const off = await start(null)
  assert.equal((await send(off, new Uint8Array(32000))).status, 503)
  assert.equal((await (await fetch(`${off}/health`)).json()).stt, null)
})
