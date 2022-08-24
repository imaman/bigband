interface Token {
  readonly text: string
  readonly offset: number
}

export class Scanner {
  private offset = 0
  constructor(private input: string) {
    this.eatWhitespace()
  }

  private curr() {
    return this.input.substring(this.offset)
  }

  private eatWhitespace() {
    this.consumeIf(/\s*/)
  }

  eof() {
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

  consume(r: RegExp | string): Token {
    const text = this.isMatching(r)
    if (!text) {
      throw new Error(`Expected ${r} at position ${this.offset} but found: ${this.synopsis().lookingAt}`)
    }

    const offset = this.offset
    this.offset += text.length

    this.eatWhitespace()
    return { offset, text }
  }

  consumeIf(r: RegExp | string): Token | undefined {
    const ret = this.isMatching(r)
    if (!ret) {
      return undefined
    }

    return this.consume(r)
  }

  isMatching(r: RegExp | string) {
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
}
