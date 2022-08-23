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

    expect(cdl.parse(`true&&true`)).toEqual(true)
    expect(cdl.parse(`true&&false`)).toEqual(false)
    expect(cdl.parse(`false&&true`)).toEqual(false)
    expect(cdl.parse(`false&&false`)).toEqual(false)
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

  test('expressions', () => {
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
    expect(() => cdl.parse(`!5`)).toThrowError(`Cannot negate a value of type num: 5`)
    expect(() => cdl.parse(`!0`)).toThrowError(`Cannot negate a value of type num: 0`)
    expect(() => cdl.parse(`!!0`)).toThrowError(`Cannot negate a value of type num: 0`)
    expect(() => cdl.parse(`!!4`)).toThrowError(`Cannot negate a value of type num: 4`)
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
      expect(() => cdl.parse(`let x = 5; x+y`)).toThrowError('Symbol not found: y')
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

    test('inner expressions can access variables from other scopes (dynamically bounded)', () => {
      expect(
        cdl.parse(`
        let x = 5; 
        let y = 20; 
        
        x*y+(let n = 4; n+x)`),
      ).toEqual(109)
    })
    test('inner let expressions overshadow earlier ones', () => {
      expect(
        cdl.parse(`
        let x = 5; 
        let y = 20; 
        
        x*y+(let n = 4; let x = 200; n+x)`),
      ).toEqual(304)
    })
  })

  describe('lambda expressions', () => {
    test('simplest', () => {
      expect(cdl.parse(`((a) => 2*a)(3)`)).toEqual(6)
    })
  })

  test.todo('lexically scoped binding of variables')

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
})
