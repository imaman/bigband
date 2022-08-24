import { Value } from '../src/value'

describe('value', () => {
  test('arithmetics', () => {
    expect(Value.fromNum(5).plus(Value.fromNum(3)).export()).toEqual(8)
    expect(Value.fromNum(5).minus(Value.fromNum(3)).export()).toEqual(2)
    expect(Value.fromNum(5).times(Value.fromNum(3)).export()).toEqual(15)
    expect(Value.fromNum(14).over(Value.fromNum(4)).export()).toEqual(3.5)
    expect(Value.fromNum(5).negate().export()).toEqual(-5)
    expect(Value.fromNum(-12).negate().export()).toEqual(12)
    expect(Value.fromNum(3).power(Value.fromNum(4)).export()).toEqual(81)
    expect(Value.fromNum(2).power(Value.fromNum(8)).export()).toEqual(256)
  })
  test('comparisons', () => {
    expect(Value.fromNum(5).compare(Value.fromNum(3))).toEqual(1)
    expect(Value.fromNum(5).compare(Value.fromNum(4))).toEqual(1)
    expect(Value.fromNum(5).compare(Value.fromNum(5))).toEqual(0)
    expect(Value.fromNum(5).compare(Value.fromNum(6))).toEqual(-1)
    expect(Value.fromNum(5).compare(Value.fromNum(7))).toEqual(-1)
  })
  test('booleans', () => {
    expect(Value.fromBool(true).export()).toEqual(true)
    expect(Value.fromBool(false).export()).toEqual(false)
    expect(Value.fromBool(false).not().export()).toEqual(true)
    expect(Value.fromBool(true).not().export()).toEqual(false)
  })
  test.todo('emits erros when numeric operations are applied to a boolean (either lhs or rhs)')
  test.todo('emits erros when boolean operations are applied to a number (either lhs or rhs)')
})
