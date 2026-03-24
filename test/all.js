import test from "node:test"
import assert from "node:assert"
import fs from "node:fs"
import * as path from "node:path"
import { Emulator } from "./dist/main.js"
import { Buffer } from "buffer"
import { createCanvas, loadImage } from "canvas"

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

for (const entry of fs.readdirSync(kTestDataPath, { withFileTypes: true })) {
  if (entry.isDirectory()) {
    test(entry.name, async () => {
      const refData = await (async () => {
        const inPath = path.join(kTestDataPath, entry.name, "ref.jpg")
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

        // write the canvas output to a file
        //const buf = canvas.toBuffer("image/png")
        //const outPath = path.join(kTestDataPath, entry.name, "actual.png")
        //fs.writeFileSync(outPath, buf)

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

      console.log(actualData.width * actualData.height * 4, actualData.data.length)

      writeImageDataToFile(refData, path.join(kTestDataPath, entry.name, "tmp.png"))

      for (let y = 0; y < refData.height && y < actualData.height; y++) {
        for (let x = 0; x < refData.width && x < actualData.width; x++) {
          const refIdx = y * refData.width + x
          const actualIdx = y * actualData.width + x
          const refValue = refData.data[refIdx * 4 + 0]
          const actualValue = actualData.data[actualIdx * 4 + 0]
          let r = 255
          let g = 255
          let b = 255
          if (refValue === 0 && actualValue === 0) { // both black; correct
            r = 0
            g = 255
            b = 0
          } else if (refValue === 0 && actualValue === 255) { // was white, expected black
            r = 0
            g = 0
            b = 255
          } else if (refValue === 255 && actualValue === 0) { // was black, expected white
            r = 255
            g = 0
            b = 0
          } else {
            r = actualValue
            g = actualValue
            b = actualValue
          }
          refData.data[refIdx * 4 + 0] = r
          refData.data[refIdx * 4 + 1] = g
          refData.data[refIdx * 4 + 2] = b
          refData.data[refIdx * 4 + 3] = 255
        }
      }

      writeImageDataToFile(refData, path.join(kTestDataPath, entry.name, "tmp2.png"))
    })
  }
}
