// Instala Jarvis como servicio de tu usuario (systemd) para que los avisos suenen sin abrir la terminal.
// Uso: npm run build && node scripts/install-service.mjs  (no requiere sudo)
import { mkdirSync, writeFileSync } from 'node:fs'
import { homedir } from 'node:os'
import { join } from 'node:path'
import { execFileSync } from 'node:child_process'

if (process.platform !== 'linux') { console.error('Solo Linux con systemd. En otros sistemas arranca Jarvis con «npm start».'); process.exit(1) }
const directory = join(homedir(), '.config/systemd/user')
mkdirSync(directory, { recursive: true })
writeFileSync(join(directory, 'jarvis.service'), `[Unit]
Description=Jarvis, asistente personal local
After=network.target

[Service]
WorkingDirectory=${process.cwd()}
ExecStart=${process.execPath} --env-file-if-exists=.env server/index.mjs
Restart=on-failure
UMask=0077

[Install]
WantedBy=default.target
`)
execFileSync('systemctl', ['--user', 'daemon-reload'], { stdio: 'inherit' })
execFileSync('systemctl', ['--user', 'enable', '--now', 'jarvis.service'], { stdio: 'inherit' })
console.log('Jarvis queda encendido en http://127.0.0.1:3001 y arranca al iniciar sesión.\nVer estado: systemctl --user status jarvis · Detener: systemctl --user disable --now jarvis')
