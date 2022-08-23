type Inner =
  | {
      tag: 'num'
      val: number
    }
  | { tag: 'bool'; val: boolean }

export function shouldNeverHappen(n: never): never {
  // This following line never gets executed. It is here just to make the compiler happy.
  throw new Error(`This should never happen ${n}`)
}

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
  over(that: Value) {
    if (this.inner.tag === 'num' && that.inner.tag === 'num') {
      return new Value(this.inner.val / that.inner.val)
    }
    this.requireType('num')
    that.requireType('num')
    throw new Error(`Inconsistent types: ${this.inner.tag}, ${that.inner.tag}`)
  }

  negate() {
    if (this.inner.tag === 'bool') {
      return new Value(!this.inner.val)
    }
    this.requireType('bool')
    throw new Error(`Inconsistent types: ${this.inner.tag}`)
  }

  compare(that: Value) {
    const d = this.minus(that)?.inner.val
    if (d < 0) {
      return new Value(-1)
    }

    if (d > 0) {
      return new Value(1)
    }

    return new Value(0)
  }

  export() {
    return this.inner.val
  }
}
