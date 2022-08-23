import { Value } from '../src/value'

describe('value', () => {
  test('arithmetics', () => {
    expect(new Value(5).plus(new Value(3)).export()).toEqual(8)
    expect(new Value(5).minus(new Value(3)).export()).toEqual(2)
    expect(new Value(5).times(new Value(3)).export()).toEqual(15)
    expect(new Value(14).over(new Value(4)).export()).toEqual(3.5)
  })
  test('comparisons', () => {
    expect(new Value(5).compare(new Value(3)).export()).toEqual(1)
    expect(new Value(5).compare(new Value(4)).export()).toEqual(1)
    expect(new Value(5).compare(new Value(5)).export()).toEqual(0)
    expect(new Value(5).compare(new Value(6)).export()).toEqual(-1)
    expect(new Value(5).compare(new Value(7)).export()).toEqual(-1)
  })
})
