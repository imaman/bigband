import crypto from 'node:crypto'
import { stringify } from 'safe-stable-stringify'
import util from 'util'

import { CodeFile } from './code-emitter.js'
import { Outputter } from './outputter.js'
import { shouldNeverHappen } from './should-never-happen.js'

interface StackFrame {
  pc: number
  chunkId: number
  table: ValTable
  args: unknown[]
  lambdaRefs: LambdaRef[]
}

export class SeptimaVirtualMachine {
  constructor(
    private readonly cf: CodeFile,
    private readonly consoleLog?: Outputter,
    private readonly verbose?: boolean,
  ) {}

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
      throw new Error(`value type error: expected str or num but found ${this.format(ret)}`)
    }
    return ret
  }

  private format(u: unknown) {
    return u instanceof LambdaRef ? 'a function' : JSON.stringify(u)
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
      throw new Error(`value type error: expected ${tn} but found ${this.format(u)}`)
    }
  }

  run() {
    if (this.verbose) {
      // eslint-disable-next-line no-console
      console.log(`Program:\n${this.cf.format()}`)
    }
    this.callStack.push({ chunkId: 0, pc: 0, table: this.stdLib(), args: [], lambdaRefs: [] })
    const ret = this.runLoop()
    if (this.opstack.length) {
      throw new Error(
        `opstack length is ${this.opstack.length} - stack=${JSON.stringify(this.opstack)} - cf=\n${this.cf.format()}`,
      )
    }
    return toJs(ret)
  }

  private popArray(n: number) {
    const ret: unknown[] = []
    for (let i = 0; i < n; ++i) {
      ret[n - i - 1] = this.pop()
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

      if (this.verbose) {
        // eslint-disable-next-line no-console
        console.log(`[${frame.chunkId}.${frame.pc}] ${JSON.stringify(at)} -- ${JSON.stringify(this.opstack)}`)
      }
      if (at.tag === 'drop') {
        this.pop()
      } else if (at.tag === 'assertType') {
        const u = this.pop()
        this.push(u)
        this.mustBeImpl(u, at.param)
      } else if (at.tag === 'const') {
        this.push(at.param)
      } else if (at.tag === 'lambdaRef') {
        const lr = new LambdaRef(at.id, frame.table)
        this.push(lr)
        frame.lambdaRefs.push(lr)
      } else if (at.tag === 'call') {
        const callee = this.pop()
        if (typeof callee === 'function') {
          const retVal = callee(...this.popArray(at.param))
          this.push(retVal)
        } else {
          if (!(callee instanceof LambdaRef)) {
            throw new Error(`callee is not a reference to a lambda function: ${JSON.stringify(callee)}}`)
          }
          if (!callee.table) {
            throw new Error(`ValTable of LambdaRef (${callee.id}) is missing`)
          }

          this.callStack.push({
            chunkId: callee.id,
            pc: 0,
            table: callee.table,
            args: this.popArray(at.param),
            lambdaRefs: [],
          })
        }
      } else if (at.tag === 'loadArg') {
        this.push(frame.args.at(at.param))
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
        this.push(new SeptimaArray(arr))
      } else if (at.tag === 'constUndefined') {
        this.push(undefined)
      } else if (at.tag === 'object') {
        const arr: [string, unknown][] = []
        for (let i = 0; i < at.param; ++i) {
          const v = this.pop()
          const k = this.str()
          arr[at.param - i - 1] = [k, v]
        }
        this.push(new SeptimaObject(arr))
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
      } else if (at.tag === 'reserve') {
        frame.table = frame.table.prepare(at.name)
      } else if (at.tag === 'fillIn') {
        const v = this.pop()
        frame.table.resolve(at.name, v)
      } else if (at.tag === 'load') {
        this.push(frame.table.lookup(at.param))
      } else if (at.tag === 'exitScope') {
        frame.table = frame.table.exitScope(at.param)
      } else if (at.tag === 'indexAccess') {
        const sel = this.strOrNum()
        const rec = this.pop()
        if (rec instanceof SeptimaObject) {
          this.push(SeptimaObject.at(rec, sel))
        } else if (rec instanceof SeptimaArray) {
          this.push(rec.at(sel))
        } else {
          throw new Error(`Index access not allowed on type ${typeof rec}`)
        }
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

  private stdLib() {
    const log =
      this.consoleLog ??
      ((x: unknown) => {
        console.log(x) // eslint-disable-line no-console
      })

    return ValTable.empty()
      .add('JSON', { stringify: JSON.stringify, parse: (x: string) => fromJs(JSON.parse(x)) })
      .add('Array', { isArray: Array.isArray })
      .add('crypto', { hash224: (u: unknown) => crypto.createHash('sha224').update(JSON.stringify(u)).digest('hex') })
      .add('console', {
        log: (u: unknown) => {
          log(JSON.stringify(u))
          return u
        },
      })
      .add('Boolean', Boolean)
      .add('Number', Number)
      .add('String', String)
  }
}

const placeholder = {}

class ValTable {
  private constructor(
    private readonly earlier: ValTable | undefined,
    private readonly name?: string,
    private val?: unknown,
  ) {}

  static empty() {
    return new ValTable(undefined)
  }

  add(name: string, val: unknown) {
    return new ValTable(this, name, val)
  }

  prepare(name: string) {
    return new ValTable(this, name, placeholder)
  }

  resolve(name: string, val: unknown) {
    for (let curr: ValTable | undefined = this; curr; curr = curr.earlier) {
      if (curr.name === name && curr.val === placeholder) {
        curr.val = val
        return this
      }
    }

    throw new Error(`could not resolve: ${name}`)
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
      if (this.val === placeholder) {
        throw new Error(`Unresolved definition: ${name}`)
      }

      return this.val
    }

    const ret = this.earlier?.lookup(name)
    if (ret === undefined) {
      throw new Error(`Symbol ${name} was not found`)
    }
    return ret
  }

  toJSON() {
    const ret: unknown[] = []
    for (let curr: ValTable | undefined = this; curr; curr = curr.earlier) {
      if (curr.name) {
        ret.push([curr.name, curr.val])
      }
    }
    return ret
  }
}

class LambdaRef {
  constructor(readonly id: number, public readonly table: ValTable) {}

  toJSON() {
    return { id: this.id, _lambdaRef: '' }
  }
}

/**
 * Why do we need our own object?
 * (1) JS's native arrays' toString() format is not JSON.
 * (2) They have mutating methods (e.g., sort(), reverse()) which are a no-go in a purely functional language such as
 * Septima. Our design decision is to go opt-in than to opt-out.
 */
class SeptimaArray {
  constructor(readonly values: unknown[]) {}

  at(index: string | number) {
    if (typeof index === 'string') {
      throw new Error(`index into an array must be a number (got: ${index})`)
    }

    return this.values.at(index)
  }

  toJSON() {
    return this.values
  }

  toString() {
    return JSON.stringify(this.toJSON())
  }
}

/**
 * Why do we need our own object? JS's native objects' toString() format is not JSON (the dreaded "[object Object]".
 */
class SeptimaObject {
  constructor(entries: [string, unknown][]) {
    Object.assign(this, Object.fromEntries(entries))
  }
  toJSON() {
    return { ...this }
  }
  toString() {
    return JSON.stringify(this)
  }
  static at(o: SeptimaObject, index: string | number): unknown {
    if (typeof index === 'number') {
      throw new Error(`index into an object must be a string (got: ${index})`)
    }
    return Object.hasOwn(o, index) ? (o as unknown as Record<string, unknown>)[index] : undefined
  }
}

function toJs(u: unknown): unknown {
  const t = typeof u
  if (t === 'bigint' || t === 'boolean' || t === 'function' || t === 'number' || t === 'string' || t === 'undefined') {
    return u
  }

  if (t === 'symbol') {
    throw new Error(`cannot translate symbol: ${u}`)
  }

  if (u instanceof SeptimaObject) {
    return Object.fromEntries(Object.entries(u.toJSON()).map(([k, v]) => [k, toJs(v)]))
  }

  if (u instanceof SeptimaArray) {
    const ret = []
    for (const x of u.toJSON()) {
      ret.push(toJs(x))
    }

    return ret
  }

  throw new Error(`Non translatable toJs: ${util.inspect(u)}`)
}

function fromJs(u: unknown): unknown {
  if (u === null) {
    return undefined
  }
  const t = typeof u
  if (t === 'bigint' || t === 'boolean' || t === 'function' || t === 'number' || t === 'string' || t === 'undefined') {
    return u
  }

  if (t === 'symbol') {
    throw new Error(`cannot translate symbol: ${u}`)
  }

  if (Array.isArray(u)) {
    return new SeptimaArray(u.map(at => fromJs(at)))
  }

  if (typeof u === 'object') {
    return new SeptimaObject(Object.entries(u).map(([k, v]) => [k, fromJs(v)]))
  }

  throw new Error(`Non translatable fromJs: ${util.inspect(u)}`)
}
