import { AstNode, span } from './ast-node'
import { Span } from './location'
import { Scanner } from './scanner'

export class SourceCode {
  // TODO(imaman): reduce deps.
  constructor(private readonly scanner: Scanner) {}

  formatTrace(trace: AstNode[]): string {
    const spacer = '  '

    const formatted = trace
      .map(ast => this.sourceRef(span(ast)))
      .reverse()
      .join(`\n${spacer}`)
    return `${spacer}${formatted}`
  }

  sourceRef(span: Span | undefined) {
    if (!span) {
      return `at <unknown location>`
    }
    return `at ${this.formatSpan(span)} ${this.interestingPart(span)}`
  }

  formatSpan(span: Span) {
    const f = this.scanner.resolveLocation(span.from)
    const t = this.scanner.resolveLocation(span.to)
    if (f.line === t.line) {
      return `(${f.line + 1}:${f.col + 1}..${t.col + 1})`
    }

    return `(${f.line + 1}:${f.col + 1}..${t.line + 1}:${t.col + 1})`
  }

  private interestingPart(span: Span) {
    const f = this.scanner.resolveLocation(span.from)
    const t = this.scanner.resolveLocation(span.to)

    const strip = (s: string) => s.replace(/^[\n]*/, '').replace(/[\n]*$/, '')
    const limit = 80

    const lineAtFrom = this.scanner.lineAt(span.from)
    if (f.line !== t.line) {
      return `${strip(lineAtFrom).substring(0, limit)}...`
    }

    const stripped = strip(lineAtFrom.substring(f.col, t.col + 1))
    if (stripped.length <= limit) {
      return stripped
    }
    return `${stripped.substring(0, limit)}...`
  }
}
