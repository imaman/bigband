/**
 * Why do we need our own object?
 * (1) JS's native arrays' toString() format is not JSON.
 * (2) They have mutating methods (e.g., sort(), reverse()) which are a no-go in a purely functional language such as
 * Septima. Our design decision is to go opt-in than to opt-out.
 */
export class SeptimaArray implements Iterable<unknown> {
  readonly values: unknown[] = []

  get length() {
    return this.values.length
  }

  constructor(values: unknown[], spreads: number[] = []) {
    let j = 0
    for (let i = 0; i < values.length; ++i) {
      const v = values[i]
      const isSpread = j < spreads.length && spreads[j] === i
      if (isSpread) {
        ++j
        if (v === undefined) {
          continue
        }
        if (v instanceof SeptimaArray) {
          this.values.push(...v)
        } else {
          throw new Error(`value type error: expected arr but found ${JSON.stringify(v)}`)
        }
      } else {
        this.values.push(v)
      }
    }
  }

  at(index: string | number) {
    if (typeof index === 'string') {
      throw new Error(`index into an array must be a number (got: ${index})`)
    }

    return this.values.at(index)
  }

  flatMap(callbackfn: (value: unknown, index: number, array: unknown[]) => unknown) {
    return this.values.flatMap(callbackfn)
  }
  reduce(
    callbackfn: (previousValue: unknown, currentValue: unknown, currentIndex: number, array: unknown[]) => unknown,
    initialValue: unknown,
  ) {
    return this.values.reduce(callbackfn, initialValue)
  }
  reduceRight(
    callbackfn: (previousValue: unknown, currentValue: unknown, currentIndex: number, array: unknown[]) => unknown,
    initialValue: unknown,
  ) {
    return this.values.reduceRight(callbackfn, initialValue)
  }

  *[Symbol.iterator](): Iterator<unknown> {
    yield* this.values
  }

  toJSON() {
    return this.values
  }

  toString() {
    return JSON.stringify(this.toJSON())
  }

  static getMethod(that: SeptimaArray, selector: string, _caller: (func: unknown, sArgs: unknown[]) => unknown) {
    if (selector === 'join') {
      return (x?: string) => that.values.join(x)
    }

    if (selector === 'map') {
      return (callback: unknown) =>
        new SeptimaArray(that.values.map((item, index) => _caller(callback, [item, index, that])))
    }

    if (selector === 'every') {
      return (predicate: unknown) => that.values.every((item, index) => _caller(predicate, [item, index, that]))
    }

    if (selector === 'some') {
      return (predicate: unknown) => that.values.some((item, index) => _caller(predicate, [item, index, that]))
    }

    if (selector === 'filter') {
      return (predicate: unknown) =>
        new SeptimaArray(that.values.filter((item, index) => _caller(predicate, [item, index, that])))
    }

    if (selector === 'find') {
      return (predicate: unknown) => that.values.find((item, index) => _caller(predicate, [item, index, that]))
    }

    if (selector === 'findIndex') {
      return (predicate: unknown) => that.values.findIndex((item, index) => _caller(predicate, [item, index, that]))
    }

    if (selector === 'sort') {
      return (comparator?: unknown) =>
        new SeptimaArray(
          [...that.values].sort(
            !comparator
              ? undefined
              : (lhs: unknown, rhs: unknown) => {
                  const ret = _caller(comparator, [lhs, rhs])
                  if (typeof ret === 'number') {
                    return ret
                  }

                  throw new Error(`not a number: ${JSON.stringify(ret)}`)
                },
          ),
        )
    }

    if (selector === 'concat') {
      return (...args: unknown[]) => {
        const arr: unknown[] = [...that.values]
        for (const a of args) {
          if (a instanceof SeptimaArray) {
            arr.push(...a.values)
          } else if (Array.isArray(a)) {
            arr.push(...a)
          } else {
            arr.push(a)
          }
        }
        return new SeptimaArray(arr)
      }
    }

    return undefined
  }
}
