// @ts-ignore tsc doesn't know how to handle asset imports
import dataUrlA from './assets/a.png'

import { Buffer } from 'buffer'
import { createCanvas, loadImage, Image, Canvas } from 'canvas'
import * as canvas from 'canvas'
import * as escpos from 'escpos-ts'

class Emulator {
  canvas: HTMLCanvasElement
  private charMap: Image
  private charWidth: number
  private charHeight: number
  private strideX: number
  private strideY: number
  private cursorX: number
  private cursorY: number
  private scaleX: number
  private scaleY: number
  private lineHeight: number
  private underlineThickness: number
  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas
    this.charWidth = 12
    this.charHeight = 24
    this.strideX = 12
    this.strideY = 29.5
    this.cursorX = 0
    this.cursorY = 0
    this.scaleX = 1
    this.scaleY = 1
    this.lineHeight = this.charHeight
    this.underlineThickness = 0
  }
  async init() {
    this.charMap = await loadImage(dataUrlA)
    this.canvas.width = 512
    this.canvas.height = 512
    const ctx = this.canvas.getContext("2d")
    ctx.fillStyle = "white"
    ctx.fillRect(0, 0, this.canvas.width, this.canvas.height)
  }
  expandCanvasBy(amount: number) {
    const tmp = createCanvas(this.canvas.width, this.canvas.height)
    {
      const ctx: any = tmp.getContext("2d")
      ctx.drawImage(this.canvas, 0, 0)
    }
    this.canvas.height += amount
    {
      const ctx = this.canvas.getContext("2d")
      ctx.fillStyle = "white"
      ctx.fillRect(0, 0, this.canvas.width, this.canvas.height)
      ctx.drawImage(tmp as any, 0, 0)
    }
  }
  crlf() {
    this.cursorX = 0
    this.cursorY += this.lineHeight
    this.lineHeight = this.charHeight
  }
  // TODO make this a generator function that yields after processing each command?
  read(buf: Buffer) {
    const cmds = escpos.parse(buf)
    for (const cmd of cmds) {
      const ctx = this.canvas.getContext("2d")
      ctx.imageSmoothingEnabled = false
      if (cmd instanceof escpos.InitializePrinter) {
        this.underlineThickness = 0
      } else if (cmd instanceof escpos.SelectCharacterSize) {
        const y = cmd.n & 0x0f
        const x = (cmd.n >> 4) & 0x0f
        this.scaleX = x + 1
        this.scaleY = y + 1
      } else if (cmd instanceof escpos.SetUnderlineMode) {
        this.underlineThickness = cmd.n
      } else if (cmd instanceof escpos.SetLineSpacing) {
        this.strideY = 0.5 * cmd.n
      } else if (cmd instanceof escpos.PrintAndLineFeed) {
        this.cursorX = 0
        this.cursorY += this.scaleY * this.strideY
      } else if (cmd instanceof escpos.PrintAndCarriageReturn) {
        this.cursorX = 0
        this.cursorY += this.scaleY * this.strideY
      } else if (cmd instanceof escpos.Bytes) {
        for (const c of cmd.values) {
          if (0x20 <= c && c < 0x80) {
            const x = c % 16
            const y = Math.floor(c / 16) - 2
            const sx = this.charWidth * x
            const sy = this.charHeight * y
            const dx = Math.round(this.cursorX)
            const dy = Math.round(this.cursorY)
            ctx.drawImage(this.charMap as any,
              sx, sy,
              this.charWidth, this.charHeight,
              dx, dy,
              this.scaleX * this.charWidth, this.scaleY * this.charHeight)
            if (this.underlineThickness > 0) {
              ctx.fillStyle = "black"
              ctx.fillRect(dx, dy + this.charHeight + 2 - this.underlineThickness, this.charWidth, this.underlineThickness)
            }
            this.cursorX += this.scaleX * this.strideX
            if (this.cursorX + this.scaleX * this.strideX >= 512) {
              this.cursorX = 0
              this.cursorY += this.scaleY * this.strideY
            }
          }
        }
      } else {
        // unhandled
      }
      if (this.cursorY + this.scaleY * this.strideY > this.canvas.height) {
        this.expandCanvasBy(128)
      }
    }
  }
}

export { Emulator }
