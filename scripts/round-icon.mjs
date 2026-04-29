import sharp from 'sharp'
import { readFileSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const root = join(__dirname, '..')
const src = join(root, 'public/logo.png')

async function makeRounded(size, output, radiusRatio = 0.22) {
  const radius = Math.round(size * radiusRatio)
  const mask = Buffer.from(
    `<svg width="${size}" height="${size}"><rect x="0" y="0" width="${size}" height="${size}" rx="${radius}" ry="${radius}" fill="#fff"/></svg>`
  )
  await sharp(src)
    .resize(size, size)
    .composite([{ input: mask, blend: 'dest-in' }])
    .png()
    .toFile(output)
  console.log(`✓ ${output} (${size}x${size}, radius ${radius}px)`)
}

await makeRounded(512, join(root, 'src/app/icon.png'))
await makeRounded(512, join(root, 'src/app/apple-icon.png'))
