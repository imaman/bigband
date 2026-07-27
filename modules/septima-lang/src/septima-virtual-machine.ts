import { stringify } from 'safe-stable-stringify'

import { CodeFile } from './code-emitter.js'
import { shouldNeverHappen } from './should-never-happen.js'

interface StackFrame {
  pc: number
  chunkId: number
  table: ValTable
}

export class SeptimaVirtualMachine {
  constructor(private readonly cf: CodeFile) {}

  /** the machine's operand stack */
  private opstack: unknown[] = []

  private callStack: StackFrame[] = []

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

  private strOrNum(): string | number {
    const ret = this.pop()
    if (typeof ret !== 'number' && typeof ret !== 'string') {
      throw new Error(`value type error: expected str or num but found ${JSON.stringify(ret)}`)
    }
    return ret
  }

  private mustBe(u: unknown, expectedType: 'string'): asserts u is string
  private mustBe(u: unknown, expectedType: 'number'): asserts u is number
  private mustBe(u: unknown, expectedType: 'boolean'): asserts u is boolean
  private mustBe(u: unknown, expectedType: 'string' | 'number' | 'boolean') {
    this.mustBeImpl(u, expectedType)
  }

  private mustBeImpl(u: unknown, expectedType: 'string' | 'number' | 'boolean') {
    if (typeof u !== expectedType) {
      const tn = { string: 'str', number: 'num', boolean: 'bool' }[expectedType]
      throw new Error(`value type error: expected ${tn} but found ${JSON.stringify(u)}`)
    }
  }

  run() {
    this.callStack.push({ chunkId: 0, pc: 0, table: ValTable.empty() })
    const ret = this.runLoop()
    if (this.opstack.length) {
      throw new Error(
        `opstack length is ${this.opstack.length} - stack=${JSON.stringify(this.opstack)} - cf=\n${this.cf.format()}`,
      )
    }
    return ret
  }

  private runLoop() {
    while (true) {
      const frame = this.callStack.at(-1)
      if (!frame) {
        return this.pop()
      }
      const instructions = this.cf.get(frame.chunkId)
      if (frame.pc >= instructions.length) {
        this.callStack.pop()
        continue
      }
      const at = instructions[frame.pc]
      if (at.tag === 'drop') {
        this.pop()
      } else if (at.tag === 'assertType') {
        const u = this.pop()
        this.push(u)
        this.mustBeImpl(u, at.param)
      } else if (at.tag === 'const') {
        this.push(at.param)
      } else if (at.tag === 'lambdaRef') {
        this.push(new LambdaRef(at.id, frame.table))
      } else if (at.tag === 'call') {
        const callee = this.pop()
        if (!(callee instanceof LambdaRef)) {
          throw new Error(`callee is not a reference to a lambda function: ${JSON.stringify(callee)}`)
        }

        const args: unknown[] = []
        for (let i = 0; i < at.param; ++i) {
          args[at.param - i - 1] = this.pop()
        }
        this.callStack.push({ chunkId: callee.id, pc: 0, table: callee.table })
      } else if (at.tag === 'binop') {
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
        } else if (
          at.mod === '%' ||
          at.mod === '*' ||
          at.mod === '**' ||
          at.mod === '-' ||
          at.mod === '/' ||
          at.mod === '>' ||
          at.mod === '<' ||
          at.mod === '>=' ||
          at.mod === '<='
        ) {
          const rhs = this.num()
          const lhs = this.num()
          const v =
            at.mod === '%'
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
          const v = at.mod === '==' ? eq : at.mod === '!=' ? !eq : shouldNeverHappen(at.mod)
          this.push(v)
        }
      } else if (at.tag === 'throw') {
        throw this.pop()
      } else if (at.tag === 'array') {
        const arr: unknown[] = []
        for (let i = 0; i < at.param; ++i) {
          arr[at.param - i - 1] = this.pop()
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
        const reciever = this.pop()
        if (typeof reciever !== 'object' || reciever === null) {
          throw new Error('----------tttttttttttttt---------')
        }
        // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
        this.push((reciever as Record<string, unknown>)[at.param])
      } else if (at.tag === 'spreadmark') {
        throw new Error(`not impl yet ${JSON.stringify(at)}`)
      } else if (at.tag === 'store') {
        frame.table = frame.table.add(at.param, this.pop())
      } else if (at.tag === 'load') {
        this.push(frame.table.lookup(at.param))
      } else if (at.tag === 'exitScope') {
        frame.table = frame.table.exitScope(at.param)
      } else if (at.tag === 'indexAccess') {
        const sel = this.strOrNum()
        // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
        const rec = this.pop() as Record<string | number, unknown>
        this.push(rec[sel])
      } else if (at.tag === 'ifFalse') {
        const b = this.bool()
        this.push(b)
        if (!b) {
          frame.pc = at.to
          continue
        }
      } else if (at.tag === 'ifTrue') {
        const b = this.bool()
        this.push(b)
        if (b) {
          frame.pc = at.to
          continue
        }
      } else if (at.tag === 'jump') {
        frame.pc = at.to
        continue
      } else {
        shouldNeverHappen(at.tag)
      }

      frame.pc += 1
    }
  }
}

class ValTable {
  private constructor(
    private readonly earlier: ValTable | undefined,
    private readonly name?: string,
    private readonly val?: unknown,
  ) {}

  static empty() {
    return new ValTable(undefined)
  }

  add(name: string, val: unknown) {
    return new ValTable(this, name, val)
  }

  exitScope(n: number) {
    let ret: ValTable = this
    while (n > 0) {
      --n
      const e = ret.earlier
      if (e === undefined) {
        throw new Error(`unbalanced val table`)
      }
      ret = e
    }

    return ret
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

class LambdaRef {
  constructor(readonly id: number, readonly table: ValTable) {}
}
