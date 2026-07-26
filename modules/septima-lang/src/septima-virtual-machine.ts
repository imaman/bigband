import { CodeFile } from './code-emitter.js'
import { shouldNeverHappen } from './should-never-happen.js'

export class SeptimaVirtualMachine {
  constructor(private readonly cf: CodeFile) {}

  private opstack: unknown[] = []

  private push(u: unknown) {
    this.opstack.push(u)
  }

  private pop() {
    return this.opstack.pop()
  }

  run() {
    for (const at of this.cf.codes) {
      if (at.tag === 'const') {
        this.push(at.param)
      } else if (at.tag === 'binop') {
        const rhs = Number(this.pop())
        const lhs = Number(this.pop())
        const v =
          at.mod === '!='
            ? lhs != rhs
            : at.mod === '%'
            ? lhs % rhs
            : at.mod === '*'
            ? lhs * rhs
            : at.mod === '**'
            ? lhs ** rhs
            : at.mod === '+'
            ? lhs + rhs
            : at.mod === '-'
            ? lhs - rhs
            : at.mod === '/'
            ? lhs / rhs
            : at.mod === '>'
            ? lhs > rhs
            : at.mod === '<'
            ? lhs < rhs
            : at.mod === '>='
            ? lhs >= rhs
            : at.mod === '<='
            ? lhs <= rhs
            : at.mod === '=='
            ? lhs == rhs
            : at.mod === '&&'
            ? lhs && rhs
            : at.mod === '||'
            ? lhs || rhs
            : at.mod === '??'
            ? lhs ?? rhs
            : shouldNeverHappen(at.mod)
        this.push(v)
      } else if (at.tag === 'throw') {
        throw this.pop()
      } else if (at.tag === 'array') {
        const arr = new Array(at.param).fill(undefined)
        for (let i = 0; i < at.param; ++i) {
          arr.push(this.pop())
        }
        this.push(arr)
      } else if (at.tag === 'constUndefined') {
        this.push(undefined)
      } else if (at.tag === 'object') {
        const arr = new Array(at.param).fill(undefined)
        for (let i = 0; i < at.param; i += 2) {
          const v = this.pop()
          const k = this.pop()
          arr.push([k, v])
        }
        this.push(Object.fromEntries(arr))
      } else if (at.tag === 'unop') {
        const a = Number(this.pop())
        const v = at.mod === '!' ? !a : at.mod === '+' ? +a : at.mod === '-' ? -a : shouldNeverHappen(at.mod)
        this.push(v)
      } else if (at.tag === 'dot') {
        throw new Error(`not impl yet ${JSON.stringify(at)}`)
      } else if (at.tag === 'load') {
        throw new Error(`not impl yet ${JSON.stringify(at)}`)
      } else if (at.tag === 'spreadmark') {
        throw new Error(`not impl yet ${JSON.stringify(at)}`)
      } else if (at.tag === 'store') {
        throw new Error(`not impl yet ${JSON.stringify(at)}`)
      } else {
        shouldNeverHappen(at.tag)
      }
    }

    const ret = this.pop() ?? undefined
    if (ret === undefined) {
      throw new Error(`nothing to return`)
    }

    return ret
  }
}
