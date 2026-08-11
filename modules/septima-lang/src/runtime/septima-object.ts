/**
 * Why do we need our own object? JS's native objects' toString() format is not JSON (the dreaded "[object Object]".
 */
export class SeptimaObject {
  constructor(entries: (SeptimaObject | [string, unknown])[]) {
    const arr: [string, unknown][] = []
    for (const at of entries) {
      if (at instanceof SeptimaObject) {
        arr.push(...SeptimaObject.entries(at))
      } else {
        arr.push(at)
      }
    }
    const filtered = arr.filter(([_, v]) => v !== undefined)
    Object.assign(this, Object.fromEntries(filtered))
  }
  toJSON() {
    return { ...this }
  }
  toString() {
    return JSON.stringify(this)
  }
  static at(o: SeptimaObject, index: string | number): unknown {
    if (typeof index === 'number') {
      throw new Error(`index into an object must be a string (got: ${index})`)
    }
    return Object.hasOwn(o, index) ? (o as unknown as Record<string, unknown>)[index] : undefined
  }
  static entries(o: SeptimaObject): [string, unknown][] {
    return Object.entries(o)
  }
}
