import { Executable, Septima } from '../src/septima'
import { shouldNeverHappen } from '../src/should-never-happen'

function runExecutable(executable: Executable, args: Record<string, unknown>) {
  const res = executable.execute(args)
  if (res.tag === 'ok') {
    return res.value
  }

  if (res.tag === 'sink') {
    throw new Error(res.message)
  }

  shouldNeverHappen(res)
}
/**
 * Runs a Septima program for testing purposes. Throws an error If the program evaluated to `sink`.
 */
function run(
  mainFileName: string,
  inputs: Record<string, string>,
  args: Record<string, unknown> = {},
  sourceRoot = '',
) {
  const septima = new Septima(sourceRoot)
  return runExecutable(
    septima.compileSync(mainFileName, (m: string) => inputs[m]),
    args,
  )
}

async function runPromise(
  mainFileName: string,
  inputs: Record<string, string>,
  args: Record<string, unknown> = {},
  sourceRoot = '',
) {
  const septima = new Septima(sourceRoot)
  const executable = await septima.compile(mainFileName, (m: string) => Promise.resolve(inputs[m]))
  return runExecutable(executable, args)
}

describe('septima-compile', () => {
  test('fetches the content of the module to compute from the given callback function', () => {
    expect(run('a', { a: `3+8` })).toEqual(11)
  })
  test('can use exported definitions from another module', () => {
    expect(run('a', { a: `import * as b from 'b'; 3+b.eight`, b: `export let eight = 8; {}` })).toEqual(11)
  })
  test('errors if the imported definition is not qualified with "export"', () => {
    expect(() => run('a', { a: `import * as b from 'b'; 3+b.eight`, b: `let eight = 8; {}` })).toThrowError(
      'at (a:1:25..33) 3+b.eight',
    )
  })
  test('errors if the path to input from is not a string literal', () => {
    expect(() => run('a', { a: `import * as foo from 500` })).toThrowError(
      'Expected a string literal at (a:1:22..24) 500',
    )
  })
  test('allows specifying a custom source root', () => {
    expect(
      run('a', { 'p/q/r/a': `import * as b from 'b'; 3+b.eight`, 'p/q/r/b': `export let eight = 8; {}` }, {}, 'p/q/r'),
    ).toEqual(11)
  })
  test('allows the main file to be specified via an absolute path if it points to a file under source root', () => {
    expect(run('/p/q/r/a', { '/p/q/r/a': `"apollo 11"` }, {}, '/p/q/r')).toEqual('apollo 11')
    expect(() => run('/p/q/x', { '/p/q/x': `"apollo 11"` }, {}, '/p/q/r')).toThrowError(
      'resolved path (/p/q/x) is pointing outside of source root (/p/q/r)',
    )
  })
  test('allows importing from the same directory via a relative path', () => {
    expect(run('s', { s: `import * as t from "./t"; t.ten+5`, t: `export let ten = 10` }, {})).toEqual(15)
  })
  test('allows importing from sub directories', () => {
    expect(run('q', { q: `import * as t from "./r/s/t"; t.ten+5`, 'r/s/t': `export let ten = 10` }, {})).toEqual(15)
    expect(
      run('q', {
        q: `import * as t from './r/s/t'; t.ten * t.ten`,
        'r/s/t': `import * as f from './d/e/f'; export let ten = f.five*2`,
        'r/s/d/e/f': `export let five = 5`,
      }),
    ).toEqual(100)
  })
  test('allows a relative path to climb up (as long as it is below source root)', () => {
    expect(
      run(
        'p/q/r/s',
        { 'd1/d2/p/q/r/s': `import * as t from "../../t"; t.ten+5`, 'd1/d2/p/t': `export let ten = 10` },
        {},
        'd1/d2',
      ),
    ).toEqual(15)
  })
  test('errors if a file tries to import a(nother) file which is outside of the source root tree', () => {
    expect(() => run('q', { 'd1/d2/q': `import * as r from "../r"; 5` }, {}, 'd1/d2')).toThrowError(
      `resolved path (d1/r) is pointing outside of source root (d1/d2)`,
    )
  })
  test('errors if the main file is outside of the source root tree', () => {
    expect(() => run('../q', { 'd1/q': `300` }, {}, 'd1/d2')).toThrowError(
      `resolved path (d1/q) is pointing outside of source root (d1/d2)`,
    )
  })
  test('disallow absolute paths for specifying an imported file', () => {
    expect(() => run('q', { 'd1/d2/q': 'import * as r from "/d1/d2/r"; 300' }, {}, 'd1/d2')).toThrowError(
      `An absolute path is not allowed in import (got: /d1/d2/r)`,
    )
    expect(() => run('q', { 'd1/d2/q': 'import * as r from "/r"; 300' }, {}, 'd1/d2')).toThrowError(
      `An absolute path is not allowed in import (got: /r)`,
    )
    expect(() => run('q', { q: 'import * as r from "/r"; 300' }, {}, '')).toThrowError(
      `An absolute path is not allowed in import (got: /r)`,
    )
    expect(() => run('q', { q: 'import * as r from "./r"; r.foo', r: 'import * as s from "/s"' }, {}, '')).toThrowError(
      `An absolute path is not allowed in import (got: /s)`,
    )
  })
  test('provides a clear error message when a file is not found', () => {
    expect(() => run('a', { a: `import * as b from 'b'; 3+b.eight` })).toThrowError(`Cannot find file 'b'`)
  })
  test('the file-not-found error message includes the resolved path (i.e., with the source root)', () => {
    expect(() => run('a', { 'p/q/r/a': `import * as b from 's/b'; 3+b.eight` }, {}, 'p/q/r')).toThrowError(
      `Cannot find file 'p/q/r/s/b'`,
    )
  })
  test.todo(`file not found error should include an import stack (a-la node's "require stack")`)
  test('support the passing of args into the runtime', () => {
    expect(run('a', { a: `args.x * args.y` }, { x: 5, y: 9 })).toEqual(45)
  })
  test('the args object is available only at the main module', () => {
    expect(() =>
      run('a', { a: `import * as b from 'b'; args.x + '_' + b.foo`, b: `let foo = args.x; {}` }, { x: 'Red' }),
    ).toThrowError('at (b:1:11..16) args.x')
  })
  describe('async compilation', () => {
    test('can use exported definitions from another module', async () => {
      expect(await runPromise('a', { a: `import * as b from 'b'; 3+b.eight`, b: `export let eight = 8; {}` })).toEqual(
        11,
      )
    })
    test('allows specifying a custom source root', async () => {
      expect(
        await runPromise(
          'a',
          { 'p/q/r/a': `import * as b from 'b'; 3+b.eight`, 'p/q/r/b': `export let eight = 8; {}` },
          {},
          'p/q/r',
        ),
      ).toEqual(11)
    })
    test('allows importing from the same directory via a relative path', async () => {
      expect(await runPromise('s', { s: `import * as t from "./t"; t.ten+5`, t: `export let ten = 10` }, {})).toEqual(
        15,
      )
    })
    test('allows importing from sub directories', async () => {
      expect(
        await runPromise('q', { q: `import * as t from "./r/s/t"; t.ten+5`, 'r/s/t': `export let ten = 10` }, {}),
      ).toEqual(15)
      expect(
        await runPromise('q', {
          q: `import * as t from './r/s/t'; t.ten * t.ten`,
          'r/s/t': `import * as f from './d/e/f'; export let ten = f.five*2`,
          'r/s/d/e/f': `export let five = 5`,
        }),
      ).toEqual(100)
    })
    test('errors if a file tries to import a(nother) file which is outside of the source root tree', async () => {
      await expect(runPromise('q', { 'd1/d2/q': `import * as r from "../r"; 5` }, {}, 'd1/d2')).rejects.toThrowError(
        `resolved path (d1/r) is pointing outside of source root (d1/d2)`,
      )
    })
    test('allows the main file to be specified via an absolute path if it points to a file under source root', async () => {
      expect(await runPromise('/p/q/r/a', { '/p/q/r/a': `"apollo 11"` }, {}, '/p/q/r')).toEqual('apollo 11')
      await expect(runPromise('/p/q/x', { '/p/q/x': `"apollo 11"` }, {}, '/p/q/r')).rejects.toThrowError(
        'resolved path (/p/q/x) is pointing outside of source root (/p/q/r)',
      )
    })
  })
  describe('errors in imported files', () => {
    test('stack trace includes the name of the imported and a correct snippet from it', () => {
      expect(() =>
        run('q', { q: `import * as r from './r'; r.foo()`, r: `let a = {}; export let foo = () => a.b.c` }),
      ).toThrowError('at (r:1:36..40) a.b.c')
    })
  })
})
