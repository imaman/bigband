export class MachineCrashedError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'MachineCrashed'
    Object.setPrototypeOf(this, MachineCrashedError.prototype)
  }
}
