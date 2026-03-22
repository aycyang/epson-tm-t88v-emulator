// @ts-ignore tsc doesn't know how to handle asset imports
import dataUrlA from './assets/a.png'

import { Buffer } from 'buffer'
import * as escpos from 'escpos-ts'

class Emulator {
  canvas: HTMLCanvasElement
  charMap: HTMLImageElement
  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas
    this.charMap = new Image()
    this.charMap.src = dataUrlA
  }
  read(buf: Buffer) {
    const cmds = escpos.parse(buf)
    for (const cmd of cmds) {
      const ctx = this.canvas.getContext("2d")
      ctx.drawImage(this.charMap, 30, 30)
      if (cmd instanceof escpos.InitializePrinter) {
        console.log("init printer")
      } else if (cmd instanceof escpos.Bytes) {
        console.log("bytes")
      } else {
        console.log("smth else")
      }
    }
  }
}

export { Emulator }
