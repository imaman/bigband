import { AnyFn } from './foreign-function.js'

/**
 * Similar to ForeignFunction it allows a JS function to be invoke from septima. However, unlike ForeignFunction it is
 * designed for running a JS function that is septima-aware, such as the function of the septima standard library. As
 * such, the inputs/outputs are passed to it unchanged (no marshaling).
 */
export class EscapeFunction {
  constructor(readonly f: AnyFn) {}

  toJSON() {
    return { cls: EscapeFunction.name, name: this.f.name }
  }
}
