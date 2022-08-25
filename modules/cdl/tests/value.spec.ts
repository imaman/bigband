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
  test('strings', () => {
    expect(Value.str('abc').export()).toEqual('abc')
    expect(Value.str('').export()).toEqual('')
    expect(Value.str('a').plus(Value.str('b')).export()).toEqual('ab')
  })
  describe('type erros', () => {
    const five = Value.num(1)
    const t = Value.bool(true)

    const check = (a: Value, b: Value | Value[], f: (lhs: Value, rhs: Value) => void) => {
      const arr = Array.isArray(b) ? b : [b]
      const r = /(^value type error: expected)|(^Type error: operator cannot be applied to operands of type)/
      for (const curr of arr) {
        expect(() => f(a, curr)).toThrowError(r)
        expect(() => f(curr, a)).toThrowError(r)
      }
    }

    test('emits erros when numeric operations are applied to a boolean (either lhs or rhs)', () => {
      check(five, t, (x, y) => x.plus(y))
      check(five, t, (x, y) => x.minus(y))
      check(five, t, (x, y) => x.times(y))
      check(five, t, (x, y) => x.over(y))
      check(five, t, (x, y) => x.power(y))
      check(five, t, (x, y) => x.modulo(y))
      check(five, t, (x, y) => x.compare(y))
      check(t, t, x => x.negate())
      expect(1).toEqual(1) // make the linter happy
    })
    test('emits erros when boolean operations are applied to a number (either lhs or rhs)', () => {
      check(five, t, (x, y) => x.or(y))
      check(five, t, (x, y) => x.and(y))
      check(five, five, x => x.not())
      expect(1).toEqual(1) // make the linter happy
    })
  })
})
