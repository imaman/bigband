import * as cdl from '../src/cdl'

describe('cdl', () => {
  test('basics', () => {
    expect(cdl.parse(`5`)).toEqual(5)
    expect(() => cdl.parse(`6 6`)).toThrowError(`Loitering input at position 2: <6>`)
    expect(cdl.parse(`3.14`)).toEqual(3.14)
  })

  test.todo('lazy eval of || expressions')

  test('booleans', () => {
    expect(cdl.parse(`true`)).toEqual(true)
    expect(cdl.parse(`false`)).toEqual(false)
    expect(cdl.parse(`!true`)).toEqual(false)
    expect(cdl.parse(`!false`)).toEqual(true)
    expect(cdl.parse(`!!true`)).toEqual(true)
    expect(cdl.parse(`!!false`)).toEqual(false)

    expect(cdl.parse(`true||true`)).toEqual(true)
    expect(cdl.parse(`true||false`)).toEqual(true)
    expect(cdl.parse(`false||true`)).toEqual(true)
    expect(cdl.parse(`false||false`)).toEqual(false)

    expect(cdl.parse(`true && true`)).toEqual(true)
    expect(cdl.parse(`true && false`)).toEqual(false)
    expect(cdl.parse(`false && true`)).toEqual(false)
    expect(cdl.parse(`false && false`)).toEqual(false)
  })

  test('arithmetics', () => {
    expect(cdl.parse(`8*2`)).toEqual(16)
    expect(cdl.parse(`3+1`)).toEqual(4)
    expect(cdl.parse(`20-3`)).toEqual(17)
    expect(cdl.parse(`48/6`)).toEqual(8)
    expect(cdl.parse(`(1+4)*6`)).toEqual(30)
    expect(cdl.parse(`1+4*6`)).toEqual(25)
    expect(cdl.parse(`20%6`)).toEqual(2)
    expect(cdl.parse(`20%8`)).toEqual(4)
    expect(cdl.parse(`40%15`)).toEqual(10)
    expect(cdl.parse(`6**3`)).toEqual(216)
    expect(cdl.parse(`6**4`)).toEqual(1296)
    expect(cdl.parse(`2*3**4`)).toEqual(162)
    expect(cdl.parse(`(2*3)**4`)).toEqual(1296)
    expect(() => cdl.parse(`!5`)).toThrowError(`Cannot compute the logical not of a value of type num: 5`)
    expect(() => cdl.parse(`!0`)).toThrowError(`Cannot compute the logical not of a value of type num: 0`)
    expect(() => cdl.parse(`!!0`)).toThrowError(`Cannot compute the logical not of a value of type num: 0`)
    expect(() => cdl.parse(`!!4`)).toThrowError(`Cannot compute the logical not of a value of type num: 4`)
  })

  test('equality', () => {
    expect(cdl.parse(`3==4`)).toEqual(false)
    expect(cdl.parse(`3==3`)).toEqual(true)
    expect(cdl.parse(`3!=4`)).toEqual(true)
    expect(cdl.parse(`3!=3`)).toEqual(false)
  })

  test('comparison', () => {
    expect(cdl.parse(`3>2`)).toEqual(true)
    expect(cdl.parse(`3>3`)).toEqual(false)
    expect(cdl.parse(`3>4`)).toEqual(false)

    expect(cdl.parse(`3>=2`)).toEqual(true)
    expect(cdl.parse(`3>=3`)).toEqual(true)
    expect(cdl.parse(`3>=4`)).toEqual(false)

    expect(cdl.parse(`3<=2`)).toEqual(false)
    expect(cdl.parse(`3<=3`)).toEqual(true)
    expect(cdl.parse(`3<=4`)).toEqual(true)

    expect(cdl.parse(`3<2`)).toEqual(false)
    expect(cdl.parse(`3<3`)).toEqual(false)
    expect(cdl.parse(`3<4`)).toEqual(true)
  })

  test('combined arithmetics and logical expressions', () => {
    expect(cdl.parse(`(5 + 3 > 6) && (10*20 > 150)`)).toEqual(true)
    expect(cdl.parse(`(5 + 3 > 9) && (10*20 > 150)`)).toEqual(false)
    expect(cdl.parse(`(5 + 3 > 6) && (10*20 > 201)`)).toEqual(false)
    expect(cdl.parse(`(5 + 3 > 9) && (10*20 > 201)`)).toEqual(false)
  })

  test('the rhs of a logical-or expression is evaluated only if lhs is false', () => {
    expect(cdl.parse(`true || x`)).toEqual(true)
    expect(() => cdl.parse(`false || x`)).toThrowError('ymbol x was not found')
  })
  test('the rhs of a logical-and expression is evaluated only if lhs is true', () => {
    expect(cdl.parse(`false && x`)).toEqual(false)
    expect(() => cdl.parse(`true && x`)).toThrowError('ymbol x was not found')
  })

  test('eats whitespace', () => {
    expect(cdl.parse(`    8 * 2  `)).toEqual(16)
    expect(cdl.parse(`3 + 1`)).toEqual(4)
    expect(cdl.parse(`20 - 3`)).toEqual(17)
    expect(cdl.parse(`48 /     6`)).toEqual(8)
    expect(cdl.parse(`(1 + 4 ) *7`)).toEqual(35)
  })

  test('unary expressions', () => {
    expect(cdl.parse(`-7`)).toEqual(-7)
    expect(cdl.parse(`3+-7`)).toEqual(-4)
    expect(cdl.parse(`3*+7`)).toEqual(21)
    expect(cdl.parse(`3*-7`)).toEqual(-21)
    expect(cdl.parse(`-3*-7`)).toEqual(21)
    expect(cdl.parse(`3 + -7`)).toEqual(-4)
    expect(cdl.parse(`3 * +7`)).toEqual(21)
    expect(cdl.parse(`3 * -7`)).toEqual(-21)
    expect(cdl.parse(`-3 * -7`)).toEqual(21)
  })

  describe('let', () => {
    test('binds values to variables', () => {
      expect(cdl.parse(`let x = 5; x+3`)).toEqual(8)
      expect(cdl.parse(`let x = 5; let y = 20; x*y+4`)).toEqual(104)
    })
    test('fails if the variable was not defined', () => {
      expect(() => cdl.parse(`let x = 5; x+y`)).toThrowError('Symbol y was not found')
    })

    test('parenthsized expression can have let defintions', () => {
      expect(
        cdl.parse(`
        let x = 5; 
        let y = 20; 
        
        x*y+(let n = 4; n*7)`),
      ).toEqual(128)
      expect(
        cdl.parse(`
        let x = 5; 
        let y = 20; 
        
        x*y+(let n = 4; let o = 7; o*n)`),
      ).toEqual(128)
    })

    test('inner expressions can access variables from enclosing scopes', () => {
      expect(
        cdl.parse(`
        let x = 5; 
        let y = 20; 
        
        x*y+(let n = 4; n+x)`),
      ).toEqual(109)
    })
    test('definitions from inner scopes overshadow definitions from outer scopes', () => {
      expect(
        cdl.parse(`
        let x = 5; 
        let y = 20; 
        
        x*y+(let n = 4; let x = 200; n+x)`),
      ).toEqual(304)
    })
    test('the body of a definition can reference an earlier definition from the same scope', () => {
      expect(cdl.parse(`let x = 10;  let y = x*2;  y*2`)).toEqual(40)
    })
    test('the body of a definition cannot reference a latter definition from the same scope', () => {
      expect(() => cdl.parse(`let y = x*2; let x = 10;  y*2`)).toThrowError(`Symbol x was not found`)
    })
    test('uses lexical scoping (and not dynamic scoping)', () => {
      const actual = cdl.parse(`let x = (let a = 1; a+1);  let y = (let a=100; x+1); y`)
      expect(actual).toEqual(3)
    })
    test('definitions go out of scope', () => {
      expect(() => cdl.parse(`let x = (let a = 1; a+1); a+100`)).toThrowError('Symbol a was not found')
    })
  })

  describe('lambda expressions', () => {
    test('binds the value of the actual arg to the formal arg', () => {
      expect(cdl.parse(`(fun(a) 2*a)(3)`)).toEqual(6)
      expect(cdl.parse(`(fun(a, b) a*a-b*b)(3,4)`)).toEqual(-7)
      expect(cdl.parse(`(fun(a, b) a*a-b*b)(4,3)`)).toEqual(7)
    })
    test('can be stored in a variable', () => {
      expect(cdl.parse(`let triple = (fun(a) 3*a); triple(100) - triple(90)`)).toEqual(30)
    })
    test.todo('error on arg list mismatch')
  })

  test.skip('strings', () => {
    expect(cdl.parse(`'ab'`)).toEqual('ab')
    expect(cdl.parse(`'ab' + 'cd'`)).toEqual('abcd')
    expect(cdl.parse(`'abcd'.indexOf('c')`)).toEqual(2)
  })
  test.skip('objects', () => {
    expect(cdl.parse(`{}`)).toEqual({})
    expect(cdl.parse(`{a: 1}`)).toEqual({ a: 1 })
    expect(cdl.parse(`let x = {a: 3, b: 4}; x.a`)).toEqual(3)
    expect(cdl.parse(`let x = {a: 3, b: 4}; x.a * x.b`)).toEqual(12)
  })
  test.todo('quoting of a ticks inside a string')
  test.todo('number in scientific notation')
  test.todo('lambda expressions')
  test.todo('lambda expressions accessing outer scope variables')
  test.todo('if')
  test.todo('recursion')
  test.todo('accessing uninitalized variable')
  test.todo('syntax errors')
  test.todo('error messages to include line number and column')
  test.todo('deep equality of objects')
  test.todo('array literals')
  test.todo('object literals')
  test.todo('dot access to objects')
  test.todo('bracket access to objects')
  test.todo('bracket access to arrays')
  test.todo('string methods')
  test.todo('number methods')
  test.todo('array methods')
})
