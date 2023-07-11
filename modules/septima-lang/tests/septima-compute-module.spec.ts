import { Septima } from '../src/septima'
import { shouldNeverHappen } from '../src/should-never-happen'

/**
 * Runs a Septima program for testing purposes. Throws an error If the program evaluated to `sink`.
 */
function run(mainFileName: string, inputs: Record<string, string>, args: Record<string, unknown> = {}) {
  const septima = new Septima('')
  const res = septima.computeModule(mainFileName, args, (m: string) => {
    const ret = inputs[m]
    if (ret) {
      return ret
    }

    throw new Error(`cannot read content of <<${m}>>`)
  })
  if (res.tag === 'ok') {
    return res.value
  }

  if (res.tag === 'sink') {
    throw new Error(res.message)
  }

  shouldNeverHappen(res)
}

describe('septima-compute-module', () => {
  test('fetches the content of the module to compute from the given callback function', () => {
    expect(run('a', { a: `3+8` })).toEqual(11)
  })
  test('can use exported definitions from another module', () => {
    expect(run('a', { a: `import * as b from './b'; 3+b.eight`, b: `export let eight = 8; {}` })).toEqual(11)
  })
  test('errors if the imported definition is not qualified with "export"', () => {
    expect(() => run('a', { a: `import * as b from 'b'; 3+b.eight`, b: `let eight = 8; {}` })).toThrowError(
      `Evaluated to sink: at (1:27..33) b.eight`,
    )
  })
  test('errors if the path to input from is not a string literal', () => {
    expect(() => run('a', { a: `import * as foo from 500` })).toThrowError(
      'Expected a string literal at (1:22..24) 500',
    )
  })
  test('support the passing of args into the runtime', () => {
    expect(run('a', { a: `args.x * args.y` }, { x: 5, y: 9 })).toEqual(45)
  })
  test('the args object is available only at the main module', () => {
    expect(() =>
      run('a', { a: `import * as b from 'b'; args.x + '_' + b.foo`, b: `let foo = args.x ?? 'N/A'; {}` }, { x: 'Red' }),
    ).toThrowError(/Symbol args was not found when evaluating/)
  })
})
