import * as cdl from '../src/cdl'

describe('cdl', () => {
  test('basics', () => {
    expect(cdl.run(`5`)).toEqual(5)
    expect(() => cdl.run(`6 6`)).toThrowError(`Loitering input at position 2: <6>`)
    expect(cdl.run(`3.14`)).toEqual(3.14)
  })

  test.todo('error value/exception')

  test('booleans', () => {
    expect(cdl.run(`true`)).toEqual(true)
    expect(cdl.run(`false`)).toEqual(false)
    expect(cdl.run(`!true`)).toEqual(false)
    expect(cdl.run(`!false`)).toEqual(true)
    expect(cdl.run(`!!true`)).toEqual(true)
    expect(cdl.run(`!!false`)).toEqual(false)

    expect(cdl.run(`true||true`)).toEqual(true)
    expect(cdl.run(`true||false`)).toEqual(true)
    expect(cdl.run(`false||true`)).toEqual(true)
    expect(cdl.run(`false||false`)).toEqual(false)

    expect(cdl.run(`true && true`)).toEqual(true)
    expect(cdl.run(`true && false`)).toEqual(false)
    expect(cdl.run(`false && true`)).toEqual(false)
    expect(cdl.run(`false && false`)).toEqual(false)
  })

  test('arithmetics', () => {
    expect(cdl.run(`8*2`)).toEqual(16)
    expect(cdl.run(`3+1`)).toEqual(4)
    expect(cdl.run(`20-3`)).toEqual(17)
    expect(cdl.run(`48/6`)).toEqual(8)
    expect(cdl.run(`(1+4)*6`)).toEqual(30)
    expect(cdl.run(`1+4*6`)).toEqual(25)
    expect(cdl.run(`20%6`)).toEqual(2)
    expect(cdl.run(`20%8`)).toEqual(4)
    expect(cdl.run(`40%15`)).toEqual(10)
    expect(cdl.run(`6**3`)).toEqual(216)
    expect(cdl.run(`6**4`)).toEqual(1296)
    expect(cdl.run(`2*3**4`)).toEqual(162)
    expect(cdl.run(`(2*3)**4`)).toEqual(1296)

    expect(() => cdl.run(`!5`)).toThrowError(`value type error: expected bool but found 5`)
    expect(() => cdl.run(`!0`)).toThrowError(`value type error: expected bool but found 0`)
    expect(() => cdl.run(`!!0`)).toThrowError(`value type error: expected bool but found 0`)
    expect(() => cdl.run(`!!4`)).toThrowError(`value type error: expected bool but found 4`)
  })

  test('equality', () => {
    expect(cdl.run(`3==4`)).toEqual(false)
    expect(cdl.run(`3==3`)).toEqual(true)
    expect(cdl.run(`3!=4`)).toEqual(true)
    expect(cdl.run(`3!=3`)).toEqual(false)
  })

  test('comparison', () => {
    expect(cdl.run(`3>2`)).toEqual(true)
    expect(cdl.run(`3>3`)).toEqual(false)
    expect(cdl.run(`3>4`)).toEqual(false)

    expect(cdl.run(`3>=2`)).toEqual(true)
    expect(cdl.run(`3>=3`)).toEqual(true)
    expect(cdl.run(`3>=4`)).toEqual(false)

    expect(cdl.run(`3<=2`)).toEqual(false)
    expect(cdl.run(`3<=3`)).toEqual(true)
    expect(cdl.run(`3<=4`)).toEqual(true)

    expect(cdl.run(`3<2`)).toEqual(false)
    expect(cdl.run(`3<3`)).toEqual(false)
    expect(cdl.run(`3<4`)).toEqual(true)
  })

  test('combined arithmetics and logical expressions', () => {
    expect(cdl.run(`(5 + 3 > 6) && (10*20 > 150)`)).toEqual(true)
    expect(cdl.run(`(5 + 3 > 9) && (10*20 > 150)`)).toEqual(false)
    expect(cdl.run(`(5 + 3 > 6) && (10*20 > 201)`)).toEqual(false)
    expect(cdl.run(`(5 + 3 > 9) && (10*20 > 201)`)).toEqual(false)
  })

  test('the rhs of a logical-or expression is evaluated only if lhs is false', () => {
    expect(cdl.run(`true || x`)).toEqual(true)
    expect(() => cdl.run(`false || x`)).toThrowError('Symbol x was not found')
  })
  test('the rhs of a logical-and expression is evaluated only if lhs is true', () => {
    expect(cdl.run(`false && x`)).toEqual(false)
    expect(() => cdl.run(`true && x`)).toThrowError('Symbol x was not found')
  })

  test('eats whitespace', () => {
    expect(cdl.run(`    8 * 2  `)).toEqual(16)
    expect(cdl.run(`3 + 1`)).toEqual(4)
    expect(cdl.run(`20 - 3`)).toEqual(17)
    expect(cdl.run(`48 /     6`)).toEqual(8)
    expect(cdl.run(`(1 + 4 ) *7`)).toEqual(35)
  })

  test('unary expressions', () => {
    expect(cdl.run(`-7`)).toEqual(-7)
    expect(cdl.run(`3+-7`)).toEqual(-4)
    expect(cdl.run(`3*+7`)).toEqual(21)
    expect(cdl.run(`3*-7`)).toEqual(-21)
    expect(cdl.run(`-3*-7`)).toEqual(21)
    expect(cdl.run(`3 + -7`)).toEqual(-4)
    expect(cdl.run(`3 * +7`)).toEqual(21)
    expect(cdl.run(`3 * -7`)).toEqual(-21)
    expect(cdl.run(`-3 * -7`)).toEqual(21)
  })

  describe('strings', () => {
    test('can be specified via the double-quotes notation', () => {
      expect(cdl.run(`""`)).toEqual('')
      expect(cdl.run(`"ab"`)).toEqual('ab')
      expect(cdl.run(`"ab" + "cd"`)).toEqual('abcd')
    })
    test('can be specified via the single-quotes notation', () => {
      expect(cdl.run(`''`)).toEqual('')
      expect(cdl.run(`'ab'`)).toEqual('ab')
      expect(cdl.run(`'ab' + 'cd'`)).toEqual('abcd')
    })
    test('does not trim leading/trailing whitespace', () => {
      expect(cdl.run(`' ab'`)).toEqual(' ab')
      expect(cdl.run(`'ab '`)).toEqual('ab ')
      expect(cdl.run(`'   '`)).toEqual('   ')
      expect(cdl.run(`'  ab  '`)).toEqual('  ab  ')
      expect(cdl.run(`" ab"`)).toEqual(' ab')
      expect(cdl.run(`"ab "`)).toEqual('ab ')
      expect(cdl.run(`"   "`)).toEqual('   ')
      expect(cdl.run(`"  ab  "`)).toEqual('  ab  ')
    })
    test('supports string methods', () => {
      expect(cdl.run(`'bigbird'.substring(3, 7)`)).toEqual('bird')
      expect(cdl.run(`'bigbird'.indexOf('g')`)).toEqual(2)
      expect(cdl.run(`'ab-cde-fghi-jkl'.split('-')`)).toEqual(['ab', 'cde', 'fghi', 'jkl'])
      expect(cdl.run(`let s = '  ab   cd     '; [s.trimStart(), s.trimEnd(), s.trim()]`)).toEqual([
        'ab   cd     ',
        '  ab   cd',
        'ab   cd',
      ])
    })
    test('supports optional arguments of string methods', () => {
      expect(cdl.run(`'bigbird'.substring(5)`)).toEqual('rd')
    })
  })
  describe('let', () => {
    test('binds values to variables', () => {
      expect(cdl.run(`let x = 5; x+3`)).toEqual(8)
      expect(cdl.run(`let x = 5; let y = 20; x*y+4`)).toEqual(104)
    })
    test('fails if the variable was not defined', () => {
      expect(() => cdl.run(`let x = 5; x+y`)).toThrowError('Symbol y was not found')
    })

    test('parenthsized expression can have let defintions', () => {
      expect(
        cdl.run(`
        let x = 5; 
        let y = 20; 
        
        x*y+(let n = 4; n*7)`),
      ).toEqual(128)
      expect(
        cdl.run(`
        let x = 5; 
        let y = 20; 
        
        x*y+(let n = 4; let o = 7; o*n)`),
      ).toEqual(128)
    })

    test('inner expressions can access variables from enclosing scopes', () => {
      expect(
        cdl.run(`
        let x = 5; 
        let y = 20; 
        
        x*y+(let n = 4; n+x)`),
      ).toEqual(109)
    })
    test('definitions from inner scopes overshadow definitions from outer scopes', () => {
      expect(
        cdl.run(`
        let x = 5; 
        let y = 20; 
        
        x*y+(let n = 4; let x = 200; n+x)`),
      ).toEqual(304)
    })
    test('the body of a definition can reference an earlier definition from the same scope', () => {
      expect(cdl.run(`let x = 10;  let y = x*2;  y*2`)).toEqual(40)
    })
    test('the body of a definition cannot reference a latter definition from the same scope', () => {
      expect(() => cdl.run(`let y = x*2; let x = 10;  y*2`)).toThrowError(`Symbol x was not found`)
    })
    test('the body of a definition cannot reference itself', () => {
      expect(() => cdl.run(`let x = 10;  let y = if (x > 0) y else x; y*2`)).toThrowError(`Unresolved definition: y`)
    })
    test('uses lexical scoping (and not dynamic scoping)', () => {
      const actual = cdl.run(`let x = (let a = 1; a+1);  let y = (let a=100; x+1); y`)
      expect(actual).toEqual(3)
    })
    test('definitions go out of scope', () => {
      expect(() => cdl.run(`let x = (let a = 1; a+1); a+100`)).toThrowError('Symbol a was not found')
    })
  })

  describe('arrays', () => {
    test('array literals are specified via the enclosing brackets notation ([])', () => {
      expect(cdl.run(`["ab", 5]`)).toEqual(['ab', 5])
      expect(cdl.run(`[]`)).toEqual([])
    })
    test('individual elements of an array can be accessed via the [<index>] notation', () => {
      expect(cdl.run(`let a = ['sun', 'mon', 'tue', 'wed']; a[1]`)).toEqual('mon')
    })
    test('the <index> value at the [<index>] notation can be a computed value', () => {
      expect(cdl.run(`let a = ['sun', 'mon', 'tue', 'wed']; let f = fun(n) n-5; [a[3-1], a[18/6], a[f(5)]]`)).toEqual([
        'tue',
        'wed',
        'sun',
      ])
    })
  })

  describe('objects', () => {
    describe('literals', () => {
      test('are specified via JSON format', () => {
        expect(cdl.run(`{}`)).toEqual({})
        expect(cdl.run(`{a: 1}`)).toEqual({ a: 1 })
        expect(cdl.run(`{a: 1, b: 2}`)).toEqual({ a: 1, b: 2 })
        expect(cdl.run(`{a: "A", b: "B", c: "CCC"}`)).toEqual({ a: 'A', b: 'B', c: 'CCC' })
      })
      test('supports computed attributes names via the [<expression>]: <value> notation', () => {
        expect(cdl.run(`{["a" + 'b']: 'a-and-b'}`)).toEqual({ ab: 'a-and-b' })
      })
    })
    describe('attributes', () => {
      test('can be accessed via the .<ident> notation', () => {
        expect(cdl.run(`let x = {a: 3, b: 4}; x.a`)).toEqual(3)
        expect(cdl.run(`let x = {a: 3, b: 4}; x.a * x.b`)).toEqual(12)
        expect(
          cdl.run(`let x = {a: 3, b: {x: {Jan: 1, Feb: 2, May: 5}, y: 300}}; [x.b.x.Jan, x.b.x.May, x.b.y]`),
        ).toEqual([1, 5, 300])
        expect(cdl.run(`let x = {a: 3, calendar: ["A"] }; x.calendar`)).toEqual(['A'])
        expect(
          cdl.run(
            `let x = {a: 3, calendar: {months: { Jan: 1, Feb: 2, May: 5}, days: ["Mon", "Tue", "Wed" ] } }; [x.calendar.months, x.calendar.days]`,
          ),
        ).toEqual([{ Jan: 1, Feb: 2, May: 5 }, ['Mon', 'Tue', 'Wed']])
      })
      test('can be accessed via the [<name>] notation', () => {
        expect(cdl.run(`let x = {a: 3, b: 4}; x['a']`)).toEqual(3)
        expect(cdl.run(`let x = {a: 3, b: 4}; [x['a'], x["b"]]`)).toEqual([3, 4])
        expect(cdl.run(`let x = {a: 3, b: {x: {Jan: 1, Feb: 2, May: 5}, y: 300}}; x["b"]['x']["May"]`)).toEqual(5)
      })
      test('supports chains of attribute accesses mixing the .<ident> and the [<name>] notations', () => {
        expect(cdl.run(`let o = {b: {x: {M: 5}}}; [o["b"].x["M"], o.b["x"].M, o.b.x["M"]]`)).toEqual([5, 5, 5])
      })
      test('the <name> value at the [<name>] notation can be a computed value', () => {
        expect(
          cdl.run(`let q = fun (x) x + "eb"; let o = {Jan: 1, Feb: 2, May: 5}; [o["Ja" + 'n'], o[q('F')]]`),
        ).toEqual([1, 2])
      })
    })
  })

  describe('spread operator on objects', () => {
    test('shallow copies an object into an object literal', () => {
      expect(cdl.run(`let o = {a: 1, b: 2}; {...o}`)).toEqual({ a: 1, b: 2 })
    })
    test('can be combined with hard-coded (literal) attributes', () => {
      expect(cdl.run(`let o = {a: 1}; {...o, b: 2}`)).toEqual({ a: 1, b: 2 })
      expect(cdl.run(`let o = {b: 2}; {...o, a: 1, ...o}`)).toEqual({ a: 1, b: 2 })
    })
    test('can be used multiple times inside a single object literal', () => {
      expect(cdl.run(`let o1 = {b: 2}; let o2 = {c: 3}; {a: 1, ...o1, ...o2, d: 4}`)).toEqual({
        a: 1,
        b: 2,
        c: 3,
        d: 4,
      })
    })
    test('overrides attributes to its left', () => {
      expect(cdl.run(`let o = {b: 2}; {a: 100, b: 200, c: 300, ...o}`)).toEqual({ a: 100, b: 2, c: 300 })
    })
    test('overridden by attributes to its right', () => {
      expect(cdl.run(`let o = {a: 1, b: 2, c: 3}; {...o, b: 200}`)).toEqual({ a: 1, b: 200, c: 3 })
    })
    test('can be mixed with computed attribute names', () => {
      expect(cdl.run(`let o = {ab: 'anteater'}; {...o, ['c' + 'd']: 'cat'}`)).toEqual({ ab: 'anteater', cd: 'cat' })
    })
    test('errors if applied to a non-object value', () => {
      expect(() => cdl.run(`let o = ['a']; {...o}`)).toThrowError(`value type error: expected obj but found ["a"]`)
      expect(() => cdl.run(`let o = true; {...o}`)).toThrowError('value type error: expected obj but found true')
      expect(() => cdl.run(`let o = 5; {...o}`)).toThrowError('value type error: expected obj but found 5')
      expect(() => cdl.run(`let o = 'a'; {...o}`)).toThrowError('value type error: expected obj but found "a"')
    })
  })

  describe('if', () => {
    test('returns the value of the first branch if the condition is true', () => {
      expect(cdl.run(`if (4 > 3) 200 else -100`)).toEqual(200)
    })
    test('evaluates the first branch only if the condition is true', () => {
      expect(() => cdl.run(`if (true) x else -100`)).toThrowError('Symbol x was not found')
      expect(cdl.run(`if (false) x else -100`)).toEqual(-100)
    })
    test('returns the value of the second branch if the condition is false', () => {
      expect(cdl.run(`if (4 < 3) 200 else -100`)).toEqual(-100)
    })
    test('evaluates the second branch only if the condition is false', () => {
      expect(() => cdl.run(`if (false) 200 else x`)).toThrowError('Symbol x was not found')
      expect(cdl.run(`if (true) 200 else x`)).toEqual(200)
    })
    test('yells if conditions is not boolean', () => {
      expect(() => cdl.run(`if (5+8) 200 else -100`)).toThrowError('value type error: expected bool but found 13')
    })
  })

  describe('lambda expressions', () => {
    test('binds the value of the actual arg to the formal arg', () => {
      expect(cdl.run(`(fun(a) 2*a)(3)`)).toEqual(6)
      expect(cdl.run(`(fun(a, b) a*a-b*b)(3,4)`)).toEqual(-7)
      expect(cdl.run(`(fun(a, b) a*a-b*b)(4,3)`)).toEqual(7)
    })
    test('can be stored in a variable', () => {
      expect(cdl.run(`let triple = (fun(a) 3*a); triple(100) - triple(90)`)).toEqual(30)
      expect(cdl.run(`let triple = fun(a) 3*a; triple(100) - triple(90)`)).toEqual(30)
    })
    test('can have no args', () => {
      expect(cdl.run(`let pi = fun() 3.14; 2*pi()`)).toEqual(6.28)
      expect(cdl.run(`(fun() 3.14)()*2`)).toEqual(6.28)
    })
    test('error on arg list mismatch', () => {
      expect(() => cdl.run(`let quadSum = fun(a,b,c,d) a+b+c+d; quadSum(4,8,2)`)).toThrowError(
        'Arg list length mismatch: expected 4 but got 3',
      )
      expect(cdl.run(`let quadSum = fun(a,b,c,d) a+b+c+d; quadSum(4,8,2,6)`)).toEqual(20)
    })
    test('can be recursive', () => {
      expect(cdl.run(`let factorial = fun(n) if (n > 0) n*factorial(n-1) else 1; factorial(6)`)).toEqual(720)
      expect(cdl.run(`let gcd = fun(a, b) if (b == 0) a else gcd(b, a % b); [gcd(24, 60), gcd(1071, 462)]`)).toEqual([
        12, 21,
      ])
    })
    test('can access definitions from the enclosing scope', () => {
      expect(cdl.run(`let a = 1; (let inc = fun(n) n+a; inc(2))`)).toEqual(3)
      expect(
        cdl.run(`let by2 = fun(x) x*2; (let by10 = (let by5 = fun(x) x*5; fun(x) by2(by5(x))); by10(20))`),
      ).toEqual(200)
    })
    test('only lexical scope is considered when looking up a definition', () => {
      expect(cdl.run(`let a = 1; let inc = fun(n) n+a; (let a = 100; inc(2))`)).toEqual(3)
    })
    test('can return another lambda expression (a-la currying)', () => {
      expect(cdl.run(`let sum = fun(a) fun(b,c) a+b+c; sum(1)(600,20)`)).toEqual(621)
      expect(cdl.run(`let sum = fun(a) fun(b) fun(c) a+b+c; sum(1)(600)(20)`)).toEqual(621)
      expect(cdl.run(`let sum = fun(a) fun(b,c) a+b+c; let plusOne = sum(1); plusOne(600,20)`)).toEqual(621)
      expect(cdl.run(`let sum = fun(a) fun(b) fun(c) a+b+c; let plusOne = sum(1); plusOne(600)(20)`)).toEqual(621)
    })
  })

  test.todo('string methods')
  test.todo('number methods')
  describe('array methods', () => {
    test('concat', () => {
      expect(cdl.run(`['foo', 'bar', 'goo'].concat(['zoo', 'poo'])`)).toEqual(['foo', 'bar', 'goo', 'zoo', 'poo'])
    })
    test('every', () => {
      expect(cdl.run(`["", 'x', 'xx'].every(fun (item, i) item.length == i)`)).toEqual(true)
      expect(cdl.run(`["", 'yy', 'zz'].every(fun (item, i) item.length == i)`)).toEqual(false)
      expect(
        cdl.run(`let cb = fun (item, i, a) item == a[(a.length - i) - 1]; [[2, 7, 2].every(cb), [2, 7, 7].every(cb)]`),
      ).toEqual([true, false])
    })
    test('filter', () => {
      expect(cdl.run(`['foo', 'bar', 'goo'].filter(fun (item) item.endsWith('oo'))`)).toEqual(['foo', 'goo'])
      expect(cdl.run(`['a', 'b', 'c', 'd'].filter(fun (item, i) i % 2 == 1)`)).toEqual(['b', 'd'])
      expect(cdl.run(`[8, 8, 2, 2, 2, 7].filter(fun (x, i, a) x == a[(i + 1) % a.length])`)).toEqual([8, 2, 2])
    })
    test('find', () => {
      expect(cdl.run(`[10, 20, 30, 40].find(fun (item, i) item + i == 21)`)).toEqual(20)
      expect(cdl.run(`[8, 3, 7, 7, 6, 9].find(fun (x, i, a) x == a[a.length - (i+1)])`)).toEqual(7)
    })
    test('findIndex', () => {
      expect(cdl.run(`[10, 20, 30, 40].findIndex(fun (item, i) item + i == 32)`)).toEqual(2)
      expect(cdl.run(`[8, 3, 7, 7, 6, 9].findIndex(fun (x, i, a) x == a[a.length - (i+1)])`)).toEqual(2)
    })
    test('flatMap', () => {
      expect(cdl.run(`['Columbia', 'Eagle'].flatMap(fun (x) [x, x.length])`)).toEqual(['Columbia', 8, 'Eagle', 5])
      expect(cdl.run(`[6,7,9].flatMap(fun (x,i) if (i % 2 == 0) [x, x/3] else [])`)).toEqual([6, 2, 9, 3])
      expect(cdl.run(`[2,1,6,5,9,8].flatMap(fun (x,i,a) if (i % 2 == 1) [x, a[i-1]] else [])`)).toEqual([
        1, 2, 5, 6, 8, 9,
      ])
    })
    test('map', () => {
      expect(cdl.run(`['a', 'b'].map(fun (item, i) item + ':' + i)`)).toEqual(['a:0', 'b:1'])
      expect(cdl.run(`['a', 'b', 'p', 'q'].map(fun (x, i, a) x + a[a.length - (i+1)])`)).toEqual([
        'aq',
        'bp',
        'pb',
        'qa',
      ])
    })
    test('reduce', () => {
      expect(cdl.run(`['a','b','c','d','e'].reduce(fun (w, x, i) if (i % 2 == 0) w+x else w, '')`)).toEqual('ace')
      expect(cdl.run(`[['w',2], ['x',0], ['y',1]].reduce(fun (w, x, i, a) w+a[x[1]][0], '')`)).toEqual('ywx')
    })
    test('reduceRight', () => {
      expect(cdl.run(`['a','b','c','d','e'].reduceRight(fun (w, x, i) if (i % 2 == 0) w+x else w, '')`)).toEqual('eca')
      expect(cdl.run(`[['w',2], ['x',0], ['y',1]].reduceRight(fun (w, x, i, a) w+a[x[1]][0], '')`)).toEqual('xwy')
    })
    test('some', () => {
      expect(cdl.run(`['foo', 'bar', 'goo'].some(fun (item) item.endsWith('oo'))`)).toEqual(true)
      expect(cdl.run(`['foo', 'bar', 'goo'].some(fun (item) item.endsWith('pp'))`)).toEqual(false)
      expect(cdl.run(`['a', 'xyz', 'bc'].some(fun (item, i) i == item.length)`)).toEqual(true)
      expect(cdl.run(`[8, 3, 7, 7, 6, 9].some(fun (x, i, a) x == a[a.length - (i+1)])`)).toEqual(true)
    })
  })
  describe('Object.keys()', () => {
    test('returns names of all attributes of the given object', () => {
      expect(cdl.run(`Object.keys({a: 1, b: 2, w: 30})`)).toEqual(['a', 'b', 'w'])
      // expect(cdl.run(`Object.entries({a: 1, b: 2, w: 30})`)).toEqual([['a', 1], ['b', 2], ['w', 30]])
    })
    test('fails if applied to a non-object value', () => {
      expect(() => cdl.run(`Object.keys('a')`)).toThrowError('value type error: expected obj but found "a"')
      expect(() => cdl.run(`Object.keys(5)`)).toThrowError('value type error: expected obj but found 5')
      expect(() => cdl.run(`Object.keys(false)`)).toThrowError('value type error: expected obj but found false')
      expect(() => cdl.run(`Object.keys(['a'])`)).toThrowError('value type error: expected obj but found ["a"]')
      expect(() => cdl.run(`Object.keys(fun () 5)`)).toThrowError('value type error: expected obj but found "fun () 5"')
    })
  })
  describe('Object.entries()', () => {
    test('returns a [key, value] pair for each attribute of the given object', () => {
      expect(cdl.run(`Object.entries({a: 1, b: 2, w: 30})`)).toEqual([
        ['a', 1],
        ['b', 2],
        ['w', 30],
      ])
    })
    test('fails if applied to a non-object value', () => {
      expect(() => cdl.run(`Object.entries('a')`)).toThrowError('type error: expected obj but found "a"')
      expect(() => cdl.run(`Object.entries(5)`)).toThrowError('type error: expected obj but found 5')
      expect(() => cdl.run(`Object.entries(false)`)).toThrowError('type error: expected obj but found false')
      expect(() => cdl.run(`Object.entries(['a'])`)).toThrowError('type error: expected obj but found ["a"]')
      expect(() => cdl.run(`Object.entries(fun () 5)`)).toThrowError('type error: expected obj but found "fun () 5"')
    })
  })
  describe('Object.fromEntries()', () => {
    test('constructs an object from a list of [key, value] pairs describing its attributes', () => {
      expect(cdl.run(`Object.fromEntries([['a', 1], ['b', 2], ['w', 30], ['y', 'yoo'], ['z', true]])`)).toEqual({
        a: 1,
        b: 2,
        w: 30,
        y: 'yoo',
        z: true,
      })
    })
    test('fails if applied to a non-array value', () => {
      expect(() => cdl.run(`Object.fromEntries('a')`)).toThrowError('type error: expected arr but found "a"')
      expect(() => cdl.run(`Object.fromEntries(5)`)).toThrowError('type error: expected arr but found 5')
      expect(() => cdl.run(`Object.fromEntries(false)`)).toThrowError('type error: expected arr but found false')
      expect(() => cdl.run(`Object.fromEntries({x: 1})`)).toThrowError('type error: expected arr but found {"x":1}')
      expect(() => cdl.run(`Object.fromEntries(fun () 5)`)).toThrowError(
        'type error: expected arr but found "fun () 5"',
      )
    })
    test('the input array must be an array of pairs', () => {
      expect(() => cdl.run(`Object.fromEntries([['a', 1], ['b']])`)).toThrowError(
        'each entry must be a [key, value] pair',
      )
    })
    test('the first element in each pair must be a string', () => {
      expect(() => cdl.run(`Object.fromEntries([[1, 'a']])`)).toThrowError('value type error: expected str but found 1')
    })
  })
  describe('comments', () => {
    test(`anything from '//' up to the end-of-line is ignored`, () => {
      expect(
        cdl.run(`
        1 + 20 + // 300
        4000`),
      ).toEqual(4021)
    })
    test(`allow consecutive lines which are all commented out`, () => {
      expect(
        cdl.run(`
        1 + 
        // 20 + 
        // 300 +
        // 4000 +
        50000`),
      ).toEqual(50001)
    })
    test(`a comment inside a comment has no effect`, () => {
      expect(
        cdl.run(`
        1 + 
        // 20 +  // 300 +
        4000`),
      ).toEqual(4001)
    })
  })
  test.todo('error messages to include expression-trace')
  test.todo('syntax errors')
  test.todo('comparison of arrays')
  test.todo('comparison of lambdas?')
  test.todo('deep equality of objects')
  test.todo('spread operator of arrays')
  test.todo('"abcdef"[1] == "b"')
  test.todo('Arr.find() returns undefined - think how to go about it')
  test.todo('x.y can return undefined (e.g., if x = {z: 1}) - think how to go about it')
  test.todo('array index out of bounds')
  test.todo('an object literal cannot have a repeated attribute name that')
  test.todo('quoting of a ticks inside a string')
  test.todo('number in scientific notation')
  test.todo('API access to evaluation trace')
})
