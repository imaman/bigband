import crypto from 'crypto'

import { Septima } from '../src/septima'

/**
 * Runs a Septima program for testing purposes. If the program evaluates to `sink` an `undefined` is
 * returned.
 * @param input the Septima program to run
 */
function run(input: string) {
  return Septima.run(input, { onSink: () => undefined })
}

describe('septima', () => {
  test('basics', () => {
    expect(run(`5`)).toEqual(5)
    expect(() => run(`6 789`)).toThrowError(`Loitering input at (<inline>:1:3..5) 789`)
    expect(run(`3.14`)).toEqual(3.14)
  })
  test('an optional return keyword can be placed before the result', () => {
    expect(run(`return 5`)).toEqual(5)
    expect(run(`return 3.14`)).toEqual(3.14)
  })

  test('booleans', () => {
    expect(run(`true`)).toEqual(true)
    expect(run(`false`)).toEqual(false)
    expect(run(`!true`)).toEqual(false)
    expect(run(`!false`)).toEqual(true)
    expect(run(`!!true`)).toEqual(true)
    expect(run(`!!false`)).toEqual(false)

    expect(run(`true||true`)).toEqual(true)
    expect(run(`true||false`)).toEqual(true)
    expect(run(`false||true`)).toEqual(true)
    expect(run(`false||false`)).toEqual(false)

    expect(run(`true && true`)).toEqual(true)
    expect(run(`true && false`)).toEqual(false)
    expect(run(`false && true`)).toEqual(false)
    expect(run(`false && false`)).toEqual(false)
  })

  test('arithmetics', () => {
    expect(run(`8*2`)).toEqual(16)
    expect(run(`3+1`)).toEqual(4)
    expect(run(`20-3`)).toEqual(17)
    expect(run(`48/6`)).toEqual(8)
    expect(run(`(1+4)*6`)).toEqual(30)
    expect(run(`1+4*6`)).toEqual(25)
    expect(run(`20%6`)).toEqual(2)
    expect(run(`20%8`)).toEqual(4)
    expect(run(`40%15`)).toEqual(10)
    expect(run(`6**3`)).toEqual(216)
    expect(run(`6**4`)).toEqual(1296)
    expect(run(`2*3**4`)).toEqual(162)
    expect(run(`(2*3)**4`)).toEqual(1296)

    expect(run(`8/0`)).toEqual(Infinity)
    expect(run(`(-4) ** 0.5`)).toEqual(NaN)

    expect(() => run(`!5`)).toThrowError(`value type error: expected bool but found 5`)
    expect(() => run(`!0`)).toThrowError(`value type error: expected bool but found 0`)
    expect(() => run(`!!0`)).toThrowError(`value type error: expected bool but found 0`)
    expect(() => run(`!!4`)).toThrowError(`value type error: expected bool but found 4`)
  })

  test('error message specifies the location in the file', () => {
    expect(() => run(`7+\n6+\n5+4+3+!2`)).toThrowError(`value type error: expected bool but found 2`)

    const expected = [
      `value type error: expected num but found "zxcvbnm" when evaluating:`,
      `  at (<inline>:1:1..21) 9 * 8 * 'zxcvbnm' * 7`,
      `  at (<inline>:1:1..21) 9 * 8 * 'zxcvbnm' * 7`,
      `  at (<inline>:1:5..21) 8 * 'zxcvbnm' * 7`,
      `  at (<inline>:1:10..21) zxcvbnm' * 7`,
    ].join('\n')

    expect(() => run(`9 * 8 * 'zxcvbnm' * 7`)).toThrowError(expected)
  })

  describe('equality', () => {
    test('of numbers', () => {
      expect(run(`3==4`)).toEqual(false)
      expect(run(`3==3`)).toEqual(true)
      expect(run(`3!=4`)).toEqual(true)
      expect(run(`3!=3`)).toEqual(false)
    })
    test('of strings', () => {
      expect(run(`'alpha' == 'beta'`)).toEqual(false)
      expect(run(`'alpha' == 'alpha'`)).toEqual(true)
    })
    test('of boolean', () => {
      expect(run(`false == false`)).toEqual(true)
      expect(run(`false == true`)).toEqual(false)
      expect(run(`true == false`)).toEqual(false)
      expect(run(`true == true`)).toEqual(true)
    })
    test('of values of different types is always false', () => {
      expect(run(`false == 5`)).toEqual(false)
      expect(run(`'6' == 6`)).toEqual(false)
      expect(run(`['alpha'] == 'alpha'`)).toEqual(false)
      expect(run(`{} == []`)).toEqual(false)
      expect(run(`((x) => (x+3)) == 6`)).toEqual(false)
    })
    test('of objects', () => {
      expect(run(`{} == {}`)).toEqual(true)
      expect(run(`{} == {a: 1}`)).toEqual(false)
      expect(run(`{x: 1, y: {z: "ab".length}} == {x: 1, y: {z: 2}}`)).toEqual(true)
      expect(run(`{x: 1, y: {z: "ab".length}} == {x: 1, y: {z: -2}}`)).toEqual(false)
    })
    test('object equality is not sensitive to the order of the attributes', () => {
      expect(run(`{x: 1, y: 2} == {y: 2, x: 1}`)).toEqual(true)
    })
    test('of arrays', () => {
      expect(run(`[10, 30, 19, 500] == [10, 3*10, 20-1, 5*100]`)).toEqual(true)
      expect(run(`[10, 30, 19, -500] == [10, 3*10, 20-1, 5*100]`)).toEqual(false)
    })
    test('array equality is sensitive to the order of the items', () => {
      expect(run(`['alpha', 'beta'] == ['beta', 'alpha']`)).toEqual(false)
    })
  })

  test('comparison', () => {
    expect(run(`3>2`)).toEqual(true)
    expect(run(`3>3`)).toEqual(false)
    expect(run(`3>4`)).toEqual(false)

    expect(run(`3>=2`)).toEqual(true)
    expect(run(`3>=3`)).toEqual(true)
    expect(run(`3>=4`)).toEqual(false)

    expect(run(`3<=2`)).toEqual(false)
    expect(run(`3<=3`)).toEqual(true)
    expect(run(`3<=4`)).toEqual(true)

    expect(run(`3<2`)).toEqual(false)
    expect(run(`3<3`)).toEqual(false)
    expect(run(`3<4`)).toEqual(true)
  })

  test('combined arithmetics and logical expressions', () => {
    expect(run(`(5 + 3 > 6) && (10*20 > 150)`)).toEqual(true)
    expect(run(`(5 + 3 > 9) && (10*20 > 150)`)).toEqual(false)
    expect(run(`(5 + 3 > 6) && (10*20 > 201)`)).toEqual(false)
    expect(run(`(5 + 3 > 9) && (10*20 > 201)`)).toEqual(false)
  })

  test('the rhs of a logical-or expression is evaluated only if lhs is false', () => {
    expect(run(`true || x`)).toEqual(true)
    expect(() => run(`false || x`)).toThrowError('Symbol x was not found')
  })
  test('the rhs of a logical-and expression is evaluated only if lhs is true', () => {
    expect(run(`false && x`)).toEqual(false)
    expect(() => run(`true && x`)).toThrowError('Symbol x was not found')
  })

  test('eats whitespace', () => {
    expect(run(`    8 * 2  `)).toEqual(16)
    expect(run(`3 + 1`)).toEqual(4)
    expect(run(`20 - 3`)).toEqual(17)
    expect(run(`48 /     6`)).toEqual(8)
    expect(run(`(1 + 4 ) *7`)).toEqual(35)
  })

  describe('unary expressions', () => {
    test('+', () => {
      expect(run(`+7`)).toEqual(7)
      expect(run(`3*+7`)).toEqual(21)
      expect(run(`3 * +7`)).toEqual(21)
    })
    test('errors if + is applied to non-number', () => {
      expect(() => run(`+true`)).toThrowError('expected num but found true')
      expect(() => run(`+[]`)).toThrowError('expected num but found []')
      expect(() => run(`+{}`)).toThrowError('expected num but found {}')
      expect(() => run(`+(fun (x) x*2)`)).toThrowError('expected num but found "fun (x) (x * 2)"')
      expect(() => run(`+'abc'`)).toThrowError(`expected num but found "abc"`)
    })
    test('-', () => {
      expect(run(`-7`)).toEqual(-7)
      expect(run(`3+-7`)).toEqual(-4)
      expect(run(`3*-7`)).toEqual(-21)
      expect(run(`-3*-7`)).toEqual(21)
      expect(run(`3 + -7`)).toEqual(-4)
      expect(run(`3 * -7`)).toEqual(-21)
      expect(run(`-3 * -7`)).toEqual(21)
    })
  })

  describe('strings', () => {
    test('can be specified via the double-quotes notation', () => {
      expect(run(`""`)).toEqual('')
      expect(run(`"ab"`)).toEqual('ab')
      expect(run(`"ab" + "cd"`)).toEqual('abcd')
    })
    test('can be specified via the single-quotes notation', () => {
      expect(run(`''`)).toEqual('')
      expect(run(`'ab'`)).toEqual('ab')
      expect(run(`'ab' + 'cd'`)).toEqual('abcd')
    })
    test('does not trim leading/trailing whitespace', () => {
      expect(run(`' ab'`)).toEqual(' ab')
      expect(run(`'ab '`)).toEqual('ab ')
      expect(run(`'   '`)).toEqual('   ')
      expect(run(`'  ab  '`)).toEqual('  ab  ')
      expect(run(`" ab"`)).toEqual(' ab')
      expect(run(`"ab "`)).toEqual('ab ')
      expect(run(`"   "`)).toEqual('   ')
      expect(run(`"  ab  "`)).toEqual('  ab  ')
    })
    test('supports string methods', () => {
      expect(run(`'bigbird'.substring(3, 7)`)).toEqual('bird')
      expect(run(`'bigbird'.indexOf('g')`)).toEqual(2)
      expect(run(`'ab-cde-fghi-jkl'.split('-')`)).toEqual(['ab', 'cde', 'fghi', 'jkl'])
      expect(run(`let s = '  ab   cd     '; [s.trimStart(), s.trimEnd(), s.trim()]`)).toEqual([
        'ab   cd     ',
        '  ab   cd',
        'ab   cd',
      ])
    })
    test('supports optional arguments of string methods', () => {
      expect(run(`'bigbird'.substring(5)`)).toEqual('rd')
    })
  })
  describe('let', () => {
    test('binds values to variables', () => {
      expect(run(`let x = 5; x+3`)).toEqual(8)
      expect(run(`let x = 5; let y = 20; x*y+4`)).toEqual(104)
    })
    test('do not need the trailing semicolon', () => {
      expect(run(`let x = 5 x+3`)).toEqual(8)
      expect(run(`let x = 5 let y = 20 x*y+4`)).toEqual(104)
    })
    test('fails if the variable was not defined', () => {
      expect(() => run(`let x = 5; x+y`)).toThrowError('Symbol y was not found')
    })

    test('parenthsized expression can have let defintions', () => {
      expect(
        run(`
        let x = 5; 
        let y = 20; 
        
        x*y+(let n = 4; n*7)`),
      ).toEqual(128)
      expect(
        run(`
        let x = 5; 
        let y = 20; 
        
        x*y+(let n = 4; let o = 7; o*n)`),
      ).toEqual(128)
    })

    test('inner expressions can access variables from enclosing scopes', () => {
      expect(
        run(`
        let x = 5; 
        let y = 20; 
        
        x*y+(let n = 4; n+x)`),
      ).toEqual(109)
    })
    test('definitions from inner scopes overshadow definitions from outer scopes', () => {
      expect(
        run(`
        let x = 5; 
        let y = 20; 
        
        x*y+(let n = 4; let x = 200; n+x)`),
      ).toEqual(304)
    })
    test('the body of a definition can reference an earlier definition from the same scope', () => {
      expect(run(`let x = 10;  let y = x*2;  y*2`)).toEqual(40)
    })
    test('the body of a definition cannot reference a latter definition from the same scope', () => {
      expect(() => run(`let y = x*2; let x = 10;  y*2`)).toThrowError(`Symbol x was not found`)
    })
    test('the body of a definition cannot reference itself', () => {
      expect(() => run(`let x = 10;  let y = if (x > 0) y else x; y*2`)).toThrowError(`Unresolved definition: y`)
    })
    test('uses lexical scoping (and not dynamic scoping)', () => {
      const actual = run(`let x = (let a = 1; a+1);  let y = (let a=100; x+1); y`)
      expect(actual).toEqual(3)
    })
    test('definitions go out of scope', () => {
      expect(() => run(`let x = (let a = 1; a+1); a+100`)).toThrowError('Symbol a was not found')
    })
  })

  describe('semicolons before the expression', () => {
    test('are allowed', () => {
      expect(run(`let a = 5; ;;;;4.8`)).toEqual(4.8)
      expect(run(`;;;"abc"`)).toEqual('abc')
      expect(run(`;4.8`)).toEqual(4.8)
    })
    test('can be interleaved with whitspace', () => {
      expect(run(`let a = 5; ;; ;; 4.8`)).toEqual(4.8)
      expect(run(`;; ;   "abc"`)).toEqual('abc')
      expect(run(` ;\n4.8`)).toEqual(4.8)
    })
  })

  describe('arrays', () => {
    test('array literals are specified via the enclosing brackets notation ([])', () => {
      expect(run(`["ab", 5]`)).toEqual(['ab', 5])
      expect(run(`[]`)).toEqual([])
    })
    test('allow a dangling comma', () => {
      expect(run(`[,]`)).toEqual([])
      expect(run(`[,,]`)).toEqual([])
      expect(run(`[246,]`)).toEqual([246])
      expect(run(`[246,531,]`)).toEqual([246, 531])
    })
    test('individual elements of an array can be accessed via the [<index>] notation', () => {
      expect(run(`let a = ['sun', 'mon', 'tue', 'wed']; a[1]`)).toEqual('mon')
    })
    test('the <index> value at the [<index>] notation can be a computed value', () => {
      expect(run(`let a = ['sun', 'mon', 'tue', 'wed']; let f = fun(n) n-5; [a[3-1], a[18/6], a[f(5)]]`)).toEqual([
        'tue',
        'wed',
        'sun',
      ])
    })
    test('arrayness of a value can be tested via Array.isArry()', () => {
      expect(run(`Array.isArray([1,2,'abc'])`)).toEqual(true)
      expect(run(`Array.isArray('abc')`)).toEqual(false)
    })
  })

  describe('objects', () => {
    describe('literals', () => {
      test('are specified via JSON format', () => {
        expect(run(`{}`)).toEqual({})
        expect(run(`{a: 1}`)).toEqual({ a: 1 })
        expect(run(`{a: 1, b: 2}`)).toEqual({ a: 1, b: 2 })
        expect(run(`{a: "A", b: "B", c: "CCC"}`)).toEqual({ a: 'A', b: 'B', c: 'CCC' })
      })
      test('attribute names can be double/single quoted', () => {
        expect(run(`{"a": 1}`)).toEqual({ a: 1 })
        expect(run(`{'b': 2}`)).toEqual({ b: 2 })
        expect(run(`{"the quick brown": "fox", 'jumps over': "the"}`)).toEqual({
          'the quick brown': 'fox',
          'jumps over': 'the',
        })
      })
      test('allow a dangling comma', () => {
        expect(run(`{a: 1,}`)).toEqual({ a: 1 })
        expect(run(`{a: 1, b: 2,}`)).toEqual({ a: 1, b: 2 })
        expect(run(`{a: "A", b: "B", c: "CCC",}`)).toEqual({ a: 'A', b: 'B', c: 'CCC' })
      })
      test('a dangling comma in an empty object is not allowed', () => {
        expect(() => run(`{,}`)).toThrowError('Expected an identifier at (<inline>:1:2..3) ,}')
      })
      test('supports computed attributes names via the [<expression>]: <value> notation', () => {
        expect(run(`{["a" + 'b']: 'a-and-b'}`)).toEqual({ ab: 'a-and-b' })
      })
      test('supports shorthand notation for initializing an attribute from an identifier', () => {
        expect(run(`let a = 'A'; let b = 42; {a, b}`)).toEqual({ a: 'A', b: 42 })
      })
    })
    describe('attributes', () => {
      test('can be accessed via the .<ident> notation', () => {
        expect(run(`let x = {a: 3, b: 4}; x.a`)).toEqual(3)
        expect(run(`let x = {a: 3, b: 4}; x.a * x.b`)).toEqual(12)
        expect(run(`let x = {a: 3, b: {x: {Jan: 1, Feb: 2, May: 5}, y: 300}}; [x.b.x.Jan, x.b.x.May, x.b.y]`)).toEqual([
          1, 5, 300,
        ])
        expect(run(`let x = {a: 3, calendar: ["A"] }; x.calendar`)).toEqual(['A'])
        expect(
          run(
            `let x = {a: 3, calendar: {months: { Jan: 1, Feb: 2, May: 5}, days: ["Mon", "Tue", "Wed" ] } }; [x.calendar.months, x.calendar.days]`,
          ),
        ).toEqual([{ Jan: 1, Feb: 2, May: 5 }, ['Mon', 'Tue', 'Wed']])
      })
      test('can be accessed via the [<name>] notation', () => {
        expect(run(`let x = {a: 3, b: 4}; x['a']`)).toEqual(3)
        expect(run(`let x = {a: 3, b: 4}; [x['a'], x["b"]]`)).toEqual([3, 4])
        expect(run(`let x = {a: 3, b: {x: {Jan: 1, Feb: 2, May: 5}, y: 300}}; x["b"]['x']["May"]`)).toEqual(5)
      })
      test('supports chains of attribute accesses mixing the .<ident> and the [<name>] notations', () => {
        expect(run(`let o = {b: {x: {M: 5}}}; [o["b"].x["M"], o.b["x"].M, o.b.x["M"]]`)).toEqual([5, 5, 5])
      })
      test('supports chains of calls to nested attributes which are lambda expressions', () => {
        expect(run(`let o = {a: fun () { b: fun () { c: fun () { d: 'x' }}}}; o.a().b().c().d`)).toEqual('x')
        expect(run(`let o = {a: fun () { b: { c: fun () { d: 'x' }}}}; o.a().b.c().d`)).toEqual('x')
      })
      test('the <name> value at the [<name>] notation can be a computed value', () => {
        expect(run(`let q = fun (x) x + "eb"; let o = {Jan: 1, Feb: 2, May: 5}; [o["Ja" + 'n'], o[q('F')]]`)).toEqual([
          1, 2,
        ])
      })
    })
  })

  describe('spread operator in objects', () => {
    test('shallow copies an object into an object literal', () => {
      expect(run(`let o = {a: 1, b: 2}; {...o}`)).toEqual({ a: 1, b: 2 })
    })
    test('can be combined with hard-coded (literal) attributes', () => {
      expect(run(`let o = {a: 1}; {...o, b: 2}`)).toEqual({ a: 1, b: 2 })
      expect(run(`let o = {b: 2}; {...o, a: 1, ...o}`)).toEqual({ a: 1, b: 2 })
    })
    test('can be used multiple times inside a single object literal', () => {
      expect(run(`let o1 = {b: 2}; let o2 = {c: 3}; {a: 1, ...o1, ...o2, d: 4}`)).toEqual({
        a: 1,
        b: 2,
        c: 3,
        d: 4,
      })
    })
    test('overrides attributes to its left', () => {
      expect(run(`let o = {b: 2}; {a: 100, b: 200, c: 300, ...o}`)).toEqual({ a: 100, b: 2, c: 300 })
    })
    test('overridden by attributes to its right', () => {
      expect(run(`let o = {a: 1, b: 2, c: 3}; {...o, b: 200}`)).toEqual({ a: 1, b: 200, c: 3 })
    })
    test('can be mixed with computed attribute names', () => {
      expect(run(`let o = {ab: 'anteater'}; {...o, ['c' + 'd']: 'cat'}`)).toEqual({ ab: 'anteater', cd: 'cat' })
    })
    test('errors if applied to a non-object value', () => {
      expect(() => run(`let o = ['a']; {...o}`)).toThrowError(`value type error: expected obj but found ["a"]`)
      expect(() => run(`let o = true; {...o}`)).toThrowError('value type error: expected obj but found true')
      expect(() => run(`let o = 5; {...o}`)).toThrowError('value type error: expected obj but found 5')
      expect(() => run(`let o = 'a'; {...o}`)).toThrowError('value type error: expected obj but found "a"')
    })
  })

  describe('spread operator in arrays', () => {
    test('shallow copies an array into an array literal', () => {
      expect(run(`let a = ['x', 'y']; [...a]`)).toEqual(['x', 'y'])
    })
    test('can be mixed with array elements', () => {
      expect(run(`let a = ['x', 'y']; ['p', ...a, 'q']`)).toEqual(['p', 'x', 'y', 'q'])
    })
    test('can be used multiple times inside an array literal', () => {
      expect(run(`let a1 = ['x', 'y']; let a2 = ['z']; ['p', ...a1, 'q', ...a2, 'r']`)).toEqual([
        'p',
        'x',
        'y',
        'q',
        'z',
        'r',
      ])
    })
    test('errors if applied to a non-array value', () => {
      expect(() => run(`let a = true; [...a]`)).toThrowError('value type error: expected arr but found true')
      expect(() => run(`let a = 5; [...a]`)).toThrowError('value type error: expected arr but found 5')
      expect(() => run(`let a = {x: 1}; [...a]`)).toThrowError(`value type error: expected arr but found {"x":1}`)
      expect(() => run(`let a = 'a'; [...a]`)).toThrowError('value type error: expected arr but found "a"')
    })
  })

  describe('if', () => {
    test('returns the value of the first branch if the condition is true', () => {
      expect(run(`if (4 > 3) 200 else -100`)).toEqual(200)
    })
    test('evaluates the first branch only if the condition is true', () => {
      expect(() => run(`if (true) x else -100`)).toThrowError('Symbol x was not found')
      expect(run(`if (false) x else -100`)).toEqual(-100)
    })
    test('returns the value of the second branch if the condition is false', () => {
      expect(run(`if (4 < 3) 200 else -100`)).toEqual(-100)
    })
    test('evaluates the second branch only if the condition is false', () => {
      expect(() => run(`if (false) 200 else x`)).toThrowError('Symbol x was not found')
      expect(run(`if (true) 200 else x`)).toEqual(200)
    })
    test('yells if conditions is not boolean', () => {
      expect(() => run(`if (5+8) 200 else -100`)).toThrowError('value type error: expected bool but found 13')
    })
  })

  describe('ternary', () => {
    test('returns the value of the first branch if the condition is true', () => {
      expect(run(`(4 > 3) ? 200 : -100`)).toEqual(200)
    })
    test('evaluates the first branch only if the condition is true', () => {
      expect(() => run(`true ? x : -100`)).toThrowError('Symbol x was not found')
      expect(run(`false ? x : -100`)).toEqual(-100)
    })
    test('returns the value of the second branch if the condition is false', () => {
      expect(run(`(4 < 3) ? 200 : -100`)).toEqual(-100)
    })
    test('evaluates the second branch only if the condition is false', () => {
      expect(() => run(`false ? 200 : x`)).toThrowError('Symbol x was not found')
      expect(run(`true ? 200 : x`)).toEqual(200)
    })
    test('yells if conditions is not boolean', () => {
      expect(() => run(`5+8 ? 200 : -100`)).toThrowError('value type error: expected bool but found 13')
    })
    test('higher precendence than lambda', () => {
      expect(run(`let f = (a,b) => a > b ? 'ABOVE' : 'BELOW'; f(1,2) + '_' + f(2,1)`)).toEqual('BELOW_ABOVE')
    })
    test('higher precendence than if', () => {
      expect(run(`if (5 < 2) "Y" else 3+4>8? 'ABOVE' : 'BELOW'`)).toEqual('BELOW')
    })
    test('can span multiple lines', () => {
      expect(run(`3 + 4 > 6\n? 'ABOVE'\n: 'BELOW'`)).toEqual('ABOVE')
      expect(run(`3 + 4 > 8\n? 'ABOVE'\n: 'BELOW'`)).toEqual('BELOW')
      expect(run(`3 + 4 > 6?\n 'ABOVE':\n 'BELOW'`)).toEqual('ABOVE')
      expect(run(`3 + 4 > 8?\n 'ABOVE':\n 'BELOW'`)).toEqual('BELOW')
    })
  })

  describe('lambda expressions', () => {
    test('binds the value of the actual arg to the formal arg', () => {
      expect(run(`(fun(a) 2*a)(3)`)).toEqual(6)
      expect(run(`(fun(a, b) a*a-b*b)(3,4)`)).toEqual(-7)
      expect(run(`(fun(a, b) a*a-b*b)(4,3)`)).toEqual(7)
    })
    test('can be stored in a variable', () => {
      expect(run(`let triple = (fun(a) 3*a); triple(100) - triple(90)`)).toEqual(30)
      expect(run(`let triple = fun(a) 3*a; triple(100) - triple(90)`)).toEqual(30)
    })
    test('allows a dangling comma, at the call site, after the last actual argument', () => {
      expect(run(`let triple = (fun(a) 3*a); triple(100,)`)).toEqual(300)
      expect(run(`let mean = (fun(a,b) (a+b)/2); mean(4, 28,)`)).toEqual(16)
    })
    describe('arrow function notation', () => {
      test('a single formal argument does not need to be surrounded with parenthesis', () => {
        expect(run(`let triple = a => 3*a; triple(100)`)).toEqual(300)
      })
      test('(a) => <expression>', () => {
        expect(run(`let triple = (a) => 3*a; triple(100)`)).toEqual(300)
      })
      test('() => <expression>', () => {
        expect(run(`let five = () => 5; five()`)).toEqual(5)
      })
      test('(a,b) => <expression>', () => {
        expect(run(`let conc = (a,b) => a+b; conc('al', 'pha')`)).toEqual('alpha')
        expect(run(`let conc = (a,b,c,d,e,f) => a+b+c+d+e+f; conc('M', 'o', 'n', 'd', 'a', 'y')`)).toEqual('Monday')
      })
      test('body of an arrow function can be { return <expression>}', () => {
        expect(run(`let triple = a => { return 3*a }; triple(100)`)).toEqual(300)
        expect(run(`let triple = (a) => { return 3*a }; triple(100)`)).toEqual(300)
        expect(run(`let five = () => { return 5 }; five()`)).toEqual(5)
        expect(run(`let concat = (a,b) => { return a+b }; concat('al', 'pha')`)).toEqual('alpha')
      })
      test('body of an arrow function can include let definitions', () => {
        expect(run(`let triple = a => { let factor = 3; return factor*a }; triple(100)`)).toEqual(300)
        expect(run(`let triple = (a) => { let factor = 3; return 3*a }; triple(100)`)).toEqual(300)
        expect(run(`let five = () => { let two = 2; let three = 3; return three+two }; five()`)).toEqual(5)
        expect(run(`let concat = (a,b) => { let u = '_'; return u+a+b+u }; concat('a', 'b')`)).toEqual('_ab_')
      })
      test('allows a dangling comma after last formal arg', () => {
        expect(run(`let f = (a,) => a+1000; f(3)`)).toEqual(1003)
        expect(run(`let f = (a,b,) => a+b+1000; f(5,900)`)).toEqual(1905)
      })
    })
    test('can have no args', () => {
      expect(run(`let pi = fun() 3.14; 2*pi()`)).toEqual(6.28)
      expect(run(`(fun() 3.14)()*2`)).toEqual(6.28)
    })
    test('errors on arg list mismatch', () => {
      expect(() => run(`let quadSum = fun(a,b,c,d) a+b+c+d; quadSum(4,8,2)`)).toThrowError(
        'A value must be passed to formal argument: d when evaluating',
      )
      expect(run(`let quadSum = fun(a,b,c,d) a+b+c+d; quadSum(4,8,2,6)`)).toEqual(20)
    })
    test('can be recursive', () => {
      expect(run(`let factorial = fun(n) if (n > 0) n*factorial(n-1) else 1; factorial(6)`)).toEqual(720)
      expect(run(`let gcd = fun(a, b) if (b == 0) a else gcd(b, a % b); [gcd(24, 60), gcd(1071, 462)]`)).toEqual([
        12, 21,
      ])
    })
    test('can access definitions from the enclosing scope', () => {
      expect(run(`let a = 1; (let inc = fun(n) n+a; inc(2))`)).toEqual(3)
      expect(run(`let by2 = fun(x) x*2; (let by10 = (let by5 = fun(x) x*5; fun(x) by2(by5(x))); by10(20))`)).toEqual(
        200,
      )
    })
    test('expression trace on error', () => {
      const expected = [
        '  at (<inline>:1:1..88) let d = fun(x1) x2; let c = fun(x) d(x); let b = fun (x) c(x); let a = fun(x) b(...',
        '  at (<inline>:1:85..88) a(5)',
        '  at (<inline>:1:79..82) b(x)',
        '  at (<inline>:1:58..61) c(x)',
        '  at (<inline>:1:36..39) d(x)',
        '  at (<inline>:1:17..18) x2',
      ].join('\n')

      expect(() =>
        run(`let d = fun(x1) x2; let c = fun(x) d(x); let b = fun (x) c(x); let a = fun(x) b(x); a(5)`),
      ).toThrowError(expected)
    })
    test('only lexical scope is considered when looking up a definition', () => {
      expect(run(`let a = 1; let inc = fun(n) n+a; (let a = 100; inc(2))`)).toEqual(3)
    })
    test('can return another lambda expression (a-la currying)', () => {
      expect(run(`let sum = fun(a) fun(b,c) a+b+c; sum(1)(600,20)`)).toEqual(621)
      expect(run(`let sum = fun(a) fun(b) fun(c) a+b+c; sum(1)(600)(20)`)).toEqual(621)
      expect(run(`let sum = fun(a) fun(b,c) a+b+c; let plusOne = sum(1); plusOne(600,20)`)).toEqual(621)
      expect(run(`let sum = fun(a) fun(b) fun(c) a+b+c; let plusOne = sum(1); plusOne(600)(20)`)).toEqual(621)
    })
    describe('optional arguments', () => {
      test('takes the default value if no valu for that arg was not passed', () => {
        expect(run(`let sum = (a, b = 50) => a + b; [sum(9), sum(9,1)]`)).toEqual([59, 10])
      })
      test('the default value can be an arry or an object', () => {
        expect(run(`let f = (i, vs = ['alpha', 'beta']) => vs[i]; [f(0), f(1)]`)).toEqual(['alpha', 'beta'])
        expect(run(`let f = (s, vs = {a: 1, b: 2}) => vs[s]; [f('a'), f('b')]`)).toEqual([1, 2])
      })
      test('the default value can be an expression computed from other definision in the enclosing scope', () => {
        expect(run(`let s = 'word'; let n = 100; let f = (a, g = s + n) => a + g.toUpperCase(); f('_')`)).toEqual(
          '_WORD100',
        )
      })
      test('a single argument arrow function can have a default value', () => {
        expect(run(`let s = 'word'; let n = 100; let f = (a = s.toUpperCase()) => '%' + a + '%'; f()`)).toEqual(
          '%WORD%',
        )
      })
      test('errors if there is an argument without a default value after an arugument with a default value', () => {
        expect(() => run(`let f = (a, b = 2000, c) => a+b+c`)).toThrowError(
          'A required parameter cannot follow an optional parameter: at (<inline>:1:23..33) c) => a+b+c',
        )
      })
      test('when undefined is passed to an arg with a default value, the default value is used', () => {
        expect(run(`let f = (a, b = 2000, c = 3) => a+b+c; f(1, undefined, 5)`)).toEqual(2006)
      })
      test('a dangling comma is allowed after last default value', () => {
        expect(run(`let f = (a, b = 2000,) => a+b; f(5)`)).toEqual(2005)
        expect(run(`let f = (a, b = 2000,) => a+b; f(5,20)`)).toEqual(25)
      })
    })
  })
  describe('array methods', () => {
    test('concat', () => {
      expect(run(`['foo', 'bar', 'goo'].concat(['zoo', 'poo'])`)).toEqual(['foo', 'bar', 'goo', 'zoo', 'poo'])
    })
    test('every', () => {
      expect(run(`["", 'x', 'xx'].every(fun (item, i) item.length == i)`)).toEqual(true)
      expect(run(`["", 'yy', 'zz'].every(fun (item, i) item.length == i)`)).toEqual(false)
      expect(
        run(`let cb = fun (item, i, a) item == a[(a.length - i) - 1]; [[2, 7, 2].every(cb), [2, 7, 7].every(cb)]`),
      ).toEqual([true, false])
    })
    test('filter', () => {
      expect(run(`['foo', 'bar', 'goo'].filter(fun (item) item.endsWith('oo'))`)).toEqual(['foo', 'goo'])
      expect(run(`['a', 'b', 'c', 'd'].filter(fun (item, i) i % 2 == 1)`)).toEqual(['b', 'd'])
      expect(run(`[8, 8, 2, 2, 2, 7].filter(fun (x, i, a) x == a[(i + 1) % a.length])`)).toEqual([8, 2, 2])
    })
    test('find', () => {
      expect(run(`[10, 20, 30, 40].find(fun (item, i) item + i == 21)`)).toEqual(20)
      expect(run(`[8, 3, 7, 7, 6, 9].find(fun (x, i, a) x == a[a.length - (i+1)])`)).toEqual(7)
    })
    test('findIndex', () => {
      expect(run(`[10, 20, 30, 40].findIndex(fun (item, i) item + i == 32)`)).toEqual(2)
      expect(run(`[8, 3, 7, 7, 6, 9].findIndex(fun (x, i, a) x == a[a.length - (i+1)])`)).toEqual(2)
    })
    test('findIndex returns -1 if no matching element exists', () => {
      expect(run(`[3, 5, 7, 9].findIndex(fun (x) x % 2 == 0)`)).toEqual(-1)
      expect(run(`[].findIndex(fun () true)`)).toEqual(-1)
    })
    test('flatMap', () => {
      expect(run(`['Columbia', 'Eagle'].flatMap(fun (x) [x, x.length])`)).toEqual(['Columbia', 8, 'Eagle', 5])
      expect(run(`[6,7,9].flatMap(fun (x,i) if (i % 2 == 0) [x, x/3] else [])`)).toEqual([6, 2, 9, 3])
      expect(run(`[2,1,6,5,9,8].flatMap(fun (x,i,a) if (i % 2 == 1) [x, a[i-1]] else [])`)).toEqual([1, 2, 5, 6, 8, 9])
    })
    test('map', () => {
      expect(run(`['foo', 'bar', 'goo'].map(fun (s) s.charAt(0))`)).toEqual(['f', 'b', 'g'])
      expect(run(`['a', 'b'].map(fun (item, i) item + ':' + i)`)).toEqual(['a:0', 'b:1'])
      expect(run(`['a', 'b', 'p', 'q'].map(fun (x, i, a) x + a[a.length - (i+1)])`)).toEqual(['aq', 'bp', 'pb', 'qa'])
    })
    test('reduce', () => {
      expect(run(`['a','b','c','d'].reduce(fun (w, x) w+x, '')`)).toEqual('abcd')
      expect(run(`['a','b','c','d','e'].reduce(fun (w, x, i) if (i % 2 == 0) w+x else w, '')`)).toEqual('ace')
      expect(run(`[['w',2], ['x',0], ['y',1]].reduce(fun (w, x, i, a) w+a[x[1]][0], '')`)).toEqual('ywx')
    })
    test('reduceRight', () => {
      expect(run(`['a','b','c','d'].reduceRight(fun (w, x) w+x, '')`)).toEqual('dcba')
      expect(run(`['a','b','c','d','e'].reduceRight(fun (w, x, i) if (i % 2 == 0) w+x else w, '')`)).toEqual('eca')
      expect(run(`[['w',2], ['x',0], ['y',1]].reduceRight(fun (w, x, i, a) w+a[x[1]][0], '')`)).toEqual('xwy')
    })
    test('some', () => {
      expect(run(`['foo', 'bar', 'goo'].some(fun (item) item.endsWith('oo'))`)).toEqual(true)
      expect(run(`['foo', 'bar', 'goo'].some(fun (item) item.endsWith('pp'))`)).toEqual(false)
      expect(run(`['a', 'xyz', 'bc'].some(fun (item, i) i == item.length)`)).toEqual(true)
      expect(run(`[8, 3, 7, 7, 6, 9].some(fun (x, i, a) x == a[a.length - (i+1)])`)).toEqual(true)
    })
    describe('sort', () => {
      test('can sort numbers', () => {
        expect(run(`[5, 9, 3, 8, 6, 4].sort()`)).toEqual([3, 4, 5, 6, 8, 9])
      })
      test('does not change the array', () => {
        expect(run(`let a = [4,3]; let b = a.sort(); {a,b}`)).toEqual({ a: [4, 3], b: [3, 4] })
      })
      test('can sort strings', () => {
        expect(run(`['Bob', 'Dan', 'Alice', 'Callie'].sort()`)).toEqual(['Alice', 'Bob', 'Callie', 'Dan'])
      })
      test('allows a custom sorting callback to be passed in', () => {
        expect(run(`['John', 'Ben', 'Emilia', 'Alice'].sort((a, b) => a.length - b.length)`)).toEqual([
          'Ben',
          'John',
          'Alice',
          'Emilia',
        ])
      })
      test('does not change the array when a custom sorting callback is used', () => {
        expect(run(`let a = ['xx', 'y']; let b = a.sort((a, b) => a.length - b.length); {a,b}`)).toEqual({
          a: ['xx', 'y'],
          b: ['y', 'xx'],
        })
      })
    })
    test('push is not allowed', () => {
      expect(() => run(`let a = [1,2]; a.push(5)`)).toThrowError('Unrecognized array method: push')
    })
  })
  describe('constructor', () => {
    test('.name reflects the type of the value', () => {
      expect(run('5.constructor.name')).toEqual('Number')
      expect(run('true.constructor.name')).toEqual('Boolean')
      expect(run('false.constructor.name')).toEqual('Boolean')
      expect(run('"abc".constructor.name')).toEqual('String')
      expect(run('[].constructor.name')).toEqual('Array')
      expect(run('{}.constructor.name')).toEqual('Object')
      expect(run('(() => 99).constructor.name')).toEqual('Function')
    })
    test('works also if the attribute name is calculated', () => {
      expect(run('5["const" + "ructor"].name')).toEqual('Number')
    })
  })
  describe('Object.keys()', () => {
    test('returns names of all attributes of the given object', () => {
      expect(run(`Object.keys({a: 1, b: 2, w: 30})`)).toEqual(['a', 'b', 'w'])
      // expect(run(`Object.entries({a: 1, b: 2, w: 30})`)).toEqual([['a', 1], ['b', 2], ['w', 30]])
    })
    test('fails if applied to a non-object value', () => {
      expect(() => run(`Object.keys('a')`)).toThrowError('value type error: expected obj but found "a"')
      expect(() => run(`Object.keys(5)`)).toThrowError('value type error: expected obj but found 5')
      expect(() => run(`Object.keys(false)`)).toThrowError('value type error: expected obj but found false')
      expect(() => run(`Object.keys(['a'])`)).toThrowError('value type error: expected obj but found ["a"]')
      expect(() => run(`Object.keys(fun () 5)`)).toThrowError('value type error: expected obj but found "fun () 5"')
    })
  })
  describe('Object.entries()', () => {
    test('returns a [key, value] pair for each attribute of the given object', () => {
      expect(run(`Object.entries({a: 1, b: 2, w: 30})`)).toEqual([
        ['a', 1],
        ['b', 2],
        ['w', 30],
      ])
    })
    test('fails if applied to a non-object value', () => {
      expect(() => run(`Object.entries('a')`)).toThrowError('type error: expected obj but found "a"')
      expect(() => run(`Object.entries(5)`)).toThrowError('type error: expected obj but found 5')
      expect(() => run(`Object.entries(false)`)).toThrowError('type error: expected obj but found false')
      expect(() => run(`Object.entries(['a'])`)).toThrowError('type error: expected obj but found ["a"]')
      expect(() => run(`Object.entries(fun () 5)`)).toThrowError('type error: expected obj but found "fun () 5"')
    })
  })
  describe('Object.fromEntries()', () => {
    test('constructs an object from a list of [key, value] pairs describing its attributes', () => {
      expect(run(`Object.fromEntries([['a', 1], ['b', 2], ['w', 30], ['y', 'yoo'], ['z', true]])`)).toEqual({
        a: 1,
        b: 2,
        w: 30,
        y: 'yoo',
        z: true,
      })
    })
    test('fails if applied to a non-array value', () => {
      expect(() => run(`Object.fromEntries('a')`)).toThrowError('type error: expected arr but found "a"')
      expect(() => run(`Object.fromEntries(5)`)).toThrowError('type error: expected arr but found 5')
      expect(() => run(`Object.fromEntries(false)`)).toThrowError('type error: expected arr but found false')
      expect(() => run(`Object.fromEntries({x: 1})`)).toThrowError('type error: expected arr but found {"x":1}')
      expect(() => run(`Object.fromEntries(fun () 5)`)).toThrowError('type error: expected arr but found "fun () 5"')
    })
    test('the input array must be an array of pairs', () => {
      expect(() => run(`Object.fromEntries([['a', 1], ['b']])`)).toThrowError('each entry must be a [key, value] pair')
    })
    test('the first element in each pair must be a string', () => {
      expect(() => run(`Object.fromEntries([[1, 'a']])`)).toThrowError('value type error: expected str but found 1')
    })
  })
  describe('line comments', () => {
    test(`anything from '//' up to the end-of-line is ignored`, () => {
      expect(
        run(`
        1 + 20 + // 300
        4000`),
      ).toEqual(4021)
    })
    test(`allow consecutive lines which are all commented out`, () => {
      expect(
        run(`
        1 + 
        // 20 + 
        // 300 +
        // 4000 +
        50000`),
      ).toEqual(50001)
    })
    test(`a comment inside a comment has no effect`, () => {
      expect(
        run(`
        1 + 
        // 20 +  // 300 +
        4000`),
      ).toEqual(4001)
    })
  })
  describe('block comments', () => {
    test(`anything from '/*' up to the next '*/' is ignored`, () => {
      expect(run(`1 + 20 + /* 300 */ 4000`)).toEqual(4021)
    })
    test(`can span multiple lines`, () => {
      expect(
        run(`
        1 + /*
        20 +
        300 
        */ 4000`),
      ).toEqual(4001)
    })
    test(`errors if the block comment start but does not end`, () => {
      expect(() => run(`1 + 20 + /* 300`)).toThrowError(
        'Block comment that started at at (<inline>:1:12..15)  300 is missing its closing (*/)',
      )
    })
    test(`errors if a block comment closer does not have an opener`, () => {
      expect(() => run(`1 + 20 + */ 300`)).toThrowError('Unparsable input at (<inline>:1:10..15) */ 300')
    })
  })
  describe('evaluation stack', () => {
    test('max recursion depth', () => {
      expect(run(`let count = fun (n) if (n <= 0) 0 else 1 + count(n-1); count(325)`)).toEqual(325)
    })
  })
  describe('args', () => {
    test('are bounded at runtime to a special variable called "args"', () => {
      expect(
        Septima.run(
          `args.a + '_' + args.color[0] + '_' + args.b + '_' + args.color[1]`,
          {},
          {
            a: 'Sunday',
            b: 'Monday',
            color: ['Red', 'Green'],
          },
        ),
      ).toEqual('Sunday_Red_Monday_Green')
    })
    test('are shadowed by a program-defined "args" symbol', () => {
      expect(Septima.run(`let args = {color: 'Green' }; args.color`, {}, { color: 'Red' })).toEqual('Green')
    })
  })
  describe('export', () => {
    test('a top level definition can have the "export" qualifier', () => {
      expect(run(`export let x = 5; x+3`)).toEqual(8)
    })
    test('allows multiple exported definitions', () => {
      expect(run(`export let x = 5; export let twice = n => n*2; export let a = r => r*r*3.14; twice(3)`)).toEqual(6)
    })
    test('multiple exported definitions can be interleaved with non-exported ones', () => {
      expect(run(`export let x = 5; let twice = n => n*2; export let a = r => r*r*3.14; twice(3)`)).toEqual(6)
    })
    test('errors if a nested definition has the "export" qualifier', () => {
      expect(() => run(`let x = (export let y = 4; y+1); x+3`)).toThrowError(
        'non-top-level definition cannot be exported at (<inline>:1:10..36) export let y = 4; y+1); x+3',
      )
    })
  })
  describe('import', () => {
    test('makes a definition from one file to be available in another file', () => {
      const septima = new Septima()
      const files: Partial<Record<string, string>> = {
        a: `import * as b from './b'; 'sum=' + b.sum(5, 3)`,
        b: `export let sum = (x,y) => x+y`,
      }
      expect(septima.compileSync('a', f => files[f]).execute({})).toEqual({ tag: 'ok', value: 'sum=8' })
    })
    test('all exported defintions are available at the import site', () => {
      const septima = new Septima()
      const files: Partial<Record<string, string>> = {
        a: `import * as b from './b'; b.sum(b.four, b.six)`,
        b: `export let sum = (x,y) => x+y; export let four = 4; export let six = 6`,
      }
      expect(septima.compileSync('a', f => files[f]).execute({})).toEqual({ tag: 'ok', value: 10 })
    })
    test('non-exported definitions become undefined', () => {
      const septima = new Septima()
      const files: Partial<Record<string, string>> = {
        a: `import * as b from './b';\n[b.four,\nb.six]`,
        b: `export let four = 4; let six = 6`,
      }
      expect(septima.compileSync('a', f => files[f]).execute({})).toEqual({ tag: 'ok', value: [4, undefined] })
    })
    test('can import from multiple files', () => {
      const septima = new Septima()
      const files: Partial<Record<string, string>> = {
        a: `import * as b from './b';\nimport * as c from './c'\nimport * as d from './d'; [b.val, c.val, d.val]`,
        b: `export let val = 100`,
        c: `export let val = 20`,
        d: `export let val = 3`,
      }
      expect(septima.compileSync('a', f => files[f]).execute({})).toEqual({ tag: 'ok', value: [100, 20, 3] })
    })
  })
  describe('unit', () => {
    test('evaluates to an empty string if it contains only definitions', () => {
      expect(run(`export let x = 5`)).toEqual('')
    })
  })
  describe('undefined', () => {
    // We want to verify that attributes with an undefined values do not exist in the object. To verify that we look
    // at the keys of the object.
    const keysOf = (u: unknown) => {
      const casted = u as Record<string, unknown> // eslint-disable-line @typescript-eslint/consistent-type-assertions
      return Object.keys(casted)
    }

    test(`the 'undefined' literal evaluates to (a JS) undefined`, () => {
      expect(run(`let x = undefined; x`)).toBe(undefined)
    })
    test('accessing a non-existing attribute evaulates to undefined', () => {
      expect(run(`let x = {a: 42}; [x.a, x.b]`)).toEqual([42, undefined])
    })
    test('.at() method returns undefined when the index is out of range', () => {
      expect(run(`let x = ['a', 'b', 'c']; [x.at(0), x.at(2), x.at(3)]`)).toEqual(['a', 'c', undefined])
    })
    test('can be stored in an array', () => {
      expect(run(`['a', undefined, 'c']`)).toEqual(['a', undefined, 'c'])
    })
    test('an object attribute with a value of undefined is dropped from the object', () => {
      expect(keysOf(run(`{n: 42, o: undefined, p: 'poo'}`))).toEqual(['n', 'p'])
      expect(keysOf(run(`Object.fromEntries([['n', 42], ['o', undefined], ['p', 'poo']])`))).toEqual(['n', 'p'])
    })
    test.todo('decide how overwriting with undefined works')
    test('spreading an undefined in object is a no-op', () => {
      expect(run(`{n: 42, ...undefined, p: 'poo'}`)).toEqual({ n: 42, p: 'poo' })
    })
    test('spreading an undefined in an array is a no-op', () => {
      expect(run(`[42, ...undefined, 'poo']`)).toEqual([42, 'poo'])
    })
    test('produces a full trace when an undefined-reference-error is fired', () => {
      let message
      try {
        run(`let x = undefined; x.a`)
      } catch (e) {
        message = String(e)
      }

      expect(message?.split('\n')).toEqual([
        'Error: value type error: expected either str, arr or obj but found undefined when evaluating:',
        '  at (<inline>:1:1..22) let x = undefined; x.a',
        '  at (<inline>:1:1..22) let x = undefined; x.a',
        '  at (<inline>:1:20..22) x.a',
      ])
    })
    test('errors when calling a method on undefined', () => {
      expect(() => run(`let x = undefined; x.a()`)).toThrowError('at (<inline>:1:20..24) x.a()')
    })
    test('errors when using undefined in arithmetic expressions', () => {
      expect(() => run(`4 + undefined`)).toThrowError('at (<inline>:1:1..13) 4 + undefined')
      expect(() => run(`4 - undefined`)).toThrowError('at (<inline>:1:1..13) 4 - undefined')
      expect(() => run(`4 * undefined`)).toThrowError('at (<inline>:1:1..13) 4 * undefined')
      expect(() => run(`4 / undefined`)).toThrowError('at (<inline>:1:1..13) 4 / undefined')
      expect(() => run(`undefined + 4`)).toThrowError('at (<inline>:1:1..13) undefined + 4')
      expect(() => run(`undefined - 4`)).toThrowError('at (<inline>:1:1..13) undefined - 4')
      expect(() => run(`undefined * 4`)).toThrowError('at (<inline>:1:1..13) undefined * 4')
      expect(() => run(`undefined / 4`)).toThrowError('at (<inline>:1:1..13) undefined / 4')
    })
    describe('??', () => {
      test('if the lhs is undefined evaluates to the rhs', () => {
        expect(run(`undefined ?? 42`)).toEqual(42)
        expect(run(`undefined ?? 900`)).toEqual(900)
        expect(run(`undefined ?? 'Luke'`)).toEqual('Luke')
      })
      test('if the lhs is not undefined evaluates to the lhs', () => {
        expect(run(`43 ?? 42`)).toEqual(43)
        expect(run(`43 ?? 900`)).toEqual(43)
        expect(run(`43 ?? 'Luke'`)).toEqual(43)
        expect(run(`'Han' ?? 42`)).toEqual('Han')
        expect(run(`'Han' ?? 900`)).toEqual('Han')
        expect(run(`'Han' ?? 'Luke'`)).toEqual('Han')
      })
    })
  })
  describe('Casting functions', () => {
    test('String()', () => {
      expect(run(`String(42)`)).toEqual('42')
      expect(run(`String("abc")`)).toEqual('abc')
      expect(run(`String(true)`)).toEqual('true')
      expect(run(`String(false)`)).toEqual('false')
      expect(run(`String(undefined)`)).toEqual('undefined')
      expect(run(`String({a: "alpha", b: [3,1,4], n: 42})`)).toEqual('{"a":"alpha","b":[3,1,4],"n":42}')
      expect(run(`String(["abc", 3.14159, false, true, undefined])`)).toEqual('["abc",3.14159,false,true,null]')
    })
    test('Boolean()', () => {
      expect(run(`Boolean(42)`)).toEqual(true)
      expect(run(`Boolean(0)`)).toEqual(false)
      expect(run(`Boolean("abc")`)).toEqual(true)
      expect(run(`Boolean("")`)).toEqual(false)
      expect(run(`Boolean(true)`)).toEqual(true)
      expect(run(`Boolean(false)`)).toEqual(false)
      expect(run(`Boolean(undefined)`)).toEqual(false)
      expect(run(`Boolean({})`)).toEqual(true)
      expect(run(`Boolean([])`)).toEqual(true)
    })
    test('Number()', () => {
      expect(run(`Number(42)`)).toEqual(42)
      expect(run(`Number(0)`)).toEqual(0)
      expect(run(`Number("42")`)).toEqual(42)
      expect(run(`Number("abc")`)).toEqual(NaN)
      expect(run(`Number(true)`)).toEqual(1)
      expect(run(`Number(false)`)).toEqual(0)
      expect(run(`Number(undefined)`)).toEqual(NaN)
      expect(run(`Number({})`)).toEqual(NaN)
      expect(run(`Number([])`)).toEqual(NaN)
    })
  })
  describe('console.log', () => {
    const runLog = (input: string) => {
      const lines: unknown[] = []
      const result = Septima.run(input, { onSink: () => undefined, consoleLog: u => lines.push(u) })
      return { lines, result }
    }
    test('prints its input', () => {
      expect(runLog(`console.log(2*2*2*2)`).lines).toEqual(['16'])
      expect(runLog(`console.log({a: 1, b: 2, c: ['d', 'e']})`).lines).toEqual(['{"a":1,"b":2,"c":["d","e"]}'])
    })
    test('a program can have multiple console.log() calls', () => {
      expect(runLog(`["red", "green", "blue"].map(at => console.log(at))`).lines).toEqual([
        '"red"',
        '"green"',
        '"blue"',
      ])
    })
    test('returns its input', () => {
      expect(runLog(`32*console.log(8)`)).toEqual({
        result: 256,
        lines: ['8'],
      })
    })
  })
  describe(`JSON.parse`, () => {
    test('parses a string', () => {
      expect(run(`JSON.parse('{"a": 1, "b": "beta"}')`)).toEqual({ a: 1, b: 'beta' })
    })
    test('roundtrips a value that was converted to JSON', () => {
      expect(run(`JSON.parse(String({"a": 1, "b": "beta", c: {arr: [100, 200]}}))`)).toEqual({
        a: 1,
        b: 'beta',
        c: { arr: [100, 200] },
      })
    })
    test('keeps non-string as-is', () => {
      expect(run(`JSON.parse(5000)`)).toEqual(5000)
    })
  })
  describe('hash224', () => {
    const hashOf = (u: unknown) => crypto.createHash('sha224').update(JSON.stringify(u)).digest('hex')
    test('can compute hash values of strings', () => {
      expect(run(`crypto.hash224('A')`)).toEqual(hashOf('A'))
    })
    test('can compute hash values of complex objects', () => {
      expect(run(`crypto.hash224({a: 1, b: [{x: 'X'}, ["Y"]]})`)).toEqual(hashOf({ a: 1, b: [{ x: 'X' }, ['Y']] }))
    })
    test('the hash changes when the input changes', () => {
      expect(run(`crypto.hash224(110002)`)).toEqual(hashOf(110002))
      expect(run(`crypto.hash224(110003)`)).toEqual(hashOf(110003))
      // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
      const [h1, h2] = run(`[crypto.hash224(110002), crypto.hash224(110003)]`) as string[]
      expect(h1).not.toEqual(h2)
    })
  })
  describe('throw', () => {
    test('it raises an error that is propagated all the way out', () => {
      expect(() => run(`throw "bo" + "om"`)).toThrowError(
        `"boom" when evaluating:\n` + `  at (<inline>:1:8..16) bo" + "om\n` + `  at (<inline>:1:8..16) bo" + "om`,
      )
    })
    test('the error message contains a septima stack trace that reflects the entire call chain', () => {
      expect(() => run(`let g = (n) => throw "n=" + n;\nlet f = (n) => n > 0 ? f(n-1) : g(n);\nf(3)`)).toThrowError(
        `"n=0" when evaluating:\n` +
          `  at (<inline>:1:1..3:4) let g = (n) => throw \"n=\" + n;...\n` +
          `  at (<inline>:1:1..3:4) let g = (n) => throw \"n=\" + n;...\n` +
          `  at (<inline>:3:1..4) f(3)\n` +
          `  at (<inline>:2:16..36) n > 0 ? f(n-1) : g(n)\n` +
          `  at (<inline>:2:24..29) f(n-1)\n` +
          `  at (<inline>:2:16..36) n > 0 ? f(n-1) : g(n)\n` +
          `  at (<inline>:2:24..29) f(n-1)\n` +
          `  at (<inline>:2:16..36) n > 0 ? f(n-1) : g(n)\n` +
          `  at (<inline>:2:24..29) f(n-1)\n` +
          `  at (<inline>:2:16..36) n > 0 ? f(n-1) : g(n)\n` +
          `  at (<inline>:2:33..36) g(n)\n` +
          `  at (<inline>:1:23..29) n=" + n`,
      )
    })
  })
  test.todo('support file names in locations')
  test.todo('string interpolation via `foo` strings')
  test.todo('optional type annotations?')
  test.todo('allow redundant commas')
  test.todo('left associativity of +/-')
  test.todo('comparison of arrays')
  test.todo('comparison of lambdas?')
  test.todo('"abcdef"[1] == "b"')
  test.todo('an object literal cannot have a repeated attribute name that')
  test.todo('quoting of a ticks inside a string')
  test.todo('number in scientific notation')
  test.todo('number methods')
  test.todo('drop the fun () notation and use just arrow functions')
  test.todo('proper internal representation of arrow function, in particular: show(), span()')
  test.todo('sink sinkifies arrays and objects it is stored at')
  test.todo('{foo}')
})
