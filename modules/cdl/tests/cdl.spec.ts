import * as cdl from '../src/cdl'

describe('cdl', () => {
  test('basics', () => {
    expect(cdl.parse(`5`)).toEqual(5)
    expect(() => cdl.parse(`6 6`)).toThrowError(`Expected one of *, / at position 1 but found:  6`)
    expect(cdl.parse(`3.14`)).toEqual(3.14)
  })

  test.skip('basics plus', () => {
    expect(cdl.parse(`{}`)).toEqual({})
    expect(cdl.parse(`'ab'`)).toEqual('ab')
  })
  test.skip('expressions', () => {
    expect(cdl.parse(`3+1`)).toEqual(4)
    expect(cdl.parse(`8*2`)).toEqual(16)
    expect(cdl.parse(`20-3`)).toEqual(17)
    expect(cdl.parse(`48/6`)).toEqual(8)
    expect(cdl.parse(`(1+4)*6`)).toEqual(30)
    expect(cdl.parse(`1+4*6`)).toEqual(25)
  })

  test.skip('objects', () => {
    expect(cdl.parse(`{a: 1}`)).toEqual({ a: 1 })
  })
  test.skip('variables', () => {
    expect(cdl.parse(`let x = 2; x+5`)).toEqual(7)
  })
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
