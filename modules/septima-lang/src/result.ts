import { AstNode, UnitId } from './ast-node'
import { failMe } from './fail-me'
import { Span } from './location'
import { SourceUnit } from './septima'

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

const sourceCode = (unitId: string, unitByUnitId: Map<UnitId, SourceUnit>) =>
  (unitByUnitId.get(unitId) ?? failMe(`source code not found for ${unitId}`)).sourceCode

export function formatTrace(trace: AstNode[] | undefined, unitByUnitId: Map<UnitId, SourceUnit>) {
  if (!trace) {
    return undefined
  }
  const format = (ast: AstNode) => sourceCode(ast.unitId, unitByUnitId).formatAst(ast)

  const spacer = '  '
  const joined = trace
    .map(at => format(at))
    .reverse()
    .join(`\n${spacer}`)
  return joined ? `${spacer}${joined}` : undefined
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
