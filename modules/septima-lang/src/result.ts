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
    .reverse()
    .join(`\n${spacer}`)
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

// TODO(imaman): generate a stack trace that is similar to node's a-la:
// $ node a.js
// /home/imaman/code/imaman/bigband/d.js:3
//     return arg.n.foo()
//                  ^
//
// TypeError: Cannot read properties of undefined (reading 'foo')
//     at d (/home/imaman/code/imaman/bigband/d.js:3:18)
//     at c (/home/imaman/code/imaman/bigband/c.js:4:15)
//     at b (/home/imaman/code/imaman/bigband/b.js:4:15)
//     at Object.<anonymous> (/home/imaman/code/imaman/bigband/a.js:3:1)
//     at Module._compile (node:internal/modules/cjs/loader:1155:14)
//     at Object.Module._extensions..js (node:internal/modules/cjs/loader:1209:10)
//     at Module.load (node:internal/modules/cjs/loader:1033:32)
//     at Function.Module._load (node:internal/modules/cjs/loader:868:12)
//     at Function.executeUserEntryPoint [as runMain] (node:internal/modules/run_main:81:12)
//     at node:internal/main/run_main_module:22:47
