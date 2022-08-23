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

  test('unary expressions', () => {
    expect(cdl.parse(`-7`)).toEqual(-7)
    expect(cdl.parse(`3+-7`)).toEqual(-4)
    expect(cdl.parse(`3*+7`)).toEqual(21)
    expect(cdl.parse(`3*-7`)).toEqual(-21)
    expect(cdl.parse(`-3*-7`)).toEqual(21)
  })

  test.todo('comparisons')
  test.todo('boolean expressions')

  test.skip('basics plus', () => {
    expect(cdl.parse(`'ab'`)).toEqual('ab')
    expect(cdl.parse(`{}`)).toEqual({})
  })
  test.skip('objects', () => {
    expect(cdl.parse(`{a: 1}`)).toEqual({ a: 1 })
  })
  test.skip('variables', () => {
    expect(cdl.parse(`let x = 2; x+5`)).toEqual(7)
  })
  test.todo('auto-consume whitespace')
  test.todo('quoting of a ticks inside a string')
  test.todo('number in scientific notation')
  test.todo('negative number')
  test.todo('lambda expressions')
  test.todo('lambda expressions accessing outer scope variables')
  test.todo('if')
  test.todo('recursion')
  test.todo('accessing uninitalized variable')
  test.todo('syntax errors')
  test.todo('error messages to include line number and column')
})
