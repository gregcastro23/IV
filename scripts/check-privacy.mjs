import assert from 'node:assert/strict'
import { readFile, readdir } from 'node:fs/promises'
import { createHash } from 'node:crypto'
import { Script } from 'node:vm'
const html = await readFile('public/downloads/fourthstep-offline.html', 'utf8')
const scripts = [...html.matchAll(/<script>([\s\S]*?)<\/script>/g)]
assert.equal(scripts.length, 1, 'Offline file must contain one bundled inline script')
assert(!/<script[^>]+src=|<link[^>]+href=|<iframe|<img[^>]+src=["']https?:/i.test(html), 'Offline file must not load remote assets')
const script = scripts[0][1]
new Script(script) // Verify embedding did not break JavaScript syntax.
const hash = createHash('sha256').update(script).digest('base64')
assert(html.includes(`script-src 'sha256-${hash}'`), 'Offline script must match its CSP hash')
assert(html.includes("connect-src 'none'"))
assert(!/script-src[^;]+unsafe-inline/.test(html), 'Offline scripts require an exact hash')
const checksum = (await readFile('public/downloads/fourthstep-offline.sha256', 'utf8')).split(' ')[0]
assert.equal(checksum, createHash('sha256').update(html).digest('hex'))
const roots = ['components/inventory', 'components/views/emergency-view.tsx', 'lib/inventory-vault.ts', 'lib/moments.ts', 'lib/device-unlock.ts', 'app']
async function scan(path) {
  if (!/\.(tsx?|mjs|css)$/.test(path)) { for (const name of await readdir(path)) await scan(`${path}/${name}`); return }
  if (path.endsWith('.css')) return
  const source = await readFile(path, 'utf8')
  assert(!/\bfetch\s*\(|XMLHttpRequest|sendBeacon|new\s+(?:WebSocket|EventSource)|@vercel\/analytics/.test(source), `${path} contains a network or analytics API`)
  if (!path.endsWith('vault-gate.tsx') && !path.endsWith('inventory-vault.ts')) assert(!/localStorage|saveInventorySession|saveContact\(|getContacts\(/.test(source), `${path} bypasses the encrypted vault`)
}
for (const path of roots) await scan(path)
const next = (await import('../next.config.mjs')).default
const headers = await next.headers()
const header = key => headers[0].headers.find(item => item.key === key)?.value ?? ''
assert(header('Content-Security-Policy').includes("connect-src 'none'"))
assert(header('Content-Security-Policy').includes("worker-src 'none'"), 'No service worker may cache or intercept the app')
assert(/camera=\(\)/.test(header('Permissions-Policy')) && /publickey-credentials-get=\(self\)/.test(header('Permissions-Policy')))
// Device unlock must derive keys locally and never send credentials anywhere.
const deviceUnlock = await readFile('lib/device-unlock.ts', 'utf8')
assert(/userVerification: 'required'/.test(deviceUnlock) && /prf:/.test(deviceUnlock), 'Device unlock requires user verification and PRF')
assert(!/attestation: '(?:direct|enterprise)'/.test(deviceUnlock), 'No attestation is requested')
// A PIN is device-local: it must never be included in what a backup encrypts.
const vaultSource = await readFile('lib/inventory-vault.ts', 'utf8')
assert(/async backup\(\) \{[^}]*encrypt\(current\.data, current\.dek, id, slots, env\)/.test(vaultSource), 'Backups contain only the envelope slots, never the PIN record')
const app = await readdir('app')
assert(!app.includes('api'), 'Answer API routes require a privacy design review')
console.log('Privacy checks passed: source egress checks, storage boundary, offline CSP/script/checksum and no remote assets. These checks are not a runtime network audit.')
