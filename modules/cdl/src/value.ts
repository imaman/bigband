export class Value {
  constructor(private readonly nat: number) {}

  not() {
    return new Value(Number(!this.nat))
  }

  plus(that: Value) {
    return new Value(this.nat + that.nat)
  }
  minus(that: Value) {
    return new Value(this.nat - that.nat)
  }
  times(that: Value) {
    return new Value(this.nat * that.nat)
  }
  over(that: Value) {
    return new Value(this.nat / that.nat)
  }

  compare(that: Value) {
    const d = this.minus(that).nat
    if (d < 0) {
      return new Value(-1)
    }

    if (d > 0) {
      return new Value(1)
    }

    return new Value(0)
  }

  export() {
    return this.nat
  }
}
