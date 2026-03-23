import test from "node:test"
import assert from "node:assert"
import fs from "node:fs"
import { join } from "node:path"
import { Emulator } from "./dist/main.js"
import { createCanvas, loadImage } from "canvas"

const testDataPath = "test/data"
for (const entry of fs.readdirSync(testDataPath, { withFileTypes: true })) {
  if (entry.isDirectory()) {
    test(entry.name, async () => {
      const inPath = join(testDataPath, entry.name, "in.txt")
      const refImgPath = join(testDataPath, entry.name, "ref.jpg")

      const testInput = fs.readFileSync(inPath)
      const refImg = await loadImage(refImgPath)

      const emuCanvas = createCanvas()
      const emu = new Emulator(emuCanvas)
    })
  }
}
