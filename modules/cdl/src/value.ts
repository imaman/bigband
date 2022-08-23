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

  export() {
    return this.nat
  }
}
