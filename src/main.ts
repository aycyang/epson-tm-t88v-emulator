// @ts-ignore tsc doesn't know how to handle asset imports
import dataUrlA from './assets/a.png'

import { Buffer } from 'buffer'
import * as escpos from 'escpos-ts'

class Emulator {
  canvas: HTMLCanvasElement
  charMap: HTMLImageElement
  ctx: CanvasRenderingContext2D
  strideX: number
  strideY: number
  cursorX: number
  cursorY: number
  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas
    this.ctx = canvas.getContext("2d")
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height)
    this.charMap = new Image()
    this.charMap.src = dataUrlA
    this.strideX = 12
    this.strideY = 24
    this.cursorX = 0
    this.cursorY = 0
  }
  read(buf: Buffer) {
    const cmds = escpos.parse(buf)
    for (const cmd of cmds) {
      if (cmd instanceof escpos.InitializePrinter) {
        console.log("init printer")
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
            this.ctx.drawImage(this.charMap,
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
