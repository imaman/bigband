import { Value } from '../src/value'

describe('value', () => {
  test('arithmetics', () => {
    expect(new Value(5).plus(new Value(3)).export()).toEqual(8)
    expect(new Value(5).minus(new Value(3)).export()).toEqual(2)
    expect(new Value(5).times(new Value(3)).export()).toEqual(15)
    expect(new Value(14).over(new Value(4)).export()).toEqual(3.5)
    expect(new Value(5).negate().export()).toEqual(-5)
    expect(new Value(-12).negate().export()).toEqual(12)
  })
  test('comparisons', () => {
    expect(new Value(5).compare(new Value(3))).toEqual(1)
    expect(new Value(5).compare(new Value(4))).toEqual(1)
    expect(new Value(5).compare(new Value(5))).toEqual(0)
    expect(new Value(5).compare(new Value(6))).toEqual(-1)
    expect(new Value(5).compare(new Value(7))).toEqual(-1)
  })
  test('booleans', () => {
    expect(new Value(true).export()).toEqual(true)
    expect(new Value(false).export()).toEqual(false)
    expect(new Value(false).not().export()).toEqual(true)
    expect(new Value(true).not().export()).toEqual(false)
  })
})
