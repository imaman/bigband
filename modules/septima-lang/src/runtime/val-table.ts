import { failMe } from '../fail-me.js'

const placeholder = {}

export class ValTable {
  private constructor(
    private readonly earlier: ValTable | undefined,
    private readonly isExported: boolean,
    private readonly name?: string,
    private val?: unknown,
  ) {}

  static empty() {
    return new ValTable(undefined, false)
  }

  add(name: string, val: unknown) {
    return new ValTable(this, false, name, val)
  }

  prepare(name: string, isExported: boolean) {
    return new ValTable(this, isExported, name, placeholder)
  }

  resolve(name: string, val: unknown) {
    for (let curr: ValTable | undefined = this; curr; curr = curr.earlier) {
      if (curr.name === name && curr.val === placeholder) {
        curr.val = val
        return this
      }
    }

    throw new Error(`could not resolve: ${name}`)
  }

  exitScope(n: number) {
    let ret: ValTable = this
    while (n > 0) {
      --n
      const e = ret.earlier
      if (e === undefined) {
        throw new Error(`unbalanced val table`)
      }
      ret = e
    }

    return ret
  }

  lookup(name: string): unknown {
    if (this.name === name) {
      if (this.val === placeholder) {
        throw new Error(`Unresolved definition: ${name}`)
      }

      return this.val
    }

    const ret = this.earlier?.lookup(name)
    if (ret === undefined) {
      throw new Error(`Symbol ${name} was not found`)
    }
    return ret
  }

  /**
   * Return all exported definitions from the last n defintions
   * @param n
   */
  collectExported(n: number) {
    const ret: [string, unknown][] = []

    for (let curr: ValTable | undefined = this; curr && n > 0; curr = curr.earlier) {
      --n
      if (curr.isExported) {
        if (curr.val === placeholder) {
          throw new Error(`when exporting no placeholders should be encountered`)
        }
        ret.push([curr.name ?? failMe(`no name for a definition`), curr.val])
      }
    }

    return ret
  }

  toJSON() {
    const ret: unknown[] = []
    for (let curr: ValTable | undefined = this; curr; curr = curr.earlier) {
      if (curr.name) {
        ret.push([curr.name, curr.val])
      }
    }
    return ret
  }
}
