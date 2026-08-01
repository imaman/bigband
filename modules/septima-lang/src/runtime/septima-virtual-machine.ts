import crypto from 'node:crypto'
import { stringify } from 'safe-stable-stringify'
import util from 'util'

import { CodeFile } from '../code-emitter.js'
import { failMe } from '../fail-me.js'
import { Outputter } from '../outputter.js'
import { shouldNeverHappen } from '../should-never-happen.js'
import { LambdaRef } from './lambda-ref.js'
import { SeptimaArray } from './septima-array.js'
import { SeptimaObject } from './septima-object.js'
import { ValTable } from './val-table.js'

interface StackFrame {
  pc: number
  chunkId: number
  table: ValTable
  args: unknown[]
  /**
   * Whether to just export this units' definitions
   */
  export: boolean
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
    this.callStack.push({ chunkId: 0, pc: 0, table: this.stdLib(), args: [], export: false })

    let value
    try {
      value = this.launch()
    } catch (e) {
      const f = this.getFrame(-1)
      const { ast } = this.cf.read(f, true)
      const ee = e as { message?: unknown }
      const innerMessage = ee.message ? String(ee.message) : String(ee)
      const trace = this.callStack.map((at, i) => {
        const { ast } = this.cf.read(at, i === this.callStack.length - 1)
        return ast
      })
      return {
        tag: 'err' as const,
        where: ast,
        trace,
        message: innerMessage,
      }
    }
    if (this.opstack.length) {
      throw new Error(
        `opstack length is ${this.opstack.length} - stack=${JSON.stringify(this.opstack)} - cf=\n${this.cf.format()}`,
      )
    }
    return { tag: 'ok' as const, value: this.toJs(value) }
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

  /**
   * Returns a frame from the call stack
   *
   * @param pos selects the frame to return. 0 is the earliest frame in the stack. 1 is the second earliest. -1 is the
   * most recent frame.
   */
  private getFrame(pos: number) {
    return this.callStack.at(pos) ?? failMe(`No frame at position ${pos}`)
  }

  private runLoop(n: number) {
    if (n < 1) {
      throw new Error(`n must be nonnegative`)
    }
    while (true) {
      if (this.callStack.length < n) {
        return this.pop()
      }

      const frame = this.getFrame(-1)
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
      if (at.tag === 'import') {
        // TODO(imaman): module cache
        this.callStack.push({
          chunkId: at.chunkId,
          pc: 0,
          table: this.stdLib(),
          args: [],
          export: true,
        })
      } else if (at.tag === 'export*') {
        if (frame.export) {
          const pairs = frame.table.collectExported(at.n)
          this.push(new SeptimaObject(pairs))
          this.callStack.pop()
          continue
        }
      } else if (at.tag === 'drop') {
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
          const actuals = this.toJs(this.popArray(at.param)) as unknown[]
          const retVal = callee(...actuals)
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
            export: false,
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
        const v = reciever[at.param]
        if (typeof reciever === 'string' || reciever instanceof SeptimaArray) {
          let b = v
          if (typeof v === 'function') {
            // This can happen if an input passed to the septima program (from the outside world) is a function which
            // is then getting called at septima-runtime. Now comes this question: should we (i) do a
            // septima-to-js translate on the actual parameters passed to that function or (ii) keep them as-is?
            // Note that SeptimaFunctions cannot be roundtripped. Hence, going with (i) means that if a septima function
            // is passed as a parameter and then returned it is no longer a septima function. It is a native function
            // inovcation of which breaks out of SpetimaVirtualMachine's runLoop thus adding a stack-frame to JS's
            // native stack. Going with (ii) means that the invoked function cannot call callback it receives.
            // Decision: we are going with (i)
            const t = v.bind(reciever)
            b = (...args: unknown[]) => fromJs(t(...(this.toJs(args) as unknown[])))
          }
          this.push(b)
        } else if (typeof reciever !== 'object' || reciever === null) {
          throw new Error('----------tttttttttttttt---------')
        } else {
          this.push(v)
        }
      } else if (at.tag === 'store') {
        frame.table = frame.table.add(at.param, this.pop())
      } else if (at.tag === 'reserve') {
        frame.table = frame.table.reserve(at.name, at.isExported)
      } else if (at.tag === 'fillIn') {
        const v = this.pop()
        frame.table.fillIn(at.name, v)
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
        keys: (o: ObjLike) => new SeptimaArray(Object.keys(o)),
        entries: (o: ObjLike) => new SeptimaArray(Object.entries(o)),
        fromEntries: (arr: Iterable<[string, unknown]>) => {
          if (typeof arr === 'function') {
            throw new Error(`fromEntries() input (a function) is not an array`)
          }
          if (!Array.isArray(arr)) {
            throw new Error(`fromEntries() input (${JSON.stringify(arr)}) is not an array`)
          }
          return new SeptimaObject([...arr])
        },
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
    if (
      t === 'bigint' ||
      t === 'boolean' ||
      t === 'function' ||
      t === 'number' ||
      t === 'string' ||
      t === 'undefined'
    ) {
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
          args: fromJs(args) as unknown[],
          export: false,
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
