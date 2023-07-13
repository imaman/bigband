import { AstNode } from './ast-node'
import { failMe } from './fail-me'
import { Span } from './location'
import { SourceUnit } from './septima'
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
    return this.sink.where()?.span
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

export function createResultSink(sink: Value, unitByFileName: Map<string, SourceUnit>): ResultSink {
  if (!sink.isSink()) {
    throw new Error(`not a sink! (${sink})`)
  }

  const sourceCode = (unitId: string) =>
    (unitByFileName.get(unitId) ?? failMe(`source code not found for ${unitId}`)).sourceCode
  const format = (ast: AstNode) => sourceCode(ast.unitId).formatAst(ast)

  const spacer = '  '
  const joined = sink
    .trace()
    ?.map(at => format(at))
    .join(spacer)
  const trace = joined ? `${spacer}${joined}` : undefined

  const w = sink.where()
  let message = trace
  if (!message && w?.span && w?.unitId) {
    message = sourceCode(w.unitId).sourceRef(w.span)
  }
  message = `Evaluated to sink: ${message}`

  return {
    tag: 'sink',
    where: sink.where()?.span,
    trace,
    symbols: sink.symbols()?.export(),
    message,
  }
}
