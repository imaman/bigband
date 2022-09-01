import { Lambda, show } from './ast-node'
import { failMe } from './fail-me'
import { Runtime } from './runtime'
import { shouldNeverHappen } from './should-never-happen'
import { SymbolTable } from './symbol-table'

type Inner =
  | { tag: 'num'; val: number }
  | { tag: 'bool'; val: boolean }
  | { tag: 'str'; val: string }
  | { tag: 'arr'; val: Value[] }
  | { tag: 'obj'; val: Record<string, Value> }
  | { tag: 'lambda'; val: { ast: Lambda; table: SymbolTable } }
  | { tag: 'foreign'; val: (...args: Value[]) => unknown }

type InferTag<Q> = Q extends { tag: infer B } ? (B extends string ? B : never) : never

type Tag = InferTag<Inner>

export class Value {
  private constructor(private readonly inner: Inner) {}

  static bool(val: boolean): Value {
    return new Value({ val, tag: 'bool' })
  }
  static num(val: number): Value {
    return new Value({ val, tag: 'num' })
  }
  static str(val: string): Value {
    return new Value({ val, tag: 'str' })
  }
  static arr(val: Value[]): Value {
    return new Value({ val, tag: 'arr' })
  }
  static obj(val: Record<string, Value>): Value {
    return new Value({ val, tag: 'obj' })
  }
  static lambda(ast: Lambda, table: SymbolTable): Value {
    return new Value({ val: { ast, table }, tag: 'lambda' })
  }

  static foreign(f: (...args: Value[]) => unknown) {
    return new Value({ tag: 'foreign', val: f })
  }

  private static fromUnknown(u: unknown): Value {
    if (u instanceof Value) {
      return u
    }
    if (typeof u === 'boolean') {
      return Value.bool(u)
    }
    if (typeof u === 'number') {
      return Value.num(u)
    }
    if (typeof u === 'string') {
      return Value.str(u)
    }
    if (Array.isArray(u)) {
      return Value.arr(u.map(curr => this.fromUnknown(curr)))
    }

    if (typeof u === 'undefined') {
      throw new Error(`Cannot convert undefined to Value`)
    }

    if (u && typeof u === 'object') {
      Value.obj(Object.fromEntries(Object.entries(u).map(([k, v]) => [k, Value.fromUnknown(v)])))
    }

    throw new Error(`cannot convert ${JSON.stringify(u)} to Value`)
  }

  unwrap(t: Tag): unknown
  unwrap(): unknown
  unwrap(t?: Tag): unknown {
    if (t !== undefined) {
      if (t !== this.inner.tag) {
        throw new Error(`Type mismatch: expected <${t}> but actual type is <${this.inner.tag}>`)
      }
    }

    return this.inner.val
  }

  assertBool(): boolean {
    if (this.inner.tag === 'bool') {
      return this.inner.val
    }

    throw new Error(`Not a boolean: ${JSON.stringify(this.inner.val)}`)
  }

  assertNum(): number {
    if (this.inner.tag === 'num') {
      return this.inner.val
    }

    throw new Error(`Not a number: ${JSON.stringify(this.inner.val)}`)
  }

  assertStr(): string {
    if (this.inner.tag === 'str') {
      return this.inner.val
    }

    throw new Error(`Not a string: ${JSON.stringify(this.inner.val)}`)
  }

  assertArr(): unknown[] {
    if (this.inner.tag === 'arr') {
      return this.inner.val
    }

    throw new Error(`Not an array: ${JSON.stringify(this.inner.val)}`)
  }

  assertObj(): Record<string, Value> {
    if (this.inner.tag === 'obj') {
      return this.inner.val
    }

    throw new Error(`Not an object: ${JSON.stringify(this.inner.val)}`)
  }

  assertLambda() {
    if (this.inner.tag === 'lambda') {
      return this.inner.val
    }

    throw new Error(`Not a lambda: ${JSON.stringify(this.inner.val)}`)
  }

  isLambda() {
    return this.inner.tag === 'lambda'
  }

  or(that: Value) {
    if (this.inner.tag === 'bool' && that.inner.tag === 'bool') {
      return Value.bool(this.inner.val || that.inner.val)
    }

    this.requireType('bool')
    that.requireType('bool')
    throw new Error(`Inconsistent types: ${this.inner.tag}, ${that.inner.tag}`)
  }

  and(that: Value) {
    if (this.inner.tag === 'bool' && that.inner.tag === 'bool') {
      return Value.bool(this.inner.val && that.inner.val)
    }

    this.requireType('bool')
    that.requireType('bool')
    throw new Error(`Inconsistent types: ${this.inner.tag}, ${that.inner.tag}`)
  }

  equalsTo(that: Value) {
    if (this.inner.tag !== that.inner.tag) {
      return Value.bool(false)
    }

    // TODO(imaman): much better comparison is needed here
    const b = JSON.stringify(this.inner.val) === JSON.stringify(that.inner.val)
    return Value.bool(b)
  }

  not() {
    if (this.inner.tag === 'bool') {
      return Value.bool(!this.inner.val)
    }

    this.requireType('bool')
    throw new Error(`Inconsistent types: ${this.inner.tag}`)
  }

  requireType(t: string) {
    if (this.inner.tag !== t) {
      throw new Error(`value type error: expected ${t} but found: ${this.inner.val}`)
    }
  }

  plus(that: Value) {
    if (this.inner.tag === 'num' && that.inner.tag === 'num') {
      return Value.num(this.inner.val + that.inner.val)
    }

    if (this.inner.tag === 'str') {
      return Value.str(this.inner.val + that.inner.val)
    }

    throw new Error(`Type error: operator cannot be applied to operands of type ${this.inner.tag}, ${that.inner.tag}`)
  }
  minus(that: Value) {
    if (this.inner.tag === 'num' && that.inner.tag === 'num') {
      return Value.num(this.inner.val - that.inner.val)
    }
    this.requireType('num')
    that.requireType('num')
    throw new Error(`Inconsistent types: ${this.inner.tag}, ${that.inner.tag}`)
  }
  times(that: Value) {
    if (this.inner.tag === 'num' && that.inner.tag === 'num') {
      return Value.num(this.inner.val * that.inner.val)
    }
    this.requireType('num')
    that.requireType('num')
    throw new Error(`Inconsistent types: ${this.inner.tag}, ${that.inner.tag}`)
  }
  power(that: Value) {
    if (this.inner.tag === 'num' && that.inner.tag === 'num') {
      return Value.num(this.inner.val ** that.inner.val)
    }
    this.requireType('num')
    that.requireType('num')
    throw new Error(`Inconsistent types: ${this.inner.tag}, ${that.inner.tag}`)
  }
  over(that: Value) {
    if (this.inner.tag === 'num' && that.inner.tag === 'num') {
      return Value.num(this.inner.val / that.inner.val)
    }
    this.requireType('num')
    that.requireType('num')
    throw new Error(`Inconsistent types: ${this.inner.tag}, ${that.inner.tag}`)
  }
  modulo(that: Value) {
    if (this.inner.tag === 'num' && that.inner.tag === 'num') {
      return Value.num(this.inner.val % that.inner.val)
    }
    this.requireType('num')
    that.requireType('num')
    throw new Error(`Inconsistent types: ${this.inner.tag}, ${that.inner.tag}`)
  }

  negate() {
    if (this.inner.tag === 'num') {
      return Value.num(-this.inner.val)
    }
    this.requireType('num')
    throw new Error(`Inconsistent types: ${this.inner.tag}`)
  }

  compare(that: Value) {
    if (this.inner.tag === 'num') {
      const d = this.minus(that)?.inner.val
      return d < 0 ? -1 : d > 0 ? 1 : 0
    }

    if (this.inner.tag === 'str') {
      const rhs = that.assertStr()

      const d = this.inner.val.localeCompare(rhs)
      return d < 0 ? -1 : d > 0 ? 1 : 0
    }
    if (this.inner.tag === 'bool') {
      const lhs = this.assertBool()
      const rhs = that.assertBool()

      return lhs && !rhs ? 1 : !lhs && rhs ? -1 : 0
    }

    throw new Error(`Cannot compare when the left-hand-side value is of type ${this.inner.tag}`)
  }

  private toStringOrNumber(indexValue: string | Value): string | number {
    if (typeof indexValue === 'string') {
      return indexValue
    } else {
      const i = indexValue.inner
      if (i.tag == 'str') {
        return i.val
      } else if (i.tag === 'num') {
        return i.val
      } else if (i.tag === 'arr' || i.tag === 'bool' || i.tag == 'lambda' || i.tag === 'obj' || i.tag === 'foreign') {
        throw new Error(`Invalid index value: ${indexValue}`)
      } else {
        shouldNeverHappen(i)
      }
    }
  }

  access(indexValue: string | Value, runtime?: Runtime): Value {
    if (this.inner.tag === 'obj') {
      const index = this.toStringOrNumber(indexValue)
      return this.inner.val[index]
    }
    if (this.inner.tag === 'arr') {
      if (typeof indexValue === 'string') {
        return this.arrayMethods(this.inner.val, indexValue, runtime)
      }

      const i: number = indexValue.assertNum()
      return this.inner.val[i]
    }

    if (this.inner.tag === 'str') {
      return this.stringMethods(this.inner.val, indexValue)
    }

    if (
      this.inner.tag === 'bool' ||
      this.inner.tag === 'lambda' ||
      this.inner.tag === 'num' ||
      this.inner.tag === 'foreign'
    ) {
      throw new Error(`Cannot access an object of type ${this.inner.tag}`)
    }

    shouldNeverHappen(this.inner)
  }

  /**
   * return an implementation for array methods. The following Array methods were not implemented
   * as it is hard to find an intuitive immutable API due to their mutable nature:
   *  - copyWithin
   *  - fill
   *  - forEach
   *  - keys
   *  - pop
   *  - push
   *  - shift
   *  - unshift
   */
  private arrayMethods(s: unknown[], index: string, runtime?: Runtime) {
    const rt = () => runtime ?? failMe('runtime is flasy')

    if (index === 'at') {
      return Value.foreign(n => s.at(n.assertNum()))
    }
    if (index === 'concat') {
      return Value.foreign(arg => s.concat(arg.assertArr()))
    }
    if (index === 'entries') {
      return Value.foreign(() => [...s.entries()])
    }
    if (index === 'every') {
      return Value.foreign(predicate =>
        s.every(item =>
          rt()
            .call(predicate, [Value.fromUnknown(item)])
            .assertBool(),
        ),
      )
    }
    if (index === 'filter') {
      return Value.foreign(predicate =>
        s.filter(item =>
          rt()
            .call(predicate, [Value.fromUnknown(item)])
            .assertBool(),
        ),
      )
    }
    if (index === 'find') {
      return Value.foreign(predicate =>
        s.find(item =>
          rt()
            .call(predicate, [Value.fromUnknown(item)])
            .assertBool(),
        ),
      )
    }
    if (index === 'findIndex') {
      return Value.foreign(predicate =>
        s.findIndex(item =>
          rt()
            .call(predicate, [Value.fromUnknown(item)])
            .assertBool(),
        ),
      )
    }
    if (index === 'flatMap') {
      return Value.foreign(callback => {
        const mapped = s.map(item => rt().call(callback, [Value.fromUnknown(item)]))
        return Value.flatten(mapped)
      })
    }
    if (index === 'flat') {
      return Value.foreign(() => Value.flatten(s))
    }
    if (index === 'includes') {
      return Value.foreign((arg: Value) => s.some(curr => Value.fromUnknown(curr).compare(arg) === 0))
    }
    if (index === 'indexOf') {
      return Value.foreign(arg => s.findIndex(curr => Value.fromUnknown(curr).compare(arg) === 0))
    }
    if (index === 'join') {
      return Value.foreign(arg => s.join(arg.assertStr()))
    }
    if (index === 'lastIndexOf') {
      return Value.foreign(arg => {
        for (let i = s.length - 1; i >= 0; --i) {
          if (Value.fromUnknown(s[i]).compare(arg) === 0) {
            return i
          }
        }
        return -1
      })
    }
    if (index === 'length') {
      return Value.num(s.length)
    }
    if (index === 'map') {
      return Value.foreign(callback => s.map(item => rt().call(callback, [Value.fromUnknown(item)])))
    }
    if (index === 'reverse') {
      return Value.foreign(() => [...s].reverse())
    }
    if (index === 'reduce') {
      return Value.foreign((callback, initialValue) =>
        s.reduce((a, b) => rt().call(callback, [Value.fromUnknown(a), Value.fromUnknown(b)]), initialValue),
      )
    }
    if (index === 'reduceRight') {
      return Value.foreign((callback, initialValue) =>
        s.reduceRight((a, b) => rt().call(callback, [Value.fromUnknown(a), Value.fromUnknown(b)]), initialValue),
      )
    }
    if (index === 'slice') {
      return Value.foreign((start, end) => s.slice(start?.assertNum(), end?.assertNum()))
    }
    if (index === 'some') {
      return Value.foreign(predicate =>
        s.some(item =>
          rt()
            .call(predicate, [Value.fromUnknown(item)])
            .assertBool(),
        ),
      )
    }
    throw new Error(`Unrecognized array method: ${index}`)
  }
  private stringMethods(s: string, indexValue: string | Value) {
    const index = this.toStringOrNumber(indexValue)
    if (typeof index === 'number') {
      throw new Error(`Index is of type number - not supported`)
    }
    if (index === 'at') {
      return Value.foreign(n => s.at(n.assertNum()))
    }
    if (index === 'charAt') {
      return Value.foreign(n => s.charAt(n.assertNum()))
    }
    if (index === 'concat') {
      return Value.foreign(arg => s.concat(arg.assertStr()))
    }
    if (index === 'endsWith') {
      return Value.foreign(arg => s.endsWith(arg.assertStr()))
    }
    if (index === 'includes') {
      return Value.foreign(arg => s.includes(arg.assertStr()))
    }
    if (index === 'indexOf') {
      return Value.foreign(searchString => s.indexOf(searchString.assertStr()))
    }
    if (index === 'lastIndexOf') {
      return Value.foreign(searchString => s.lastIndexOf(searchString.assertStr()))
    }
    if (index === 'length') {
      return Value.num(s.length)
    }
    if (index === 'match') {
      return Value.foreign(r => s.match(r.assertStr()))
    }
    if (index === 'matchAll') {
      return Value.foreign(r => [...s.matchAll(new RegExp(r.assertStr(), 'g'))])
    }
    if (index === 'padEnd') {
      return Value.foreign((maxLength, fillString) => s.padEnd(maxLength.assertNum(), fillString?.assertStr()))
    }
    if (index === 'padStart') {
      return Value.foreign((maxLength, fillString) => s.padStart(maxLength.assertNum(), fillString?.assertStr()))
    }
    if (index === 'repeat') {
      return Value.foreign(count => s.repeat(count.assertNum()))
    }
    if (index === 'replace') {
      return Value.foreign((searchValue, replacer) => s.replace(searchValue.assertStr(), replacer.assertStr()))
    }
    if (index === 'replaceAll') {
      return Value.foreign((searchValue, replacer) => s.replaceAll(searchValue.assertStr(), replacer.assertStr()))
    }
    if (index === 'search') {
      return Value.foreign(searcher => s.search(searcher.assertStr()))
    }
    if (index === 'slice') {
      return Value.foreign((start, end) => s.slice(start?.assertNum(), end?.assertNum()))
    }
    if (index === 'split') {
      return Value.foreign(splitter => s.split(splitter.assertStr()))
    }
    if (index === 'startsWith') {
      return Value.foreign(arg => s.startsWith(arg.assertStr()))
    }
    if (index === 'substring') {
      return Value.foreign((start, end) => s.substring(start.assertNum(), end?.assertNum()))
    }
    if (index === 'toLowerCase') {
      return Value.foreign(() => s.toLowerCase())
    }
    if (index === 'toUpperCase') {
      return Value.foreign(() => s.toUpperCase())
    }
    if (index === 'trim') {
      return Value.foreign(() => s.trim())
    }
    if (index === 'trimEnd') {
      return Value.foreign(() => s.trimEnd())
    }
    if (index === 'trimStart') {
      return Value.foreign(() => s.trimStart())
    }
    throw new Error(`Unrecognized string method: ${index}`)
  }

  callForeign(args: Value[]) {
    if (this.inner.tag === 'foreign') {
      const output = this.inner.val(...args)
      return Value.fromUnknown(output)
    }

    if (
      this.inner.tag === 'bool' ||
      this.inner.tag === 'lambda' ||
      this.inner.tag === 'num' ||
      this.inner.tag === 'str' ||
      this.inner.tag === 'arr' ||
      this.inner.tag === 'obj'
    ) {
      throw new Error(`Not a foreign function: ${this.inner.tag}`)
    }

    shouldNeverHappen(this.inner)
  }

  toString() {
    return this.inner.val.toString()
  }

  toJSON() {
    if (this.inner.tag === 'lambda') {
      return { _lambda: show(this.inner.val.ast) }
    }
    if (this.inner.tag === 'foreign') {
      return { _foreign: this.inner.val.toString() }
    }

    return this.inner.val
  }

  export() {
    return JSON.parse(JSON.stringify(this))
  }

  static flatten(input: unknown[]) {
    const ret = []
    for (const curr of input) {
      const v = Value.fromUnknown(curr)
      const unwrapped = v.unwrap()
      if (Array.isArray(unwrapped)) {
        ret.push(...unwrapped)
      } else {
        ret.push(v)
      }
    }
    return ret
  }
}
