import crypto from 'node:crypto'
import { stringify } from 'safe-stable-stringify'
import util from 'util'

import { CodeFile } from './code-emitter.js'
import { Outputter } from './outputter.js'
import { shouldNeverHappen } from './should-never-happen.js'
import { failMe } from './fail-me.js'

interface StackFrame {
  pc: number
  chunkId: number
  table: ValTable
  args: unknown[]
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
    this.callStack.push({ chunkId: 0, pc: 0, table: this.stdLib(), args: [] })
    const ret = this.launch()
    if (this.opstack.length) {
      throw new Error(
        `opstack length is ${this.opstack.length} - stack=${JSON.stringify(this.opstack)} - cf=\n${this.cf.format()}`,
      )
    }
    return this.toJs(ret)
  }

  private popArray(n: number) {
    const ret: unknown[] = []
    for (let i = 0; i < n; ++i) {
      ret[n - i - 1] = this.pop()
    }
    return ret
  }

  private launch() {
    return this.runLoop(this.callStack.length)
  }

  private runLoop(n: number) {
    if (n < 1) {
      throw new Error(`n must be nonnegative`)
    }
    while (true) {
      if (this.callStack.length < n) {
        return this.pop()
      }

      const frame = this.callStack.at(-1) ?? failMe('callStack is empty')
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
        this.push(new LambdaRef(at.id, frame.table))
      } else if (at.tag === 'call') {
        const callee = this.pop()
        if (typeof callee === 'function') {
          const actuals = (this.toJs(this.popArray(at.param)) as unknown[])
          console.log(`L.132 call ${JSON.stringify(callee)} with ${JSON.stringify(actuals)}`)
          const retVal = callee(...actuals)
          console.log(`L.135 retVal=${JSON.stringify(retVal)}`)
          this.push(retVal)
        } else {
          if (!(callee instanceof LambdaRef)) {
            throw new Error(`Callee is not a function (it is: ${JSON.stringify(callee)})`)
          }
          if (!callee.table) {
            throw new Error(`ValTable of LambdaRef (${callee.id}) is missing`)
          }

          this.callStack.push({
            chunkId: callee.id,
            pc: 0,
            table: callee.table,
            args: this.popArray(at.param),
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
        const arr = this.popArray(at.n)
        this.push(new SeptimaArray(arr, at.spreads))
      } else if (at.tag === 'constUndefined') {
        this.push(undefined)
      } else if (at.tag === 'object') {
        let j = at.spreads.length - 1
        const arr: (SeptimaObject | [string, unknown])[] = []
        for (let i = at.n - 1; i >= 0; --i) {
          const isSpread = j >= 0 && at.spreads[j] === i
          if (isSpread) {
            --j
            const v = this.pop()
            if (v === undefined) {
              continue
            }
            if (!(v instanceof SeptimaObject)) {
              throw new Error(`value type error: expected obj but found ${JSON.stringify(v)}`)
            }
            arr[i] = v
          } else {
            const v = this.pop()
            const k = this.str()
            arr[i] = [k, v]
          }
        }
        this.push(new SeptimaObject(arr.filter(Boolean)))
      } else if (at.tag === 'unop') {
        if (at.mod === '!') {
          this.push(!this.bool())
        } else if (at.mod === '+') {
          this.push(+this.num())
        } else if (at.mod === '-') {
          this.push(-this.num())
        }
      } else if (at.tag === 'dot') {
        const reciever = this.pop() as Record<string, unknown>
        const x = reciever[at.param]
        if (typeof reciever === 'string' || reciever instanceof SeptimaArray) {
          let b = x
          if (typeof x === 'function') {
            const t = x.bind(reciever)
            b = (...args: unknown[]) => fromJs(t(...this.toJs(args, true) as unknown[]))
          }
          this.push(b)
        } else if (typeof reciever !== 'object' || reciever === null) {
          throw new Error('----------tttttttttttttt---------')
        } else {
          this.push(reciever[at.param])
        }
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
      .add('Object', {
        keys: (o: ObjLike) => fromJs(Object.keys(o)),
        entries: (o: ObjLike) => fromJs(Object.entries(o)),
        fromEntries: (arr: Iterable<[string, unknown]>) =>
          fromJs(Object.fromEntries(this.toJs(arr) as Iterable<[string, unknown]>)),
      })
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


  private toJs(u: unknown, debug = false): unknown {
    const ret = this.toJsImpl(u, debug)
    if (debug) {
      // eslint-disable-next-line no-console
      console.log(
        `${typeof u} | ${u instanceof Object ? u.constructor.name : 'n/o'} | ${JSON.stringify(u)} -> ${JSON.stringify(
          ret,
        )}`,
      )
    }
    return ret
  }

  private toJsImpl(u: unknown, debug = false): unknown {
    const t = typeof u
    if (t === 'bigint' || t === 'boolean' || t === 'function' || t === 'number' || t === 'string' || t === 'undefined') {
      return u
    }

    if (t === 'symbol') {
      throw new Error(`cannot translate symbol: ${u}`)
    }

    if (Array.isArray(u)) {      
      return u.map(at => this.toJs(at, debug))
    }

    if (u instanceof LambdaRef) {
      return (...args: unknown[]) => {
          this.callStack.push({
            chunkId: u.id,
            pc: 0,
            table: u.table,
            args: fromJs(args) as unknown[]
          })
          return this.launch()
        }
    }
    
    if (u instanceof SeptimaObject) {
      return Object.fromEntries(Object.entries(u.toJSON()).map(([k, v]) => [k, this.toJs(v, debug)]))
    }

    if (u instanceof SeptimaArray) {
      const ret = []
      for (const x of u.toJSON()) {
        ret.push(this.toJs(x, debug))
      }

      return ret
    }

    return u
  }  
}

type ObjLike = Partial<Record<string, unknown>>

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
class SeptimaArray implements Iterable<unknown> {
  readonly values: unknown[] = []

  get length() {
    return this.values.length
  }
  
  constructor(values: unknown[], spreads: number[] = []) {
    let j = 0
    for (let i = 0; i < values.length; ++i) {
      const v = values[i]
      const isSpread = j < spreads.length && spreads[j] === i
      if (isSpread) {
        ++j
        if (v === undefined) {
          continue
        }
        if (v instanceof SeptimaArray) {
          this.values.push(...v)
        } else {
          throw new Error(`value type error: expected arr but found ${JSON.stringify(v)}`)
        }
      } else {
        this.values.push(v)
      }
    }
  }

  at(index: string | number) {
    if (typeof index === 'string') {
      throw new Error(`index into an array must be a number (got: ${index})`)
    }

    return this.values.at(index)
  }

  concat(...args: unknown[]) {
    const arr: unknown[] = [...this.values]
    for (const a of args) {
      if (a instanceof SeptimaArray) {
        arr.push(...a.values)
      } else if (Array.isArray(a)) {
        arr.push(...a)
      } else {
        arr.push(a)
      }
    }
    return new SeptimaArray(arr)
  }

  every(predicate: (value: unknown, index: number, array: unknown[])=> boolean) {
    return this.values.every(predicate)
  }

  *[Symbol.iterator](): Iterator<unknown> {
    yield* this.values
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
  constructor(entries: (SeptimaObject | [string, unknown])[]) {
    const arr: [string, unknown][] = []
    for (const at of entries) {
      if (at instanceof SeptimaObject) {
        arr.push(...SeptimaObject.entries(at))
      } else {
        arr.push(at)
      }
    }
    const filtered = arr.filter(([_, v]) => v !== undefined)
    Object.assign(this, Object.fromEntries(filtered))
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
  static entries(o: SeptimaObject): [string, unknown][] {
    return Object.entries(o)
  }

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

  if (u instanceof SeptimaArray || u instanceof SeptimaObject) {
    return u
  }

  if (Array.isArray(u)) {
    return new SeptimaArray(
      u.map(at => fromJs(at)),
      [],
    )
  }

  if (typeof u === 'object') {
    return new SeptimaObject(Object.entries(u).map(([k, v]) => [k, fromJs(v)]))
  }

  throw new Error(`Non translatable fromJs: ${util.inspect(u)}`)
}
