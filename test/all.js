import test from "node:test"
import assert from "node:assert"
import fs from "node:fs"
import path from "node:path"
import { Emulator } from "./dist/main.js"
import { Buffer } from "buffer"
import { createImageData, createCanvas, loadImage } from "canvas"

const kTestDataPath = "test/data"

function parseHex(hex) {
  hex = hex.replace(/[ \t\r\n]/g, '')
  const buf = Buffer.from(hex, 'hex')
  return buf
}

function writeImageDataToFile(imageData, outPath) {
  const canvas = createCanvas(imageData.width, imageData.height)
  const ctx = canvas.getContext("2d")
  ctx.putImageData(imageData, 0, 0)
  const buf = canvas.toBuffer("image/png")
  fs.writeFileSync(outPath, buf)
}

function crop(src, x, y, w, h) {
  const dst = createImageData(w, h)
  for (let i = 0; i < w; i++) {
    const xx = x + i
    if (xx >= src.width) continue
    for (let j = 0; j < h; j++) {
      const yy = y + j
      if (yy >= src.height) continue
      const srcIdx = yy * src.width + xx
      const dstIdx = j * dst.width + i
      dst.data[dstIdx * 4 + 0] = src.data[srcIdx * 4 + 0]
      dst.data[dstIdx * 4 + 1] = src.data[srcIdx * 4 + 1]
      dst.data[dstIdx * 4 + 2] = src.data[srcIdx * 4 + 2]
      dst.data[dstIdx * 4 + 3] = src.data[srcIdx * 4 + 3]
    }
  }
  return dst
}

function diffImageData(a, b, offsetX, offsetY, scale) {
  const diffData = createImageData(a.width, a.height)

  for (let ay = 0; ay < a.height; ay++) {
    const by = Math.round((ay - offsetY) / scale)
    for (let ax = 0; ax < a.width; ax++) {
      const bx = Math.round((ax - offsetX) / scale)

      const ai = ay * a.width + ax
      const bi = by * b.width + bx

      const av = a.data[ai * 4]
      let bv = 255
      if (0 <= by && by < b.height && 0 <= bx && bx < b.width) {
        bv = b.data[bi * 4]
      }

      if (av === 0 && bv === 0) {
        diffData.data[ai * 4 + 0] = 0
        diffData.data[ai * 4 + 1] = 255
        diffData.data[ai * 4 + 2] = 0
        diffData.data[ai * 4 + 3] = 255
      } else if (av === 255 && bv === 0) {
        diffData.data[ai * 4 + 0] = 255
        diffData.data[ai * 4 + 1] = 0
        diffData.data[ai * 4 + 2] = 0
        diffData.data[ai * 4 + 3] = 255
      } else if (av === 0 && bv === 255) {
        diffData.data[ai * 4 + 0] = 0
        diffData.data[ai * 4 + 1] = 0
        diffData.data[ai * 4 + 2] = 255
        diffData.data[ai * 4 + 3] = 255
      } else if (av === 255 && bv === 255) {
        diffData.data[ai * 4 + 0] = 255
        diffData.data[ai * 4 + 1] = 255
        diffData.data[ai * 4 + 2] = 255
        diffData.data[ai * 4 + 3] = 255
      } else {
        // unexpected error; paint magenta
        diffData.data[ai * 4 + 0] = 255
        diffData.data[ai * 4 + 1] = 0
        diffData.data[ai * 4 + 2] = 255
        diffData.data[ai * 4 + 3] = 255
      }
    }
  }

  return diffData
}

function calculateAlignmentScore(a, b, offsetX, offsetY, scale) {
  let correct = 0
  let incorrect = 0
  for (let ay = 0; ay < a.height; ay++) {
    const by = Math.round((ay - offsetY) / scale)
    for (let ax = 0; ax < a.width; ax++) {
      const bx = Math.round((ax - offsetX) / scale)

      const ai = ay * a.width + ax
      const bi = by * b.width + bx

      const av = a.data[ai * 4]
      let bv = 255
      if (0 <= by && by < b.height && 0 <= bx && bx < b.width) {
        bv = b.data[bi * 4]
      }

      if (av === 0 && bv === 0) {
        correct++
      } else if (av === 255 && bv === 0 || av === 0 && bv === 255) {
        incorrect++
      }
    }
  }
  return correct / (correct + incorrect)
}

function calculateOptimalTransform(a, b, kernelWidth, kernelHeight, scaleStart, scaleEnd, scaleStep) {
  const hkw = Math.trunc(kernelWidth / 2)
  const hkh = Math.trunc(kernelHeight / 2)
  const alignmentScores = []
  for (let s = scaleStart; s < scaleEnd; s += scaleStep) {
    for (let i = -hkw; i < kernelWidth - hkw; i++) {
      for (let j = -hkh; j < kernelHeight - hkh; j++) {
        const score = calculateAlignmentScore(a, b, i, j, s)
        alignmentScores.push([score, i, j, s])
      }
    }
  }
  alignmentScores.sort().reverse()
  return alignmentScores[0]
}

for (const entry of fs.readdirSync(kTestDataPath, { withFileTypes: true })) {
  if (entry.isDirectory()) {
    test(entry.name, async () => {
      const refData = await (async () => {
        const inPath = path.join(kTestDataPath, entry.name, "ref.png")
        const img = await loadImage(inPath)
        const canvas = createCanvas(img.width, img.height)
        const ctx = canvas.getContext("2d")
        ctx.drawImage(img, 0, 0)
        return ctx.getImageData(0, 0, canvas.width, canvas.height)
      })()

      const actualData = await (async () => {
        const inPath = path.join(kTestDataPath, entry.name, "in.txt")
        const inputHexString = fs.readFileSync(inPath, { encoding: "utf8" })
        const inputBytes = parseHex(inputHexString)
        const canvas = createCanvas(512, 256)
        const emulator = new Emulator(canvas)
        await emulator.init()
        emulator.read(inputBytes)
        const ctx = canvas.getContext("2d")
        return ctx.getImageData(0, 0, canvas.width, canvas.height)
      })()

      for (let i = 0; i < refData.data.length; i += 4) {
        let [r, g, b, a] = refData.data.slice(i, i + 4)
        if (Math.max(r, g, b) > 127) {
          r = 255
          g = 255
          b = 255
        } else {
          r = 0
          g = 0
          b = 0
        }
        refData.data[i] = r
        refData.data[i+1] = g
        refData.data[i+2] = b
        refData.data[i+3] = 255
      }

      // Approximate alignment using a patch near the top left of both images
      const refPatch = crop(refData, 0, 0, 50, 50)
      const actualPatch = crop(actualData, 0, 0, 25, 25)
      // Scale is hardcoded at 1.68 for the HP scanner I'm using.
      // The scale-space search is not robust enough as is.
      // TODO Should determine scale automatically for more flexibility.
      const [score, offsetX, offsetY, scale] = calculateOptimalTransform(refPatch, actualPatch, 7, 7, 1.68, 1.69, 0.1)

      const diffData = diffImageData(refData, actualData, offsetX, offsetY, scale)
      writeImageDataToFile(diffData, path.join(kTestDataPath, entry.name, "diff.png"))

      assert(score >= 0.8, `match score is less than 80%: ${score}`)
    })
  }
}
