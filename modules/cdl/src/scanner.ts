import { Location, Location2d } from './location'

export interface Token {
  readonly text: string
  readonly location: Location
}

export class Scanner {
  private offset = 0
  constructor(private readonly input: string) {
    this.eatWhitespace()
  }

  private curr() {
    return this.input.substring(this.offset)
  }

  private eatWhitespace() {
    while (true) {
      if (this.consumeIf(/\s*/, false)) {
        continue
      }
      if (this.consumeIf('//', false)) {
        this.consume(/[^\n]*/, false)
        continue
      }

      return
    }
  }

  eof(): boolean {
    return this.offset >= this.input.length
  }

  synopsis() {
    const c = this.curr()
    let lookingAt = c.substring(0, 20)
    if (lookingAt.length !== c.length) {
      lookingAt = `${lookingAt}...`
    }

    return {
      position: this.offset,
      lookingAt,
    }
  }

  consume(r: RegExp | string, eatWhitespace = true): Token {
    const text = this.match(r)
    if (text === undefined) {
      throw new Error(`Expected ${r} at position ${this.offset} but found: ${this.synopsis().lookingAt}`)
    }

    const offset = this.offset
    this.offset += text.length

    if (eatWhitespace) {
      this.eatWhitespace()
    }
    return { location: { offset }, text }
  }

  consumeIf(r: RegExp | string, eatWhitespace = true): Token | undefined {
    const ret = this.match(r)
    if (!ret) {
      return undefined
    }

    return this.consume(r, eatWhitespace)
  }

  private match(r: RegExp | string): string | undefined {
    if (typeof r === 'string') {
      if (this.curr().startsWith(r)) {
        return r
      }
      return undefined
    }

    const m = this.curr().match(r)
    if (m && m.index === 0) {
      return m[0]
    }

    return undefined
  }

  resolveLocation(loc: Location): Location2d {
    const prefix = this.input.slice(0, loc.offset)
    let line = 0
    for (let i = 0; i < prefix.length; ++i) {
      const ch = prefix[i]
      if (ch === '\n') {
        line += 1
      }
    }

    let col = 0
    for (let i = prefix.length - 1; i >= 0; --i, ++col) {
      const ch = prefix[i]
      if (ch === '\n') {
        break
      }
    }

    return { line, col }
  }

  lineAt(loc: Location) {
    const from = Math.max(this.input.lastIndexOf('\n', loc.offset), 0)
    let to = this.input.indexOf('\n', loc.offset)
    if (to < 0) {
      to = this.input.length
    }

    const ret = this.input.substring(from, to)
    return ret
  }
}
