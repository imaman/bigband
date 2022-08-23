export class Parser {
  private offset = 0
  constructor(private input: string) {}

  private curr() {
    return this.input.substring(this.offset)
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

  consumeAny(...r: string[]) {
    for (const curr of r) {
      const m = this.isMatching(curr)
      if (m) {
        return m
      }
    }

    throw new Error(
      `Expected one of ${r.join(', ')} at position ${this.offset} but found: ${this.synopsis().lookingAt}`,
    )
  }

  consume(r: RegExp | string) {
    const ret = this.isMatching(r)
    if (!ret) {
      throw new Error(`Expected ${r} at position ${this.offset} but found: ${this.synopsis().lookingAt}`)
    }

    this.offset += ret.length
    return ret
  }

  consumeIf(r: RegExp | string) {
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
