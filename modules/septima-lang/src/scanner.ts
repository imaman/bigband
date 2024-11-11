import { Location } from './location'
import { SourceCode } from './source-code'

export interface Token {
  readonly text: string
  readonly location: Location
}

type ConsumeIfBasicPattern = RegExp | string
type ConsumeIfPattern = { either: ConsumeIfBasicPattern[]; noneOf: ConsumeIfBasicPattern[] }

export class Scanner {
  constructor(readonly sourceCode: SourceCode, private offset = 0) {
    if (this.offset === 0) {
      this.eatWhitespace()
    }
  }

  get sourceRef() {
    return this.sourceCode.sourceRef(this.sourceCode.expandToEndOfLine({ offset: this.offset }))
  }

  private curr() {
    return this.sourceCode.input.substring(this.offset)
  }

  private eatBlockComment() {
    const startedAt = this.sourceRef
    while (true) {
      if (this.eof()) {
        throw new Error(`Block comment that started at ${startedAt} is missing its closing (*/)`)
      }
      if (this.consumeIf('*/')) {
        return
      }

      // By default, the . symbol in regexp does _not_ match newline. we use /./s to override the default.
      this.consume(/./s, false)
    }
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
      if (this.consumeIf('/*', false)) {
        this.eatBlockComment()
        continue
      }

      return
    }
  }

  eof(): boolean {
    return this.offset >= this.sourceCode.input.length
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

  headMatches(...patterns: (ConsumeIfPattern | ConsumeIfBasicPattern)[]): boolean {
    const alt = new Scanner(this.sourceCode, this.offset)
    for (const p of patterns) {
      const t = alt.consumeIf(p, true)
      if (t === undefined) {
        return false
      }
    }

    return true
  }

  consume(r: RegExp | string, eatWhitespace = true): Token {
    const text = this.match(r)
    if (text === undefined) {
      throw new Error(`Expected ${r} ${this.sourceRef}`)
    }

    const offset = this.offset
    this.offset += text.length

    if (eatWhitespace) {
      this.eatWhitespace()
    }
    return { location: { offset }, text }
  }

  consumeIf(p: ConsumeIfBasicPattern | ConsumeIfPattern, eatWhitespace = true): Token | undefined {
    const pattern = typeof p === 'string' ? { either: [p], noneOf: [] } : isRegExp(p) ? { either: [p], noneOf: [] } : p

    const found = pattern.either.find(r => this.match(r))
    const hasNegative = pattern.noneOf.some(r => this.match(r))
    const ret = found && !hasNegative
    if (!ret) {
      return undefined
    }

    return this.consume(found, eatWhitespace)
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
}

function isRegExp(u: object): u is RegExp {
  return u.constructor.name === 'RegExp'
}
