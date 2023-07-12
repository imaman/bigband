import { AstNode, span } from './ast-node'
import { Location, Location2d, Span } from './location'

export class SourceCode {
  constructor(readonly input: string, readonly pathFromSourceRoot: string) {}

  formatTrace(trace: AstNode[]): string {
    const spacer = '  '

    const formatted = trace
      .map(ast => this.sourceRef(span(ast)))
      .reverse()
      .join(`\n${spacer}`)
    return `${spacer}${formatted}`
  }

  sourceRefOfLocation(loc: Location) {
    return this.sourceRef(this.expandToEndOfLine(loc))
  }

  sourceRef(span: Span | undefined) {
    if (!span) {
      return `at <unknown location>`
    }
    return `at ${this.formatSpan(span)} ${this.interestingPart(span)}`
  }

  formatSpan(span: Span) {
    const f = this.resolveLocation(span.from)
    const t = this.resolveLocation(span.to)
    if (f.line === t.line) {
      return `(${f.line + 1}:${f.col + 1}..${t.col + 1})`
    }

    return `(${f.line + 1}:${f.col + 1}..${t.line + 1}:${t.col + 1})`
  }

  private interestingPart(span: Span) {
    const f = this.resolveLocation(span.from)
    const t = this.resolveLocation(span.to)

    const strip = (s: string) => s.replace(/^[\n]*/, '').replace(/[\n]*$/, '')
    const limit = 80

    const lineAtFrom = this.lineAt(span.from)
    if (f.line !== t.line) {
      return `${strip(lineAtFrom).substring(0, limit)}...`
    }

    const stripped = strip(lineAtFrom.substring(f.col, t.col + 1))
    if (stripped.length <= limit) {
      return stripped
    }
    return `${stripped.substring(0, limit)}...`
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

  /**
   * Returns a span starting a the given input location that runs all the way to the end of the line. Specifically, the
   * returned span's `.to` location will point at the character (in the same line as `loc`) that is immediately before
   * the terminating newline character.
   */
  expandToEndOfLine(loc: Location): Span {
    let endOfLine = this.input.indexOf('\n', loc.offset)
    if (endOfLine < 0) {
      endOfLine = this.input.length - 1
    }
    return { from: loc, to: { offset: endOfLine } }
  }

  lineAt(loc: Location) {
    const precedingNewline = this.input.lastIndexOf('\n', loc.offset)
    // add a + 1 to skip over the '\n' character (it is not part of the line). Also works if precedingNewLine is -1 (no
    // preceding newline exists)
    const startOfLine = precedingNewline + 1
    const endOfLine = this.expandToEndOfLine(loc).to

    const ret = this.input.substring(startOfLine, endOfLine.offset + 1)
    return ret
  }
}
