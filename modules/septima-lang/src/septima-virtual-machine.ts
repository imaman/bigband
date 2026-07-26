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

  private bool() {
    const ret = this.pop()
    if (typeof ret !== 'boolean') {
      throw new Error(`value type error: expected bool but found ${JSON.stringify(ret)}`)
    }
    return ret
  }
  private num() {
    const ret = this.pop()
    if (typeof ret !== 'number') {
      throw new Error(`value type error: expected num but found ${JSON.stringify(ret)}`)
    }
    return ret
  }

  private str() {
    const ret = this.pop()
    if (typeof ret !== 'string') {
      throw new Error(`value type error: expected str but found ${JSON.stringify(ret)}`)
    }
    return ret
  }

  run() {
    for (const at of this.cf.codes) {
      if (at.tag === 'const') {
        this.push(at.param)
      } else if (at.tag === 'binop') {
        if (at.mod === '&&' || at.mod === '||' || at.mod === '??') {
          throw new Error(`not yet ${JSON.stringify(at)}`)
        }
        const rhs = this.num()
        const lhs = this.num()
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
        const arr: [string, unknown][] = []
        for (let i = 0; i < at.param * 2; i += 2) {
          const v = this.pop()
          const k = this.str()
          arr.push([k, v])
        }
        this.push(Object.fromEntries(arr))
      } else if (at.tag === 'unop') {
        if (at.mod === '!') {
          this.push(!this.bool())
        } else if (at.mod === '+') {
          this.push(+this.num())
        } else if (at.mod === '-') {
          this.push(-this.num())
        }
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
