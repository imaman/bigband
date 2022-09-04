import { Runtime } from '../src/runtime'
import { Value } from '../src/value'

const err = () => {
  throw new Error(`should not run`)
}

const fixed = (u: unknown) => () => Value.from(u)

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
    expect(Value.num(5).order(Value.num(3)).export()).toEqual(1)
    expect(Value.num(5).order(Value.num(4)).export()).toEqual(1)
    expect(Value.num(5).order(Value.num(5)).export()).toEqual(0)
    expect(Value.num(5).order(Value.num(6)).export()).toEqual(-1)
    expect(Value.num(5).order(Value.num(7)).export()).toEqual(-1)
  })
  test('booleans', () => {
    expect(Value.bool(true).export()).toEqual(true)
    expect(Value.bool(false).export()).toEqual(false)
    expect(Value.bool(false).not().export()).toEqual(true)
    expect(Value.bool(true).not().export()).toEqual(false)
  })
  describe('boolean operators', () => {
    test('or', () => {
      expect(
        Value.bool(false)
          .or(() => Value.bool(false))
          .export(),
      ).toEqual(false)
      expect(
        Value.bool(false)
          .or(() => Value.bool(true))
          .export(),
      ).toEqual(true)
      expect(
        Value.bool(true)
          .or(() => Value.bool(false))
          .export(),
      ).toEqual(true)
      expect(
        Value.bool(true)
          .or(() => Value.bool(true))
          .export(),
      ).toEqual(true)
    })
    test('and', () => {
      expect(
        Value.bool(false)
          .and(() => Value.bool(false))
          .export(),
      ).toEqual(false)
      expect(
        Value.bool(false)
          .and(() => Value.bool(true))
          .export(),
      ).toEqual(false)
      expect(
        Value.bool(true)
          .and(() => Value.bool(false))
          .export(),
      ).toEqual(false)
      expect(
        Value.bool(true)
          .and(() => Value.bool(true))
          .export(),
      ).toEqual(true)
    })
  })
  test('comparisons of booleans', () => {
    expect(Value.bool(false).order(Value.bool(false)).export()).toEqual(0)
    expect(Value.bool(false).order(Value.bool(true)).export()).toEqual(-1)
    expect(Value.bool(true).order(Value.bool(false)).export()).toEqual(1)
    expect(Value.bool(true).order(Value.bool(true)).export()).toEqual(0)
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
    expect(Value.str('e').order(Value.str('c')).export()).toEqual(1)
    expect(Value.str('e').order(Value.str('d')).export()).toEqual(1)
    expect(Value.str('e').order(Value.str('e')).export()).toEqual(0)
    expect(Value.str('e').order(Value.str('f')).export()).toEqual(-1)
    expect(Value.str('e').order(Value.str('g')).export()).toEqual(-1)
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
    expect(o.access(Value.str('quick')).export()).toEqual(500)
  })
  test('yells if access() is called with value which is neither string or num', () => {
    const o = Value.obj({ the: Value.str('ab'), quick: Value.num(500), brown: Value.bool(true) })
    expect(() => o.access(Value.arr([])).export()).toThrowError(
      'value type error: expected either num or str but found []',
    )
    expect(() => o.access(Value.bool(false)).export()).toThrowError(
      'value type error: expected either num or str but found false',
    )
    expect(() => o.access(Value.obj({ x: Value.num(1) })).export()).toThrowError(
      'value type error: expected either num or str but found {"x":1}',
    )
  })
  test('json', () => {
    const v = Value.obj({ x: Value.num(1) })
    expect(JSON.stringify(v)).toEqual('{"x":1}')
  })
  describe('ifElse', () => {
    test('when applied to true evaluates the positive branch', () => {
      expect(Value.bool(true).ifElse(fixed('yes'), fixed('no')).export()).toEqual('yes')
    })
    test('when applied to false evaluates the positive branch', () => {
      expect(Value.bool(false).ifElse(fixed('yes'), fixed('no')).export()).toEqual('no')
    })
    test('errors if applied to a non-boolean', () => {
      expect(() => Value.num(1).ifElse(fixed('yes'), fixed('no')).export()).toThrowError('expected bool but found 1')
    })
  })
  describe('sink', () => {
    const sink = Value.sink()
    test('exported as null', () => {
      expect(sink.export()).toEqual(null)
    })
    test('arithmetic operations on sink evaluate to sink', () => {
      expect(sink.plus(Value.num(5)).export()).toEqual(null)
      expect(sink.minus(Value.num(5)).export()).toEqual(null)
      expect(sink.times(Value.num(5)).export()).toEqual(null)
      expect(sink.over(Value.num(5)).export()).toEqual(null)
      expect(sink.power(Value.num(5)).export()).toEqual(null)
      expect(sink.modulo(Value.num(5)).export()).toEqual(null)
      expect(sink.negate().export()).toEqual(null)

      expect(Value.num(5).plus(sink).export()).toEqual(null)
      expect(Value.num(5).minus(sink).export()).toEqual(null)
      expect(Value.num(5).times(sink).export()).toEqual(null)
      expect(Value.num(5).over(sink).export()).toEqual(null)
      expect(Value.num(5).power(sink).export()).toEqual(null)
      expect(Value.num(5).modulo(sink).export()).toEqual(null)
    })
    test('boolean operations on sink evaluate to sink', () => {
      expect(sink.and(fixed(true)).export()).toEqual(null)
      expect(sink.or(fixed(true)).export()).toEqual(null)
      expect(sink.not().export()).toEqual(null)
    })
    test('when sink is the right-hand-side of a boolean expression, the result is sink only if the left-hand-side dictates so', () => {
      expect(Value.bool(true).and(fixed(sink)).export()).toEqual(null)
      expect(Value.bool(false).and(fixed(sink)).export()).toEqual(false)
      expect(Value.bool(true).or(fixed(sink)).export()).toEqual(true)
      expect(Value.bool(false).or(fixed(sink)).export()).toEqual(null)
    })
    test('ifElse with sink condition evaluates to sink', () => {
      expect(sink.ifElse(fixed('y'), fixed('n')).export()).toEqual(null)
    })
    test('ifElse with sink positive expression evaluates to sink only if the condition is true', () => {
      expect(Value.bool(true).ifElse(fixed(sink), fixed(-200)).export()).toEqual(null)
      expect(Value.bool(false).ifElse(fixed(sink), fixed(-200)).export()).toEqual(-200)
    })
    test('ifElse with sink negative expression evaluates to sink only if the condition is false', () => {
      expect(Value.bool(true).ifElse(fixed(-300), fixed(sink)).export()).toEqual(-300)
      expect(Value.bool(false).ifElse(fixed(-300), fixed(sink)).export()).toEqual(null)
    })
    test('access to an attribute of a sink evaluates to sink', () => {
      expect(sink.access('foo').export()).toEqual(null)
    })
    test('calling a sink evaluates to sink', () => {
      expect(sink.call([], err).export()).toEqual(null)
    })

    test('applying .keys() to sink evaluates to sink', () => {
      expect(sink.keys().export()).toEqual(null)
    })
    test('applying .entries() to sink evaluates to sink', () => {
      expect(sink.entries().export()).toEqual(null)
    })
    test('applying .fromEntries() to sink evaluates to sink', () => {
      expect(sink.fromEntries().export()).toEqual(null)
    })
    describe('comparisons', () => {
      test('comparing a sink with itself evaluates to true', () => {
        expect(sink.equalsTo(sink).export()).toEqual(true)
      })

      test('comparing a sink with other types evaluates to false', () => {
        expect(sink.equalsTo(Value.arr([])).export()).toEqual(false)
        expect(sink.equalsTo(Value.bool(false)).export()).toEqual(false)
        expect(sink.equalsTo(Value.bool(true)).export()).toEqual(false)
        expect(sink.equalsTo(Value.num(0)).export()).toEqual(false)
        expect(sink.equalsTo(Value.num(5)).export()).toEqual(false)
        expect(sink.equalsTo(Value.obj({})).export()).toEqual(false)
        expect(sink.equalsTo(Value.str('')).export()).toEqual(false)
        expect(sink.equalsTo(Value.str('s')).export()).toEqual(false)
      })
      test('erros when trying to order a sink with a non-sink', () => {
        expect(() => sink.order(Value.arr([])).export()).toThrowError('Cannot compare a')
        expect(() => sink.order(Value.bool(false)).export()).toThrowError('Cannot compare a')
        expect(() => sink.order(Value.bool(true)).export()).toThrowError('Cannot compare a')
        expect(() => sink.order(Value.num(0)).export()).toThrowError('Cannot compare a')
        expect(() => sink.order(Value.num(5)).export()).toThrowError('Cannot compare a')
        expect(() => sink.order(Value.obj({})).export()).toThrowError('Cannot compare a')
        expect(() => sink.order(Value.str('')).export()).toThrowError('Cannot compare a')
        expect(() => sink.order(Value.str('a')).export()).toThrowError('Cannot compare a')

        expect(() => Value.arr([]).order(sink).export()).toThrowError('Cannot compare a')
        expect(() => Value.bool(false).order(sink).export()).toThrowError('Cannot compare a')
        expect(() => Value.bool(true).order(sink).export()).toThrowError('Cannot compare a')
        expect(() => Value.num(0).order(sink).export()).toThrowError('Cannot compare a')
        expect(() => Value.num(5).order(sink).export()).toThrowError('Cannot compare a')
        expect(() => Value.obj({}).order(sink).export()).toThrowError('Cannot compare a')
        expect(() => Value.str('').order(sink).export()).toThrowError('Cannot compare a')
        expect(() => Value.str('a').order(sink).export()).toThrowError('Cannot compare a')
      })
    })
  })
  describe('type erros', () => {
    const five = Value.num(1)
    const t = Value.bool(true)
    const f = Value.bool(false)

    const check = (a: Value, b: Value | Value[], f: (lhs: Value, rhs: Value) => void) => {
      const arr = Array.isArray(b) ? b : [b]
      const r = /(^value type error: expected)|(^Cannot compare a )/
      // /(^value type error: expected)|(^Type error: operator cannot be applied to operands of type)|(^Cannot compare when the left-hand-side value is of type)|(^Not a)/
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
      check(five, t, (x, y) => x.order(y))
      check(t, t, x => x.negate())
      expect(1).toEqual(1) // make the linter happy
    })
    test('emits erros when boolean operations are applied to a number (either lhs or rhs)', () => {
      check(five, f, (x, y) => x.or(() => y))
      check(five, t, (x, y) => x.and(() => y))
      check(five, five, x => x.not())
      expect(1).toEqual(1) // make the linter happy
    })
  })
  describe('foreign code calls', () => {
    test('invokes the given function', () => {
      const indexOf = Value.foreign(s => 'the quick brown fox jumps over the lazy dog'.indexOf(s.assertStr()))
      expect(indexOf.call([Value.str('quick')], err).export()).toEqual(4)
    })
  })
  describe('string operatios', () => {
    test('.length', () => {
      expect(Value.str('four scores AND seven').access('length').export()).toEqual(21)
    })
    test.each([
      ['at', [Value.num(10)], 'e'],
      ['at', [Value.num(-4)], 'v'],
      ['charAt', [Value.num(10)], 'e'],
      ['concat', [Value.str('years')], ' four scores AND seven years'],
      ['endsWith', [Value.str('seven ')], true],
      ['endsWith', [Value.str('years')], false],
      ['includes', [Value.str('scores')], true],
      ['includes', [Value.str('years')], false],
      ['indexOf', [Value.str('e')], 10],
      ['lastIndexOf', [Value.str('e')], 20],
      ['match', [Value.str('r|f')], ['f']],
      ['matchAll', [Value.str('r|f')], [['f'], ['r'], ['r']]],
      ['padEnd', [Value.num(25), Value.str('#')], ' four scores AND seven ##'],
      ['padStart', [Value.num(25), Value.str('#')], '## four scores AND seven '],
      ['repeat', [Value.num(3)], ' four scores AND seven  four scores AND seven  four scores AND seven '],
      ['replace', [Value.str('o'), Value.str('#')], ' f#ur scores AND seven '],
      ['replaceAll', [Value.str('o'), Value.str('#')], ' f#ur sc#res AND seven '],
      ['search', [Value.str('sco..s')], 6],
      ['slice', [Value.num(13), Value.num(-7)], 'AND'],
      ['split', [Value.str(' ')], ['', 'four', 'scores', 'AND', 'seven', '']],
      ['startsWith', [Value.str(' four')], true],
      ['startsWith', [Value.str('seven')], false],
      ['substring', [Value.num(6), Value.num(12)], 'scores'],
      ['substring', [Value.num(13), Value.num(-7)], ' four scores '],
      ['toLowerCase', [], ' four scores and seven '],
      ['toUpperCase', [], ' FOUR SCORES AND SEVEN '],
      ['trim', [], 'four scores AND seven'],
      ['trimEnd', [], ' four scores AND seven'],
      ['trimStart', [], 'four scores AND seven '],
    ])('provides the .%s() method', (name, args, expected) => {
      const callee = Value.str(' four scores AND seven ').access(name)
      const actual = callee.call(args, err)
      expect(actual.export()).toEqual(expected)
    })
  })
  describe('array operations', () => {
    test('.length', () => {
      expect(
        Value.arr([Value.str('foo'), Value.str('bar'), Value.str('foo'), Value.str('goo')])
          .access('length')
          .export(),
      ).toEqual(4)
    })
    test.each([
      ['at', [Value.num(-1)], 'goo'],
      ['concat', [Value.arr([Value.str('boo'), Value.str('poo')])], ['foo', 'bar', 'foo', 'goo', 'boo', 'poo']],
      [
        'entries',
        [],
        [
          [0, 'foo'],
          [1, 'bar'],
          [2, 'foo'],
          [3, 'goo'],
        ],
      ],
      ['every', [Value.foreign(v => v.assertStr().endsWith('oo'))], false],
      ['every', [Value.foreign(v => v.assertStr().length === 3)], true],
      ['filter', [Value.foreign(v => Boolean(v.assertStr().match(/^b|^g/)))], ['bar', 'goo']],
      ['find', [Value.foreign(v => v.assertStr() === 'bar')], 'bar'],
      // TODO(imaman): ['find', [Value.foreign(v => v.assertStr() === 'lorem ipsum')], ??]"",
      ['findIndex', [Value.foreign(v => v.assertStr() === 'goo')], 3],
      ['flat', [], ['foo', 'bar', 'foo', 'goo']],
      [
        'flatMap',
        [Value.foreign(v => v.assertStr().split(''))],
        ['f', 'o', 'o', 'b', 'a', 'r', 'f', 'o', 'o', 'g', 'o', 'o'],
      ],
      ['includes', [Value.str('bar')], true],
      ['includes', [Value.str('lorem-ipsum')], false],
      ['indexOf', [Value.str('goo')], 3],
      ['join', [Value.str('; ')], 'foo; bar; foo; goo'],
      ['lastIndexOf', [Value.str('foo')], 2],
      ['lastIndexOf', [Value.str('lorem ipsum')], -1],
      ['map', [Value.foreign(v => v.assertStr().charAt(0))], ['f', 'b', 'f', 'g']],
      ['reverse', [], ['goo', 'foo', 'bar', 'foo']],
      ['slice', [Value.num(1), Value.num(2)], ['bar']],
      ['slice', [Value.num(1), Value.num(3)], ['bar', 'foo']],
      ['slice', [Value.num(2), Value.num(4)], ['foo', 'goo']],
      ['some', [Value.foreign(v => v.assertStr().endsWith('oo'))], true],
      ['some', [Value.foreign(v => v.assertStr().startsWith('oo'))], false],
    ])('provides the .%s() method', (name, args, expected) => {
      const r = new Runtime({ tag: 'literal', type: 'num', t: { offset: 0, text: '1' } })
      const input = Value.arr([Value.str('foo'), Value.str('bar'), Value.str('foo'), Value.str('goo')])
      const before = JSON.parse(JSON.stringify(input))
      const callee = input.access(name, r)
      const actual = callee.call(args, err)
      expect(actual.export()).toEqual(expected)
      // Make sure the input array was not accidentally mutated.
      expect(JSON.parse(JSON.stringify(input))).toEqual(before)
    })
    test('.flat() flattens', () => {
      const r = new Runtime({ tag: 'literal', type: 'num', t: { offset: 0, text: '1' } })
      const input = Value.arr([Value.arr([Value.str('a'), Value.str('b')]), Value.str('c')])
      const callee = input.access('flat', r)
      const actual = callee.call([], err)
      expect(actual.export()).toEqual(['a', 'b', 'c'])
    })
    test('.reduce() reduces to the left', () => {
      const r = new Runtime({ tag: 'literal', type: 'num', t: { offset: 0, text: '1' } })

      const input = Value.arr([
        Value.arr([Value.num(0), Value.num(1)]),
        Value.arr([Value.num(2), Value.num(3)]),
        Value.arr([Value.num(4), Value.num(5)]),
      ])

      const callee = input.access('reduce', r)
      const actual = callee.call([Value.foreign((x, y) => [...x.assertArr(), ...y.assertArr()]), Value.arr([])], err)
      expect(actual.export()).toEqual([0, 1, 2, 3, 4, 5])
    })
    test('.reduceRight() reduces to the right', () => {
      const r = new Runtime({ tag: 'literal', type: 'num', t: { offset: 0, text: '1' } })

      const input = Value.arr([
        Value.arr([Value.num(0), Value.num(1)]),
        Value.arr([Value.num(2), Value.num(3)]),
        Value.arr([Value.num(4), Value.num(5)]),
      ])

      const callee = input.access('reduceRight', r)
      const actual = callee.call([Value.foreign((x, y) => [...x.assertArr(), ...y.assertArr()]), Value.arr([])], err)
      expect(actual.export()).toEqual([4, 5, 2, 3, 0, 1])
    })
  })

  test.todo('array.sort()')
  test.todo('what happens when we get an undefined from a foreign call (like Array.get())')
  test.todo('access to non-existing string method (a sad path test)')
  test.todo('access to non-existing array method (a sad path test)')
})
