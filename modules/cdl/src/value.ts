type Inner =
  | {
      tag: 'num'
      val: number
    }
  | { tag: 'bool'; val: boolean }

export class Value {
  private readonly inner: Inner
  constructor(nat: number | boolean) {
    if (typeof nat === 'number') {
      this.inner = { tag: 'num', val: nat }
    } else if (typeof nat === 'boolean') {
      this.inner = { tag: 'bool', val: nat }
    } else {
      throw new Error(`Unsupported native value: ${nat}`)
    }
  }

  assertBool(): boolean {
    if (this.inner.tag === 'bool') {
      return this.inner.val
    }

    throw new Error(`Not a boolean: ${JSON.stringify(this.inner.val)}`)
  }

  or(that: Value) {
    if (this.inner.tag === 'bool' && that.inner.tag === 'bool') {
      return new Value(this.inner.val || that.inner.val)
    }

    this.requireType('num')
    that.requireType('num')
    throw new Error(`Inconsistent types: ${this.inner.tag}, ${that.inner.tag}`)
  }

  and(that: Value) {
    if (this.inner.tag === 'bool' && that.inner.tag === 'bool') {
      return new Value(this.inner.val && that.inner.val)
    }

    this.requireType('num')
    that.requireType('num')
    throw new Error(`Inconsistent types: ${this.inner.tag}, ${that.inner.tag}`)
  }

  equalsTo(that: Value) {
    if (this.inner.tag !== that.inner.tag) {
      return new Value(false)
    }

    const b = JSON.stringify(this.inner.val) === JSON.stringify(that.inner.val)
    return new Value(b)
  }

  not() {
    if (this.inner.tag === 'bool') {
      return new Value(!this.inner.val)
    } else {
      throw new Error(`Cannot negate a value of type ${this.inner.tag}: ${this.inner.val}`)
    }
  }

  requireType(t: string) {
    if (this.inner.tag !== t) {
      throw new Error(`value type error: expected ${t} but found: ${this.inner.val}`)
    }
  }

  plus(that: Value) {
    if (this.inner.tag === 'num' && that.inner.tag === 'num') {
      return new Value(this.inner.val + that.inner.val)
    }

    this.requireType('num')
    that.requireType('num')
    throw new Error(`Inconsistent types: ${this.inner.tag}, ${that.inner.tag}`)
  }
  minus(that: Value) {
    if (this.inner.tag === 'num' && that.inner.tag === 'num') {
      return new Value(this.inner.val - that.inner.val)
    }
    this.requireType('num')
    that.requireType('num')
    throw new Error(`Inconsistent types: ${this.inner.tag}, ${that.inner.tag}`)
  }
  times(that: Value) {
    if (this.inner.tag === 'num' && that.inner.tag === 'num') {
      return new Value(this.inner.val * that.inner.val)
    }
    this.requireType('num')
    that.requireType('num')
    throw new Error(`Inconsistent types: ${this.inner.tag}, ${that.inner.tag}`)
  }
  power(that: Value) {
    if (this.inner.tag === 'num' && that.inner.tag === 'num') {
      return new Value(this.inner.val ** that.inner.val)
    }
    this.requireType('num')
    that.requireType('num')
    throw new Error(`Inconsistent types: ${this.inner.tag}, ${that.inner.tag}`)
  }
  over(that: Value) {
    if (this.inner.tag === 'num' && that.inner.tag === 'num') {
      return new Value(this.inner.val / that.inner.val)
    }
    this.requireType('num')
    that.requireType('num')
    throw new Error(`Inconsistent types: ${this.inner.tag}, ${that.inner.tag}`)
  }
  modulo(that: Value) {
    if (this.inner.tag === 'num' && that.inner.tag === 'num') {
      return new Value(this.inner.val % that.inner.val)
    }
    this.requireType('num')
    that.requireType('num')
    throw new Error(`Inconsistent types: ${this.inner.tag}, ${that.inner.tag}`)
  }

  negate() {
    if (this.inner.tag === 'num') {
      return new Value(-this.inner.val)
    }
    this.requireType('num')
    throw new Error(`Inconsistent types: ${this.inner.tag}`)
  }

  compare(that: Value) {
    const d = this.minus(that)?.inner.val
    if (d < 0) {
      return -1
    }

    if (d > 0) {
      return 1
    }

    return 0
  }

  export() {
    return this.inner.val
  }
}
