import { AstNode, Lambda, show, UnitId } from './ast-node'
import { failMe } from './fail-me'
import { CallEvaluator, findArrayMethod } from './find-array-method'
import { findStringMethod } from './find-string-method'
import { Span } from './location'
import { shouldNeverHappen } from './should-never-happen'
import * as Stack from './stack'
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
  | { tag: 'sink'; val: undefined; span?: Span; trace?: Stack.T; symbols?: SymbolTable; unitId?: UnitId }
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

const badType =
  (expected: Tag, ...moreExpected: Tag[]) =>
  (_u: unknown, _actual: Tag, v: Value) => {
    if (moreExpected.length === 0) {
      throw new Error(`value type error: expected ${expected} but found ${inspectValue(v)}`)
    }

    throw new Error(
      `value type error: expected either ${moreExpected.join(', ')} or ${expected} but found ${inspectValue(v)}`,
    )
  }

/**
 * Allows the caller to "see" the native value held by a Value object. The caller supplies the `cases` object
 * which maps a function for each possible Value tag. Returns the return value of the function associated with the tag
 * of `v`.
 *
 * In the code we should perfer to use `select()` over this one as it provides better handling of `sink` values.
 *
 * @param v the Value object to look into
 * @param cases an object which maps Tag values to functions
 * @returns the return value of the function mapped to the tag of `v`
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
    // For sink we provide a default behavior of throwing an exception. Yet, the caller is encouraged to explicitly
    // provide a `sink` case as there is broader context at the caller's side which makes it possible to provide more
    // meaningful error messages.
    if (!cases.sink) {
      throw new Error(`Cannot evaluate a sink value`)
    }
    return cases.sink(inner.val, inner.tag, v)
  }
  if (inner.tag === 'str') {
    return cases.str(inner.val, inner.tag, v)
  }

  shouldNeverHappen(inner)
}

/**
 * Allows the caller to "see" the native value held by a Value object. The caller supplies the `cases` object
 * which maps a function for each possible Value tag. Returns the return value of the function associated with the tag
 * of `v`.
 *
 * if `select()` is invoked on sink value (i.e., `Value.sink()`) it returns the sink value itself. This realizes the
 * behavior that an expression involving a sink value evaluates to sink.
 *
 * @param v the Value object to look into
 * @param cases an object which maps Tag values to functions
 * @returns the return value of the function mapped to the tag of `v`
 */
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
  /**
   * Returns a Value which is essentially a "sink": (almost) every computation involving a sink evaluates to sink. A few
   * quick examples: `5+sink`, `sink.x`, `sink()`, `Object.keys(sink)`, `if (sink) 4 else 8` all evaluate to `sink`. The
   * raitonale is that once an expression evaluates to `sink` all expressions depending on it also evaluate to `sink`.
   *
   * There are however a few (intentional) exemptions:
   * (i) a sink can be passed as an actual parameter in a function call. Hence `(fun (x,y) y)(sink, 5)` will evaluate
   *    to `5`.
   * (ii) a sink can be compared with itself.
   * (iii) in `if()` expressions, only one of the branches is evlauated (based on the condition's value). As a result,
   *    evluation of a sink-producing branch can be skipping. Specifically, `if (true) 5 else sink` evaluates to `5`.
   * (iv) in `||` and `&&` expressions, the evaluation of the right hand side can be skipped. Specifically,
   *    `true || sink` evaluates to `true` and `false && sink` evaluates to `false`.
   */
  static sink(span?: Span, trace?: Stack.T, symbols?: SymbolTable, unitId?: UnitId): Value {
    return new Value({
      val: undefined,
      tag: 'sink',
      ...(span ? { span } : {}),
      ...(trace ? { trace } : {}),
      ...(symbols ? { symbols } : {}),
      ...(unitId ? { unitId } : {}),
    })
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

  bindToSpan(span: Span, unitId?: UnitId) {
    const inner = this.inner
    if (inner.tag !== 'sink') {
      throw new Error(`Not supported on type ${this.inner.tag}`)
    }

    return Value.sink(span, inner.trace, inner.symbols, unitId)
  }

  trace() {
    const inner = this.inner
    if (inner.tag !== 'sink') {
      return undefined
    }

    const ret: AstNode[] = []
    for (let curr = inner.trace; curr !== undefined; curr = curr?.next) {
      ret.push(curr.ast)
    }
    return ret.length === 0 ? undefined : ret
  }

  symbols() {
    const inner = this.inner
    if (inner.tag !== 'sink') {
      return undefined
    }

    return inner.symbols
  }

  where() {
    const inner = this.inner
    if (inner.tag !== 'sink') {
      return undefined
    }

    if (inner.span && inner.unitId) {
      return { span: inner.span, unitId: inner.unitId }
    }
    return undefined
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
  unsink(that: () => Value) {
    if (this.isSink()) {
      return that()
    }

    return this
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

  isTrue(): boolean {
    const err = badType('bool')
    return selectRaw(this, {
      arr: err,
      bool: b => b,
      foreign: err,
      lambda: err,
      num: err,
      obj: err,
      sink: err,
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

  /**
   * Determines the order beteween `this` and the given argument (`that`). The behavior of this method is dictated by
   * the following principles:
   *
   * (i) if a < b then b >= a (i.e., it provides a consistent answer regardless of the whether `this` is `a`
   *    and `that` is `b` or vice versa)
   * (ii) ordering two values of different type result in runtime error.
   * (iii) orderingg a value with itself evaluates to `0`
   *
   * Principles (i) and (iii) realizes the intuitive behavior of comparisons. (ii) realizes the idea that
   * "one cannot compare oranges and apples". This is essentially a design decision. We could have gone with defining
   * some order between types (the tag of a Value object), but we feel that a saner approach is to say "we do not know
   * how to sort an array containing numbers and booleans".
   *
   * IMPORTANT: these principles overpower other principles. In parituclar, the principles that "an expression with
   * sink evaluates to sink" is trumped by comparison principle (ii)
   *
   * @param that
   * @returns
   */
  order(that: Value): Value {
    const err = (_u: unknown, t: Tag) => {
      throw new Error(`Cannot compare a value of type ${t}`)
    }

    if (this.inner.tag !== that.inner.tag) {
      throw new Error(`Cannot compare a ${this.inner.tag} value with a value of another type (${that.inner.tag})`)
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

  access(indexValue: string | Value, callEvaluator: CallEvaluator): Value {
    const err = badType('obj', 'str', 'arr')

    return select(this, {
      arr: a => {
        if (typeof indexValue === 'string') {
          return findArrayMethod(a, indexValue, callEvaluator)
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
    return select(this, {
      arr: a =>
        Object.fromEntries(
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
        ),
      bool: err,
      foreign: err,
      lambda: err,
      num: err,
      obj: err,
      str: err,
    })
  }

  toString() {
    return this.inner.val?.toString() ?? 'sink'
  }

  toJSON(): unknown {
    const copy: (v: Value) => unknown = (v: Value) => {
      return selectRaw<unknown>(v, {
        arr: a => a.map(x => copy(x)),
        bool: a => a,
        foreign: a => a.toString(),
        lambda: a => show(a.ast),
        num: a => a,
        obj: a => Object.fromEntries(Object.entries(a).map(([k, x]) => [k, copy(x)])),
        sink: () => undefined,
        str: a => a,
      })
    }

    return copy(this)
  }

  export(): unknown {
    return this.toJSON()
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
    return Value.obj(Object.fromEntries(Object.entries(u).map(([k, v]) => [k, from(v)])))
  }

  throw new Error(`cannot convert ${JSON.stringify(u)} to Value`)
}
