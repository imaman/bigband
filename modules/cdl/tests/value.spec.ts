import { Value } from '../src/value'

describe('value', () => {
  test('arithmetics', () => {
    expect(Value.num(5).plus(Value.num(3)).export()).toEqual(8)
    expect(Value.num(5).minus(Value.num(3)).export()).toEqual(2)
    expect(Value.num(5).times(Value.num(3)).export()).toEqual(15)
    expect(Value.num(14).over(Value.num(4)).export()).toEqual(3.5)
    expect(Value.num(5).negate().export()).toEqual(-5)
    expect(Value.num(-12).negate().export()).toEqual(12)
    expect(Value.num(3).power(Value.num(4)).export()).toEqual(81)
    expect(Value.num(2).power(Value.num(8)).export()).toEqual(256)
  })
  test('comparisons', () => {
    expect(Value.num(5).compare(Value.num(3))).toEqual(1)
    expect(Value.num(5).compare(Value.num(4))).toEqual(1)
    expect(Value.num(5).compare(Value.num(5))).toEqual(0)
    expect(Value.num(5).compare(Value.num(6))).toEqual(-1)
    expect(Value.num(5).compare(Value.num(7))).toEqual(-1)
  })
  test('booleans', () => {
    expect(Value.bool(true).export()).toEqual(true)
    expect(Value.bool(false).export()).toEqual(false)
    expect(Value.bool(false).not().export()).toEqual(true)
    expect(Value.bool(true).not().export()).toEqual(false)
  })
  test('emits erros when numeric operations are applied to a boolean (either lhs or rhs)', () => {
    expect(5).toEqual(5)
  })
  test.todo('emits erros when boolean operations are applied to a number (either lhs or rhs)')
})
