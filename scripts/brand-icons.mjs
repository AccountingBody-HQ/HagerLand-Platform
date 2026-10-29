#!/usr/bin/env node
// F-8: writes every brand icon file from the one definition of the house logo E1 (lib/brand-mark.json).
//   node scripts/brand-icons.mjs
// Writes app/icon.svg, app/favicon.ico (16, 32, 48), app/apple-icon.png (180), public/icons/icon-192.png,
// public/icons/icon-512.png, public/icons/icon-maskable-512.png and public/logo.png (512). Uses sharp, which the site
// already depends on. Commit the files it writes; run it again only if the logo changes (which needs AB).
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import sharp from 'sharp'

const ROOT = new URL('..', import.meta.url).pathname
const M = JSON.parse(readFileSync(join(ROOT, 'lib/brand-mark.json'), 'utf8'))
const V = M.viewBox

const lines = (width) =>
  `<g fill="none" stroke="${M.stroke}" stroke-width="${width}" stroke-linecap="round" stroke-linejoin="round">${M.paths.map((d) => `<path d="${d}"/>`).join('')}</g>`
const svg = (body) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${V} ${V}">${body}</svg>`
const circle = `<circle cx="${M.circle.cx}" cy="${M.circle.cy}" r="${M.circle.r}" fill="${M.green}"/>`

/** The mark in its circle (header weight), and the heavier tab-icon variant. */
const MARK = svg(circle + lines(M.strokeWidth))
const FAVICON = svg(circle + lines(M.faviconStrokeWidth))
/** Phone and web-app icons: a full green square with no transparency (the phone rounds the corners itself). */
const SQUARE = svg(`<rect width="${V}" height="${V}" fill="${M.green}"/>` + lines(M.strokeWidth))

const png = (source, size, opts = {}) =>
  sharp(Buffer.from(source), { density: Math.ceil((72 * size * 4) / V) })
    .resize(size, size)
    .png()
    .toBuffer()
    .then((buf) => (opts.flatten ? sharp(buf).flatten({ background: M.green }).png().toBuffer() : buf))

/** An ICO file holding PNG frames (supported by every current browser), so no extra package is needed. */
function ico(frames) {
  const head = Buffer.alloc(6 + 16 * frames.length)
  head.writeUInt16LE(0, 0)
  head.writeUInt16LE(1, 2)
  head.writeUInt16LE(frames.length, 4)
  let offset = head.length
  frames.forEach(({ size, data }, i) => {
    const o = 6 + i * 16
    head[o] = size
    head[o + 1] = size
    head.writeUInt16LE(1, o + 4)
    head.writeUInt16LE(32, o + 6)
    head.writeUInt32LE(data.length, o + 8)
    head.writeUInt32LE(offset, o + 12)
    offset += data.length
  })
  return Buffer.concat([head, ...frames.map((f) => f.data)])
}

const out = (rel, data) => {
  const file = join(ROOT, rel)
  mkdirSync(join(file, '..'), { recursive: true })
  writeFileSync(file, data)
  console.log(`wrote ${rel}`)
}

out('app/icon.svg', `${FAVICON}\n`)
out('app/favicon.ico', ico(await Promise.all([16, 32, 48].map(async (size) => ({ size, data: await png(FAVICON, size) })))))
out('app/apple-icon.png', await png(SQUARE, 180, { flatten: true }))
out('public/icons/icon-192.png', await png(SQUARE, 192, { flatten: true }))
out('public/icons/icon-512.png', await png(SQUARE, 512, { flatten: true }))
// Maskable: the house fills about 47% of the width, inside the 80% safe zone the phone may crop to.
out('public/icons/icon-maskable-512.png', await png(SQUARE, 512, { flatten: true }))
out('public/logo.png', await png(MARK, 512))
