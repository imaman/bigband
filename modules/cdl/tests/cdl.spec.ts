import { Cdl } from '../src/cdl'

function run(input: string) {
  return new Cdl(input).run().export()
}
describe('cdl', () => {
  test('basics', () => {
    expect(run(`5`)).toEqual(5)
    expect(() => run(`6 6`)).toThrowError(`Loitering input at position 2: <6>`)
    expect(run(`3.14`)).toEqual(3.14)
  })

  test.todo('error value/exception')

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

    expect(() => run(`!5`)).toThrowError(`value type error: expected bool but found 5`)
    expect(() => run(`!0`)).toThrowError(`value type error: expected bool but found 0`)
    expect(() => run(`!!0`)).toThrowError(`value type error: expected bool but found 0`)
    expect(() => run(`!!4`)).toThrowError(`value type error: expected bool but found 4`)
  })

  test('error message specifies the location in the file', () => {
    expect(() => run(`7+\n6+\n5+4+3+!2`)).toThrowError(`(Ln 3,Col 7) value type error: expected bool but found 2`)
  })

  test('equality', () => {
    expect(run(`3==4`)).toEqual(false)
    expect(run(`3==3`)).toEqual(true)
    expect(run(`3!=4`)).toEqual(true)
    expect(run(`3!=3`)).toEqual(false)
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

  describe('arrays', () => {
    test('array literals are specified via the enclosing brackets notation ([])', () => {
      expect(run(`["ab", 5]`)).toEqual(['ab', 5])
      expect(run(`[]`)).toEqual([])
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
  })

  describe('objects', () => {
    describe('literals', () => {
      test('are specified via JSON format', () => {
        expect(run(`{}`)).toEqual({})
        expect(run(`{a: 1}`)).toEqual({ a: 1 })
        expect(run(`{a: 1, b: 2}`)).toEqual({ a: 1, b: 2 })
        expect(run(`{a: "A", b: "B", c: "CCC"}`)).toEqual({ a: 'A', b: 'B', c: 'CCC' })
      })
      test('supports computed attributes names via the [<expression>]: <value> notation', () => {
        expect(run(`{["a" + 'b']: 'a-and-b'}`)).toEqual({ ab: 'a-and-b' })
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
    test('can have no args', () => {
      expect(run(`let pi = fun() 3.14; 2*pi()`)).toEqual(6.28)
      expect(run(`(fun() 3.14)()*2`)).toEqual(6.28)
    })
    test('error on arg list mismatch', () => {
      expect(() => run(`let quadSum = fun(a,b,c,d) a+b+c+d; quadSum(4,8,2)`)).toThrowError(
        'Arg list length mismatch: expected 4 but got 3',
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
        '  at (1:1) let d = fun(x1) x2; let c = fun(x) d(x); let b = fun (x) c(x); let a = fun(x) b(...',
        '  at (1:85) a(5)',
        '  at (1:79) b(x)',
        '  at (1:58) c(x)',
        '  at (1:36) d(x)',
        '  at (1:17) x2',
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
  })

  describe('sink', () => {
    test('specified via the "sink" literal', () => {
      expect(run(`sink`)).toEqual(null)
    })
    test('an expression involving a sink evaluates to sink', () => {
      expect(run(`5+8+9+sink+20+30`)).toEqual(null)
      expect(run(`let x = sink; 5+8+9+x+20+30`)).toEqual(null)
      expect(run(`let f = fun (a) if (a > 0) a else sink; 2+f(-1)+4`)).toEqual(null)
      expect(run(`let f = fun (a) if (a > 0) a else sink; 2+f(3)+4`)).toEqual(9)
    })
    test('an array can hold a sink without becoming a sink itself', () => {
      expect(run(`let f = fun (a) if (a > 0) a else sink; [f(1), f(-1), f(8)]`)).toEqual([1, null, 8])
    })
    test('an object can hold a sink without becoming a sink itself', () => {
      expect(run(`{a: 5, b: sink, c: 20}`)).toEqual({ a: 5, b: null, c: 20 })
    })
    test('an if() expression an have a sink positive/negative branch without becoming a sink itself', () => {
      expect(run(`if (true) 5 else sink`)).toEqual(5)
      expect(run(`if (false) sink else 5`)).toEqual(5)
    })
    test('an if() expression becomes a sink itself if the branch dictated by the condition evaluates to sink', () => {
      expect(run(`if (false) 5 else sink`)).toEqual(null)
      expect(run(`if (true) sink else 5`)).toEqual(null)
    })
    test('an if() expression becomes a sink itself if the the condition expression evaluates to sink', () => {
      expect(run(`if (sink) 5 else 7`)).toEqual(null)
    })
    test('an && expression with sinks', () => {
      expect(run(`sink && false`)).toEqual(null)
      expect(run(`sink && true`)).toEqual(null)
      expect(run(`false && sink`)).toEqual(false)
      expect(run(`true && sink`)).toEqual(null)
    })
    test('an || expression with sinks', () => {
      expect(run(`sink || false`)).toEqual(null)
      expect(run(`sink || true`)).toEqual(null)
      expect(run(`false || sink`)).toEqual(null)
      expect(run(`true || sink`)).toEqual(true)
    })
    test('access to an attribute of a sink evaluates to sink', () => {
      expect(run(`sink.x`)).toEqual(null)
    })
    test('calling a sink evaluates to sink', () => {
      expect(run(`sink()`)).toEqual(null)
    })
    test('a sink compared with itself evaluates to true', () => {
      expect(run(`sink == sink`)).toEqual(true)
      expect(run(`sink != sink`)).toEqual(false)
    })
    test('a sink compared with other types evaluates to false', () => {
      expect(run(`sink == []`)).toEqual(false)
      expect(run(`sink == false`)).toEqual(false)
      expect(run(`sink == true`)).toEqual(false)
      expect(run(`sink == (fun () sink)`)).toEqual(false)
      expect(run(`sink == 0`)).toEqual(false)
      expect(run(`sink == 5`)).toEqual(false)
      expect(run(`sink == {}`)).toEqual(false)
      expect(run(`sink == ''`)).toEqual(false)
      expect(run(`sink == 'x'`)).toEqual(false)
    })
    test('errors when a sink ordered with other types', () => {
      expect(() => run(`sink < []`)).toThrowError('Cannot compare a sink value with a value of another type')
      expect(() => run(`sink < false`)).toThrowError('Cannot compare a sink value with a value of another type')
      expect(() => run(`sink < true`)).toThrowError('Cannot compare a sink value with a value of another type')
      expect(() => run(`sink < (fun () sink)`)).toThrowError('Cannot compare a sink value with a value of another type')
      expect(() => run(`sink < 0`)).toThrowError('Cannot compare a sink value with a value of another type')
      expect(() => run(`sink < 5`)).toThrowError('Cannot compare a sink value with a value of another type')
      expect(() => run(`sink < {}`)).toThrowError('Cannot compare a sink value with a value of another type')
      expect(() => run(`sink < ''`)).toThrowError('Cannot compare a sink value with a value of another type')
      expect(() => run(`sink < 'x'`)).toThrowError('Cannot compare a sink value with a value of another type')
    })
    test(`the ?? operator translates a sink into the right-hand-side`, () => {
      expect(run(`sink ?? 1`)).toEqual(1)
    })
    test(`the ?? operator retains a non-sink as-is`, () => {
      expect(run(`0 ?? 1`)).toEqual(0)
    })
    test(`the returned sink holds a location in the source code`, () => {
      const evalLocateSink = (s: string) => {
        const cdl = new Cdl(s)
        const v = cdl.run()
        return cdl.locate(v)
      }
      expect(evalLocateSink(`1000 + 2000 + 3000 + sink + 5000 + sink`)).toEqual({ line: 0, col: 21 })
      expect(evalLocateSink(`1000 + 2000 + 3000 + 4000 + 5000 + sink`)).toEqual({ line: 0, col: 35 })
      expect(evalLocateSink(`1000\n + 2000\n + sink\n + 4000\n + 5000\n + sink`)).toEqual({ line: 2, col: 3 })
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
    test('find returns sink if no matching element exists', () => {
      expect(run(`[3, 5, 7, 9].find(fun (x) x % 2 == 0)`)).toEqual(null)
      expect(run(`[].find(fun () true)`)).toEqual(null)
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
  describe('comments', () => {
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
  describe('evaluation stack', () => {
    test('max recursion depth', () => {
      expect(run(`let count = fun (n) if (n <= 0) 0 else 1 + count(n-1); count(330)`)).toEqual(330)
    })
  })
  test.todo('left associativity of +/-')
  test.todo('error messages to include expression-trace')
  test.todo('syntax errors')
  test.todo('comparison of arrays')
  test.todo('comparison of lambdas?')
  test.todo('deep equality of objects')
  test.todo('"abcdef"[1] == "b"')
  test.todo('x.y can return undefined (e.g., if x = {z: 1}) - think how to go about it')
  test.todo('an object literal cannot have a repeated attribute name that')
  test.todo('quoting of a ticks inside a string')
  test.todo('number in scientific notation')
  test.todo('API access to evaluation trace')
  test.todo('number methods')
})
