import { AstNode, Lambda, show } from './ast-node'
import { failMe } from './fail-me'
import { findArrayMethod } from './find-array-method'
import { findStringMethod } from './find-string-method'
import { Runtime } from './runtime'
import { shouldNeverHappen } from './should-never-happen'
import { switchOn } from './switch-on'
import { SymbolTable } from './symbol-table'

type LambdaEvaluator = (names: string[], ast: AstNode, table: SymbolTable) => Value

type Inner =
  | { tag: 'arr'; val: Value[] }
  | { tag: 'bool'; val: boolean }
  | { tag: 'foreign'; val: (...args: Value[]) => unknown }
  | { tag: 'lambda'; val: { ast: Lambda; table: SymbolTable } }
  | { tag: 'num'; val: number }
  | { tag: 'obj'; val: Record<string, Value> }
  | { tag: 'sink'; val: undefined }
  | { tag: 'str'; val: string }

type InferTag<Q> = Q extends { tag: infer B } ? (B extends string ? B : never) : never
type Tag = InferTag<Inner>

interface Cases<R> {
  arr: (arg: Value[], tag: Tag, v: Value) => R
  bool: (arg: boolean, tag: Tag, v: Value) => R
  foreign: (arg: (...args: Value[]) => unknown, tag: Tag, v: Value) => R
  lambda: (arg: { ast: Lambda; table: SymbolTable }, tag: Tag, v: Value) => R
  num: (arg: number, tag: Tag, v: Value) => R
  obj: (arg: Record<string, Value>, tag: Tag, v: Value) => R
  str: (arg: string, tag: Tag, v: Value) => R
}

type RawCases<R> = Cases<R> & {
  // The arguments passed to the sink() function are essentially useless as they are awlays the following:
  // `undefined, 'sink', Value.sink()`. Yet, we define them for consistency.
  sink?: (arg: undefined, tag: Tag, v: Value) => R
}

function inspectValue(u: unknown) {
  return JSON.stringify(u)
}

function badType(expected: Tag, ...moreExpected: Tag[]) {
  return (_u: unknown, _actual: Tag, v: Value) => {
    if (moreExpected.length === 0) {
      throw new Error(`value type error: expected ${expected} but found ${inspectValue(v)}`)
    }

    throw new Error(
      `value type error: expected either ${moreExpected.join(', ')} or ${expected} but found ${inspectValue(v)}`,
    )
  }
}

/**
 * Allows the caller to "see" the native value held by a Value object. The caller supplies the `cases` object
 * which maps a function for each possible Value tag. Returns the return value of the function associated with the tag
 * of `v`. It is is usally preferred to use `select()` over this function which is more of a low-level function.
 * @param v
 * @param cases
 * @returns
 */
function selectRaw<R>(v: Value, cases: RawCases<R>): R {
  const inner = v.inner
  if (inner.tag === 'arr') {
    return cases.arr(inner.val, inner.tag, v)
  }
  if (inner.tag === 'bool') {
    return cases.bool(inner.val, inner.tag, v)
  }
  if (inner.tag === 'foreign') {
    return cases.foreign(inner.val, inner.tag, v)
  }
  if (inner.tag === 'lambda') {
    return cases.lambda(inner.val, inner.tag, v)
  }
  if (inner.tag === 'num') {
    return cases.num(inner.val, inner.tag, v)
  }
  if (inner.tag === 'obj') {
    return cases.obj(inner.val, inner.tag, v)
  }
  if (inner.tag === 'sink') {
    if (cases.sink) {
      return cases.sink(inner.val, inner.tag, v)
    }
    throw new Error(`Cannot evaluate a sink value`)
  }
  if (inner.tag === 'str') {
    return cases.str(inner.val, inner.tag, v)
  }

  shouldNeverHappen(inner)
}

function select<R>(v: Value, cases: Cases<R>): Value {
  if (v.isSink()) {
    return v
  }
  return Value.from(selectRaw(v, cases))
}

export class Value {
  private constructor(readonly inner: Inner) {}

  static bool(val: boolean): Value {
    return new Value({ val, tag: 'bool' })
  }
  static num(val: number): Value {
    return new Value({ val, tag: 'num' })
  }
  static sink(): Value {
    return new Value({ val: undefined, tag: 'sink' })
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

  isSink() {
    return this.inner.tag === 'sink'
  }

  unwrap(): unknown {
    return this.inner.val
  }

  assertBool(): boolean {
    const err = badType('bool')
    return selectRaw(this, {
      arr: err,
      bool: a => a,
      foreign: err,
      lambda: err,
      num: err,
      obj: err,
      sink: err,
      str: err,
    })
  }

  assertNum(): number {
    const err = badType('num')
    return selectRaw(this, {
      arr: err,
      bool: err,
      foreign: err,
      lambda: err,
      num: a => a,
      obj: err,
      sink: err,
      str: err,
    })
  }

  assertStr(): string {
    const err = badType('str')
    return selectRaw(this, {
      arr: err,
      bool: err,
      foreign: err,
      lambda: err,
      num: err,
      obj: err,
      sink: err,
      str: a => a,
    })
  }

  assertArr(): Value[] {
    const err = badType('arr')
    return selectRaw(this, {
      arr: a => a,
      bool: err,
      foreign: err,
      lambda: err,
      num: err,
      obj: err,
      sink: err,
      str: err,
    })
  }

  assertObj(): Record<string, Value> {
    const err = badType('obj')
    return selectRaw(this, {
      arr: err,
      bool: err,
      foreign: err,
      lambda: err,
      num: err,
      obj: a => a,
      sink: err,
      str: err,
    })
  }

  assertLambda() {
    const err = badType('lambda')
    return selectRaw(this, {
      arr: err,
      bool: err,
      foreign: err,
      lambda: a => a,
      num: err,
      obj: err,
      sink: err,
      str: err,
    })
  }

  isLambda() {
    return this.inner.tag === 'lambda'
  }

  ifElse(positive: () => Value, negative: () => Value) {
    const err = badType('bool')
    return select(this, {
      arr: err,
      bool: c => (c ? positive() : negative()),
      foreign: err,
      lambda: err,
      num: err,
      obj: err,
      str: err,
    })
  }

  or(that: () => Value) {
    const err = badType('bool')
    return select(this, {
      arr: err,
      bool: lhs =>
        lhs ||
        select(that(), {
          arr: err,
          bool: rhs => rhs,
          foreign: err,
          lambda: err,
          num: err,
          obj: err,
          str: err,
        }),
      foreign: err,
      lambda: err,
      num: err,
      obj: err,
      str: err,
    })
  }

  and(that: () => Value) {
    const err = badType('bool')
    return select(this, {
      arr: err,
      bool: lhs =>
        lhs &&
        select(that(), {
          arr: err,
          bool: rhs => rhs,
          foreign: err,
          lambda: err,
          num: err,
          obj: err,
          str: err,
        }),
      foreign: err,
      lambda: err,
      num: err,
      obj: err,
      str: err,
    })
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
    const err = badType('bool')
    return select(this, {
      arr: err,
      bool: lhs => !lhs,
      foreign: err,
      lambda: err,
      num: err,
      obj: err,
      str: err,
    })
  }

  private binaryNumericOperator(a: Value, b: Value, f: (lhs: number, rhs: number) => number) {
    const err = badType('num')
    return select(a, {
      arr: err,
      bool: err,
      foreign: err,
      lambda: err,
      num: lhs =>
        select(b, {
          arr: err,
          bool: err,
          foreign: err,
          lambda: err,
          num: rhs => f(lhs, rhs),
          obj: err,
          str: err,
        }),
      obj: err,
      str: err,
    })
  }

  plus(that: Value) {
    const errNum = badType('num')
    return select(this, {
      arr: errNum,
      bool: errNum,
      foreign: errNum,
      lambda: errNum,
      num: lhs =>
        select(that, {
          arr: errNum,
          bool: errNum,
          foreign: errNum,
          lambda: errNum,
          num: rhs => lhs + rhs,
          obj: errNum,
          str: errNum,
        }),
      obj: errNum,
      str: lhs =>
        select(that, {
          arr: rhs => lhs + rhs,
          bool: rhs => lhs + rhs,
          foreign: rhs => lhs + rhs,
          lambda: rhs => lhs + rhs,
          num: rhs => lhs + rhs,
          obj: rhs => lhs + rhs,
          str: rhs => lhs + rhs,
        }),
    })
  }
  minus(that: Value) {
    return this.binaryNumericOperator(this, that, (a, b) => a - b)
  }
  times(that: Value) {
    return this.binaryNumericOperator(this, that, (a, b) => a * b)
  }
  power(that: Value) {
    return this.binaryNumericOperator(this, that, (a, b) => a ** b)
  }
  over(that: Value) {
    return this.binaryNumericOperator(this, that, (a, b) => a / b)
  }
  modulo(that: Value) {
    return this.binaryNumericOperator(this, that, (a, b) => a % b)
  }

  negate() {
    return Value.num(0).minus(this)
  }

  isToZero(comparator: '<' | '<=' | '==' | '!=' | '>=' | '>'): Value {
    const err = badType('num')
    return select(this, {
      arr: err,
      bool: err,
      foreign: err,
      lambda: err,
      num: n =>
        switchOn(comparator, {
          '<': () => Value.bool(n < 0),
          '<=': () => Value.bool(n <= 0),
          '==': () => Value.bool(n == 0),
          '!=': () => Value.bool(n !== 0),
          '>=': () => Value.bool(n >= 0),
          '>': () => Value.bool(n > 0),
        }),
      obj: err,
      str: err,
    })
  }

  isZero(): boolean {
    const err = badType('num')
    return selectRaw(this, {
      arr: err,
      bool: err,
      foreign: err,
      lambda: err,
      num: n => n === 0,
      obj: err,
      sink: err,
      str: err,
    })
  }

  compare(that: Value): Value {
    const err = (_u: unknown, t: Tag) => {
      throw new Error(`Cannot compare a value of type ${t}`)
    }

    return select(this, {
      arr: err,
      bool: lhs => {
        const rhs = that.assertBool()

        return lhs && !rhs ? 1 : !lhs && rhs ? -1 : 0
      },
      foreign: err,
      lambda: err,
      num: () => {
        const d = this.minus(that).assertNum()
        return d < 0 ? -1 : d > 0 ? 1 : 0
      },
      obj: err,
      str: a => {
        const rhs = that.assertStr()

        const d = a.localeCompare(rhs)
        return d < 0 ? -1 : d > 0 ? 1 : 0
      },
    })
  }

  static toStringOrNumber(input: string | Value): string | number {
    if (typeof input === 'string') {
      return input
    }

    const err = badType('str', 'num')
    return selectRaw<string | number>(input, {
      arr: err,
      bool: err,
      foreign: err,
      lambda: err,
      num: a => a,
      obj: err,
      sink: err,
      str: a => a,
    })
  }

  access(indexValue: string | Value, runtime?: Runtime): Value {
    const err = badType('obj', 'str', 'arr')

    return select(this, {
      arr: a => {
        if (typeof indexValue === 'string') {
          return findArrayMethod(a, indexValue, runtime)
        }

        const i: number = indexValue.assertNum()
        if (i < 0 || i > a.length) {
          throw new Error(`array index (${i}) is out of bounds (length = ${a.length})`)
        }
        return a[i]
      },
      bool: err,
      foreign: err,
      lambda: err,
      num: err,
      obj: o => o[Value.toStringOrNumber(indexValue)],
      str: s => findStringMethod(s, indexValue),
    })
  }

  call(args: Value[], evaluator: LambdaEvaluator) {
    const err = badType('lambda', 'foreign')
    return select(this, {
      arr: err,
      bool: err,
      foreign: f => from(f(...args)),
      lambda: l =>
        evaluator(
          l.ast.formalArgs.map(a => a.t.text),
          l.ast.body,
          l.table,
        ),
      num: err,
      obj: err,
      str: err,
    })
  }

  keys() {
    const err = badType('obj')
    return select(this, {
      arr: err,
      bool: err,
      foreign: err,
      lambda: err,
      num: err,
      obj: a => Object.keys(a),
      str: err,
    })
  }

  entries() {
    const err = badType('obj')
    return select(this, {
      arr: err,
      bool: err,
      foreign: err,
      lambda: err,
      num: err,
      obj: a => Object.entries(a),
      str: err,
    })
  }

  fromEntries() {
    const err = badType('arr')
    const pairs = selectRaw(this, {
      arr: a =>
        a.map(x =>
          selectRaw(x, {
            arr: pair => {
              pair.length === 2 || failMe(`each entry must be a [key, value] pair`)
              return [pair[0].assertStr(), pair[1]]
            },
            bool: err,
            foreign: err,
            lambda: err,
            num: err,
            obj: err,
            sink: err,
            str: err,
          }),
        ),
      bool: err,
      foreign: err,
      lambda: err,
      num: err,
      obj: err,
      sink: err,
      str: err,
    })
    return Value.obj(Object.fromEntries(pairs))
  }

  toString() {
    return this.inner.val?.toString() ?? 'sink'
  }

  toJSON(): unknown {
    return selectRaw<unknown>(this, {
      arr: a => a,
      bool: a => a,
      foreign: a => a.toString(),
      lambda: a => show(a.ast),
      num: a => a,
      obj: a => a,
      sink: () => null,
      str: a => a,
    })
  }

  export() {
    return JSON.parse(JSON.stringify(this))
  }

  static from(u: unknown) {
    return from(u)
  }
}

function from(u: unknown): Value {
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
    return Value.arr(u.map(curr => from(curr)))
  }

  if (typeof u === 'undefined') {
    return Value.sink()
  }

  if (u && typeof u === 'object') {
    Value.obj(Object.fromEntries(Object.entries(u).map(([k, v]) => [k, from(v)])))
  }

  throw new Error(`cannot convert ${JSON.stringify(u)} to Value`)
}
