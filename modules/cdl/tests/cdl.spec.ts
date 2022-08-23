import * as cdl from '../src/cdl'

describe('cdl', () => {
  test('basics', () => {
    expect(cdl.parse(`5`)).toEqual(5)
    expect(() => cdl.parse(`6 6`)).toThrowError(`Loitering input at position 1: < 6>`)
    expect(cdl.parse(`3.14`)).toEqual(3.14)
  })

  test('expressions', () => {
    expect(cdl.parse(`8*2`)).toEqual(16)
    expect(cdl.parse(`3+1`)).toEqual(4)
    expect(cdl.parse(`20-3`)).toEqual(17)
    expect(cdl.parse(`48/6`)).toEqual(8)
    expect(cdl.parse(`(1+4)*6`)).toEqual(30)
    expect(cdl.parse(`1+4*6`)).toEqual(25)
    expect(cdl.parse(`!5`)).toEqual(0)
    expect(cdl.parse(`!0`)).toEqual(1)
    expect(cdl.parse(`!!0`)).toEqual(0)
    expect(cdl.parse(`!!4`)).toEqual(1)
  })

  test('comparisons', () => {

  })
  test('boolean expressions', () => {

  })

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
