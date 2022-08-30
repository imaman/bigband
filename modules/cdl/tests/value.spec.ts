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
  test('comparisons of numbers', () => {
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
  test('comparisons of booleans', () => {
    expect(Value.bool(false).compare(Value.bool(false))).toEqual(0)
    expect(Value.bool(false).compare(Value.bool(true))).toEqual(-1)
    expect(Value.bool(true).compare(Value.bool(false))).toEqual(1)
    expect(Value.bool(true).compare(Value.bool(true))).toEqual(0)
  })
  test('strings', () => {
    expect(Value.str('abc').export()).toEqual('abc')
    expect(Value.str('').export()).toEqual('')
    expect(Value.str('a').plus(Value.str('b')).export()).toEqual('ab')
    expect(Value.str('').plus(Value.str('')).export()).toEqual('')
    expect(Value.str('').plus(Value.str('xyz')).export()).toEqual('xyz')
    expect(Value.str('pqr').plus(Value.str('')).export()).toEqual('pqr')
    expect(Value.str('zxcvb').plus(Value.str('nm')).export()).toEqual('zxcvbnm')
  })
  test('comparisons of strings', () => {
    expect(Value.str('e').compare(Value.str('c'))).toEqual(1)
    expect(Value.str('e').compare(Value.str('d'))).toEqual(1)
    expect(Value.str('e').compare(Value.str('e'))).toEqual(0)
    expect(Value.str('e').compare(Value.str('f'))).toEqual(-1)
    expect(Value.str('e').compare(Value.str('g'))).toEqual(-1)
  })
  test('arrays', () => {
    expect(Value.arr([Value.num(10), Value.num(20)]).export()).toEqual([10, 20])
    expect(Value.arr([]).export()).toEqual([])
    expect(Value.arr([Value.str('ab'), Value.num(500), Value.bool(true)]).export()).toEqual(['ab', 500, true])
  })
  test('objects', () => {
    expect(Value.obj({ x: Value.num(10), y: Value.num(20) }).export()).toEqual({ x: 10, y: 20 })
    expect(Value.obj({}).export()).toEqual({})
    expect(Value.obj({ the: Value.str('ab'), quick: Value.num(500), brown: Value.bool(true) }).export()).toEqual({
      the: 'ab',
      quick: 500,
      brown: true,
    })
    const o = Value.obj({ the: Value.str('ab'), quick: Value.num(500), brown: Value.bool(true) })
    expect(o.access('the').export()).toEqual('ab')
    expect(o.access('quick').export()).toEqual(500)
    expect(o.access('brown').export()).toEqual(true)
  })
  describe('type erros', () => {
    const five = Value.num(1)
    const t = Value.bool(true)

    const check = (a: Value, b: Value | Value[], f: (lhs: Value, rhs: Value) => void) => {
      const arr = Array.isArray(b) ? b : [b]
      const r =
        /(^value type error: expected)|(^Type error: operator cannot be applied to operands of type)|(^Cannot compare when the left-hand-side value is of type)|(^Not a)/
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
  describe('foreign code calls', () => {
    test('invokes the given function', () => {
      const indexOf = Value.foreign(s => 'the quick brown fox jumps over the lazy dog'.indexOf(s.assertStr()))
      expect(indexOf.callForeign([Value.str('quick')]).export()).toEqual(4)
    })
  })
  test('string methods', () => {
    const calls: [string, Value[], unknown][] = [
      ['at', [Value.num(10)], 'e'],
      ['at', [Value.num(-4)], 'v'],
      ['charAt', [Value.num(10)], 'e'],
      ['concat', [Value.str('years')], ' four scores AND seven years'],
      ['endsWith', [Value.str('seven')], true],
      ['includes', [Value.str('scores')], true],
      ['includes', [Value.str('years')], false],
      ['indexOf', [Value.str('e')], 10],
      ['lastIndexOf', [Value.str('e')], 20],
      ['length', [], 23],
      ['match', [Value.str('a|f')], ['f']],
      ['matchAll', [Value.str('a|f')], [['f'], ['a']]],
      // ['normalize', [], 'foo'],
      ['padEnd', [Value.num(25), Value.str('#')], ' four scores AND seven ##'],
      ['padStart', [Value.num(25), Value.str('#')], '## four scores AND seven '],
      ['repeat', [Value.num(3)], ' four scores AND seven  four scores AND seven  four scores AND seven '],
      ['replace', [Value.str('o'), Value.str('#')], ' f#ur scores AND seven '],
      ['replaceAll', [Value.str('o'), Value.str('#')], ' f#ur sc#res AND seven '],
      ['search', [Value.str('sco..s')], '6'],
      ['slice', [], 'foo'],
      ['split', [Value.str(' ')], ['', 'four', 'scores', 'and', 'seven', '']],
      ['startsWith', [Value.str(' four')], true],
      ['startsWith', [Value.str('seven')], false],
      ['substring', [Value.num(6), Value.num(12)], 'scores'],
      ['toLowerCase', [], ' four scores and seven '],
      ['toUpperCase', [], ' FOUR SCORES AND SEVEN '],
      ['trim', [], 'four scores AND seven'],
      ['trimEnd', [], ' four scores AND seven'],
      ['trimStart', [], 'four scores AND seven '],
    ]

    for (const [name, args, expected] of calls) {
      const callee = Value.str(' four scores AND seven ').access(name)
      const actual = callee.callForeign(args)
      expect(actual.export()).toEqual(expected)
    }
  })
})
