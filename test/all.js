import test from "node:test"
import assert from "node:assert"
import fs from "node:fs"
import { join } from "node:path"
import { Emulator } from "./dist/main.js"
import { Buffer } from "buffer"
import { createCanvas, loadImage } from "canvas"

function parseHex(hex) {
  hex = hex.replace(/[ \t\r\n]/g, '')
  const buf = Buffer.from(hex, 'hex')
  return buf
}

const testDataPath = "test/data"
for (const entry of fs.readdirSync(testDataPath, { withFileTypes: true })) {
  if (entry.isDirectory()) {
    test(entry.name, async () => {
      const refData = await (async () => {
        const path = join(testDataPath, entry.name, "ref.jpg")
        const img = await loadImage(path)
        const canvas = createCanvas(img.width, img.height)
        const ctx = canvas.getContext("2d")
        ctx.drawImage(img, 0, 0)
        return ctx.getImageData(0, 0, canvas.width, canvas.height)
      })()

      const actualData = await (async () => {
        const path = join(testDataPath, entry.name, "in.txt")
        const inputHexString = fs.readFileSync(path, { encoding: "utf8" })
        const inputBytes = parseHex(inputHexString)
        const canvas = createCanvas(512, 256)
        const emulator = new Emulator(canvas)
        await emulator.init()
        emulator.read(inputBytes)
        const ctx = canvas.getContext("2d")

        // write the canvas output to a file
        //const buf = canvas.toBuffer("image/png")
        //const outPath = join(testDataPath, entry.name, "actual.png")
        //fs.writeFileSync(outPath, buf)

        return ctx.getImageData(0, 0, canvas.width, canvas.height)
      })()

      console.log("ref", refData.width, refData.height)
      console.log("actual", actualData.width, actualData.height)
    })
  }
}
