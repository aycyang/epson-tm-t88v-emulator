// @ts-ignore tsc doesn't know how to handle asset imports
import dataUrlA from './assets/a.png'

import { Buffer } from 'buffer'
import { createCanvas, loadImage, Image, Canvas } from 'canvas'
import * as canvas from 'canvas'
import * as escpos from 'escpos-ts'

class Emulator {
  canvas: HTMLCanvasElement
  private charMap: Image
  private strideX: number
  private strideY: number
  private cursorX: number
  private cursorY: number
  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas
    this.strideX = 12
    this.strideY = 24
    this.cursorX = 0
    this.cursorY = 0
  }
  async init() {
    this.charMap = await loadImage(dataUrlA)
    const ctx = this.canvas.getContext("2d")
    ctx.fillStyle = "white"
    ctx.fillRect(0, 0, this.canvas.width, this.canvas.height)
  }
  read(buf: Buffer) {
    const ctx = this.canvas.getContext("2d")
    const cmds = escpos.parse(buf)
    for (const cmd of cmds) {
      if (cmd instanceof escpos.InitializePrinter) {
      } else if (cmd instanceof escpos.PrintAndLineFeed) {
        this.cursorX = 0
        this.cursorY += this.strideY
      } else if (cmd instanceof escpos.PrintAndCarriageReturn) {
        this.cursorX = 0
        this.cursorY += this.strideY
      } else if (cmd instanceof escpos.Bytes) {
        for (const c of cmd.values) {
          if (0x20 <= c && c < 0x80) {
            const x = c % 16
            const y = Math.floor(c / 16) - 2
            const sx = this.strideX * x
            const sy = this.strideY * y
            ctx.drawImage(this.charMap as any,
              sx, sy, this.strideX, this.strideY,
              this.cursorX, this.cursorY, this.strideX, this.strideY)
            this.cursorX += this.strideX
          }
        }
      } else {
        // unhandled
      }
    }
  }
}

export { Emulator }
