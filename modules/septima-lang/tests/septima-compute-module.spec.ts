import { Septima } from '../src/septima'
import { shouldNeverHappen } from '../src/should-never-happen'

/**
 * Runs a Septima program for testing purposes. Throws an error If the program evaluated to `sink`.
 */
async function run(mainModule: string, inputs: Record<string, string>) {
  const septima = new Septima()
  const res = septima.computeModule(mainModule, (m: string) => inputs[m], {})
  if (res.tag === 'ok') {
    return res.value
  }

  if (res.tag === 'sink') {
    throw new Error(res.message)
  }

  shouldNeverHappen(res)
}

describe('septima-compute-module', () => {
  test('fetches the content of the module to compute from the given callback function', async () => {
    expect(await run('a', { a: `3+8` })).toEqual(11)
  })
  test('can use exported definitions from another module', async () => {
    expect(await run('a', { a: `import * as b from 'b'; 3+b.eight`, b: `let eight = 8; {}` })).toEqual(11)
  })
  test('errors if the path to input from is not a string literal', async () => {
    await expect(run('a', { a: `import * as foo from 500` })).rejects.toThrowError(
      'Expected a string literal at (1:22..24) 500',
    )
  })
})
