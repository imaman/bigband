import { Value } from './value'

export type CallEvaluator = (callable: Value, args: Value[]) => Value
/**
 * return an implementation for array methods. The following Array methods were not implemented
 * as it is hard to find an intuitive immutable API due to their mutable nature:
 *  - copyWithin
 *  - fill
 *  - forEach
 *  - keys
 *  - pop
 *  - push
 *  - shift
 *  - unshift
 */
export function findArrayMethod(arr: unknown[], index: string, callEvaluator: CallEvaluator) {
  const adjustedCallback =
    (callback: Value) =>
    (...args: unknown[]) =>
      callEvaluator(
        callback,
        args.map(x => Value.from(x)),
      )

  const adjustedPredicate =
    (predicate: Value) =>
    (...args: unknown[]) =>
      callEvaluator(
        predicate,
        args.map(x => Value.from(x)),
      ).assertBool()

  if (index === 'at') {
    return Value.foreign(n => arr.at(n.assertNum()))
  }
  if (index === 'concat') {
    return Value.foreign(arg => arr.concat(arg.assertArr()))
  }
  if (index === 'entries') {
    return Value.foreign(() => [...arr.entries()])
  }
  if (index === 'every') {
    return Value.foreign(predicate => arr.every(adjustedPredicate(predicate)))
  }
  if (index === 'filter') {
    return Value.foreign(predicate => arr.filter(adjustedPredicate(predicate)))
  }
  if (index === 'find') {
    return Value.foreign(predicate => arr.find(adjustedPredicate(predicate)))
  }
  if (index === 'findIndex') {
    return Value.foreign(predicate => arr.findIndex(adjustedPredicate(predicate)))
  }
  if (index === 'flatMap') {
    return Value.foreign(callback => flatten(arr.map(adjustedCallback(callback))))
  }
  if (index === 'flat') {
    return Value.foreign(() => flatten(arr))
  }
  if (index === 'includes') {
    return Value.foreign((arg: Value) => arr.some(curr => Value.from(curr).equalsTo(arg).isTrue()))
  }
  if (index === 'indexOf') {
    return Value.foreign(arg => arr.findIndex(curr => Value.from(curr).equalsTo(arg).isTrue()))
  }
  if (index === 'join') {
    return Value.foreign(arg => arr.join(arg.assertStr()))
  }
  if (index === 'lastIndexOf') {
    return Value.foreign(arg => {
      for (let i = arr.length - 1; i >= 0; --i) {
        if (Value.from(arr[i]).equalsTo(arg).isTrue()) {
          return i
        }
      }
      return -1
    })
  }
  if (index === 'length') {
    return Value.num(arr.length)
  }
  if (index === 'map') {
    return Value.foreign(callback => arr.map(adjustedCallback(callback)))
  }
  if (index === 'reverse') {
    return Value.foreign(() => [...arr].reverse())
  }
  if (index === 'reduce') {
    return Value.foreign((callback, initialValue) => arr.reduce(adjustedCallback(callback), initialValue))
  }
  if (index === 'reduceRight') {
    return Value.foreign((callback, initialValue) => arr.reduceRight(adjustedCallback(callback), initialValue))
  }
  if (index === 'slice') {
    return Value.foreign((start, end) => arr.slice(start?.assertNum(), end?.assertNum()))
  }
  if (index === 'some') {
    return Value.foreign(predicate => arr.some(adjustedPredicate(predicate)))
  }
  throw new Error(`Unrecognized array method: ${index}`)
}

function flatten(input: unknown[]) {
  const ret = []
  for (const curr of input) {
    const v = Value.from(curr)
    const unwrapped = v.unwrap()
    if (Array.isArray(unwrapped)) {
      ret.push(...unwrapped)
    } else {
      ret.push(v)
    }
  }
  return ret
}
