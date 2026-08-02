export class ForeignFunction {
  constructor(private readonly that: unknown, private readonly f: (...args: unknown[]) => unknown) {}

  call(args: unknown[]) {
    return this.f.apply(this.that, args)
  }
}
