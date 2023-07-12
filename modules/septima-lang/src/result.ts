import { Span } from './location'
import { SourceCode } from './source-code'
import { Value } from './value'

export type ResultSink = {
  tag: 'sink'
  where: Span | undefined
  trace: string | undefined
  symbols: Record<string, unknown> | undefined
  message: string
}

export type Result =
  | {
      tag: 'ok'
      value: unknown
    }
  | ResultSink

export class ResultSinkImpl implements ResultSink {
  readonly tag = 'sink'
  constructor(private readonly sink: Value, private readonly sourceCode: SourceCode) {}

  get where(): Span | undefined {
    return this.sink.span()
  }

  get trace() {
    const trace = this.sink.trace()
    if (trace) {
      return this.sourceCode.formatTrace(trace)
    }

    return undefined
  }

  get symbols() {
    return this.sink.symbols()?.export()
  }

  get message(): string {
    const at = this.trace ?? this.sourceCode.sourceRef(this.where)
    return `Evaluated to sink: ${at}`
  }
}
