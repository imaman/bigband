import {stringify} from 'safe-stable-stringify'
import { CodeFile } from './code-emitter.js'
import { shouldNeverHappen } from './should-never-happen.js'
import { EmptySymbolTable } from './symbol-table.js'

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
    this.mustBe(ret, 'boolean')
    return ret
  }
  private num() {
    const ret = this.pop()
    this.mustBe(ret, 'number')
    return ret
  }

  private str() {
    const ret = this.pop()
    this.mustBe(ret, 'string')
    return ret
  }
  
  private mustBe(u: unknown, expectedType: 'string'): asserts u is string
  private mustBe(u: unknown, expectedType: 'number'): asserts u is number
  private mustBe(u: unknown, expectedType: 'boolean'): asserts u is boolean
  private mustBe(u: unknown, expectedType: 'string' | 'number' | 'boolean') {
    if (typeof u !== expectedType) {
      const tn = {'string': 'str', 'number': 'num', 'boolean': 'bool'}[expectedType]
      throw new Error(`value type error: expected ${tn} but found ${JSON.stringify(u)}`)
    }
  }

  run() {
    let table = ValTable.empty()
    for (const at of this.cf.codes) {
      if (at.tag === 'const') {
        this.push(at.param)
      } else if (at.tag === 'binop') {
        if (at.mod === '&&' || at.mod === '||' || at.mod === '??') {
          throw new Error(`not yet ${JSON.stringify(at)}`)
        }

        if (at.mod === '+') {
          const rhs = this.pop()
          const lhs = this.pop()
          if (typeof lhs === 'number') {
            this.mustBe(rhs, 'number')
            this.push(lhs + rhs)
          } else if (typeof lhs === 'string') {
            this.mustBe(rhs, 'string')
            this.push(lhs + rhs)
          } else {
            throw new Error(`+ not supported for type ${typeof lhs}`)
          }
          continue
        }
        if (at.mod === '%' || at.mod === '*' || at.mod === '**'|| at.mod === '-'|| at.mod === '/'
            || at.mod === '>' || at.mod === '<' || at.mod === '>=' || at.mod === '<='
        ) {
          const rhs = this.num()
          const lhs = this.num()
          const v =at.mod === '%'
              ? lhs % rhs
              : at.mod === '*'
              ? lhs * rhs
              : at.mod === '**'
              ? lhs ** rhs
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
              : shouldNeverHappen(at.mod)
          this.push(v)
        } else {
            const rhs = this.pop()
            const lhs = this.pop()
            const eq = lhs === rhs || stringify(lhs) === stringify(rhs)
            const v = at.mod === '=='
              ? eq
              : at.mod === '!='
              ? !eq
              : shouldNeverHappen(at.mod)
          this.push(v)
        }
      } else if (at.tag === 'throw') {
        throw this.pop()
      } else if (at.tag === 'array') {
        const arr: unknown[] = []
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
      } else if (at.tag === 'spreadmark') {
        throw new Error(`not impl yet ${JSON.stringify(at)}`)
      } else if (at.tag === 'store') {
        table = table.add(at.param, this.pop())
      } else if (at.tag === 'load') {
        this.push(table.lookup(at.param))
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


class ValTable {
  private constructor(private readonly earlier: ValTable|undefined, private readonly name?: string, private readonly val?: unknown) {}


  static empty() {
    return new ValTable(undefined)
  }

  add(name: string, val: unknown) {
    return new ValTable(this, name, val)
  }

  lookup(name: string): unknown {
    if (this.name === name) {
      return this.val
    }

    const ret = this.earlier?.lookup(name)
    if (ret === undefined) {
      throw new Error(`Symbol ${name} was not found`)
    }
    return ret
  }
}