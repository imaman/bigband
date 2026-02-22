import { failMe } from '../fail-me'
import type { DisplayWord } from './display-rules'

export interface RsvpRenderOptions {
  width: number
  height: number
  backgroundColor: string
  textColor: string
  orpColor: string
  fontSize: number
  fontFamily: string
}

const DEFAULT_OPTIONS: RsvpRenderOptions = {
  width: 1080,
  height: 1920,
  backgroundColor: '#000000',
  textColor: '#ffffff',
  orpColor: '#ff3333',
  fontSize: 120,
  fontFamily: 'Arial, Helvetica, sans-serif',
}

/**
 * Render a single RSVP frame to a canvas context.
 * The word is centered at the ORP character position, with the ORP character highlighted in red.
 */
export function renderRsvpFrame(
  ctx: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D,
  word: DisplayWord | null,
  options: Partial<RsvpRenderOptions> = {},
) {
  const opts = { ...DEFAULT_OPTIONS, ...options }

  // Clear background
  ctx.fillStyle = opts.backgroundColor
  ctx.fillRect(0, 0, opts.width, opts.height)

  if (!word) return

  const font = `bold ${opts.fontSize}px ${opts.fontFamily}`
  ctx.font = font
  ctx.textBaseline = 'middle'

  const text = word.word
  const orp = word.orpIndex
  const centerY = opts.height / 2

  // Draw a thin vertical guide line at center
  ctx.strokeStyle = '#333333'
  ctx.lineWidth = 2
  ctx.beginPath()
  ctx.moveTo(opts.width / 2, centerY - opts.fontSize)
  ctx.lineTo(opts.width / 2, centerY + opts.fontSize)
  ctx.stroke()

  // Measure each character to position text so ORP char is at center
  const charWidths: number[] = []
  for (let i = 0; i < text.length; i++) {
    const ch = text[i] ?? failMe(`char at index ${i} not found`)
    charWidths.push(ctx.measureText(ch).width)
  }

  // Calculate x position of ORP character center
  let orpCharLeft = 0
  for (let i = 0; i < orp; i++) {
    orpCharLeft += charWidths[i] ?? failMe(`charWidth at index ${i} not found`)
  }
  const orpCharCenter = orpCharLeft + (charWidths[orp] ?? 0) / 2
  const startX = opts.width / 2 - orpCharCenter

  // Draw characters one by one
  let x = startX
  for (let i = 0; i < text.length; i++) {
    ctx.fillStyle = i === orp ? opts.orpColor : opts.textColor
    const c = text[i] ?? failMe(`char at index ${i} not found`)
    ctx.fillText(c, x, centerY)
    x += charWidths[i] ?? failMe(`charWidth at index ${i} not found`)
  }
}

/**
 * Render a blank (no word) frame.
 */
export function renderBlankFrame(
  ctx: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D,
  options: Partial<RsvpRenderOptions> = {},
) {
  renderRsvpFrame(ctx, null, options)
}
