import { CodeFile } from './code-emitter.js'

export class SeptimaVirtualMachine {
  constructor(private readonly cf: CodeFile) {}

  private opstack: unknown[] = []

  private push(u: unknown) {
    this.opstack.push(u)
  }

  private pop() {
    return this.opstack.pop()
  }

  run() {
    for (const at of this.cf.codes) {
      const [a, b] = Array.isArray(at) ? at : [at]

      if (a === 'const' && typeof b === 'string') {
        this.push(JSON.parse(b))
      } else if (a === 'binop**') {
        const rhs = Number(this.pop())
        const lhs = Number(this.pop())
        this.push(lhs ** rhs)
      } else if (a === 'binop*') {
        const rhs = Number(this.pop())
        const lhs = Number(this.pop())
        this.push(lhs * rhs)
      } else if (a === 'binop+') {
        const rhs = Number(this.pop())
        const lhs = Number(this.pop())
        this.push(lhs + rhs)
      } else if (a === 'binop-') {
        const rhs = Number(this.pop())
        const lhs = Number(this.pop())
        this.push(lhs - rhs)
      } else if (a === 'binop/') {
        const rhs = Number(this.pop())
        const lhs = Number(this.pop())
        this.push(lhs / rhs)
      } else if (a === 'binop%') {
        const rhs = Number(this.pop())
        const lhs = Number(this.pop())
        this.push(lhs % rhs)
      } else if (a === 'unop-') {
        const v = Number(this.pop())
        this.push(-v)
      } else if (a === 'unop!') {
        const v = this.pop()
        if (typeof v === 'boolean') {
          this.push(!v)
        } else {
          throw new Error(`value type error: expected bool but found ${JSON.stringify(v)}`)
        }
      } else {
        throw new Error(`not yet impl: ${JSON.stringify(at)}`)
      }
    }

    const ret = this.pop() ?? undefined
    if (ret === undefined) {
      throw new Error(`nothing to return`)
    }

    return ret
  }
}
