import { build } from 'esbuild'
import postcss from 'postcss'
import tailwind from '@tailwindcss/postcss'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { createHash } from 'node:crypto'
import { execFileSync } from 'node:child_process'

const result = await build({ entryPoints: ['offline/entry.tsx'], bundle: true, write: false, format: 'iife', platform: 'browser', target: ['es2022'], minify: true, charset: 'ascii', metafile: true, define: { 'process.env.NODE_ENV': '"production"' }, legalComments: 'inline' })
if (Object.values(result.metafile.outputs).some(output => output.imports.length)) throw new Error('Offline edition contains external imports')
const script = result.outputFiles[0].text.replace(/<\/script/gi, '<\\/script')
const scriptHash = createHash('sha256').update(script).digest('base64')
const source = await readFile('app/globals.css', 'utf8')
const css = (await postcss([tailwind({ optimize: true })]).process(source, { from: new URL('../app/globals.css', import.meta.url).pathname })).css
if (/@import\b|url\(\s*['"]?(?:https?:|\/\/)/i.test(css)) throw new Error('Offline CSS requests external resources')
const revision = process.env.VERCEL_GIT_COMMIT_SHA || execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).trim()
const csp = `default-src 'none'; script-src 'sha256-${scriptHash}'; style-src 'unsafe-inline'; img-src data: blob:; font-src data:; connect-src 'none'; object-src 'none'; frame-src 'none'; form-action 'none'; base-uri 'none'`
const html = `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="referrer" content="no-referrer"><meta http-equiv="Content-Security-Policy" content="${csp}"><meta name="fourthstep-source-revision" content="${revision}"><title>Fourth Step · Offline</title><style>${css}</style></head><body><div id="root"></div><noscript>Enable JavaScript in a current browser to open this encrypted local vault.</noscript><script>${script}</script></body></html>`
await mkdir('public/downloads', { recursive: true })
await writeFile('public/downloads/fourthstep-offline.html', html)
await writeFile('public/downloads/fourthstep-offline.sha256', `${createHash('sha256').update(html).digest('hex')}  fourthstep-offline.html\n`)
await writeFile('public/downloads/source-revision.txt', `${revision}\n`)
console.log(`Offline edition: ${Math.round(Buffer.byteLength(html) / 1024)} KB; source ${revision.slice(0, 12)}`)
