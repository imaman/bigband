import { show } from '../src/ast-node'
import { parse } from '../src/septima'

describe('parser', () => {
  test('show()', () => {
    expect(show(parse(`5`))).toEqual('5')
    expect(show(parse(`fun (x) x*9`))).toEqual('fun (x) (x * 9)')
  })
  test('syntax errors', () => {
    expect(() => parse(`a + #$%x`)).toThrowError('Unparsable input at (1:5..8) #$%x')
    expect(() => parse(`{#$%x: 8}`)).toThrowError('Expected an identifier at (1:2..9) #$%x: 8}')
    expect(() => parse(`"foo" "goo"`)).toThrowError('Loitering input at (1:7..11) "goo"')
  })

  describe('unit', () => {
    test('show', () => {
      expect(show(parse(`import * as foo from './bar';'a'`))).toEqual(`import * as foo from './bar';\n'a'`)
      expect(show(parse(`let f = x => x*x; f(2)`))).toEqual(`let f = fun (x) (x * x); f(2)`)
      expect(show(parse(`let f = x => x*x; let g = n => n+1`))).toEqual(
        `let f = fun (x) (x * x); let g = fun (n) (n + 1);`,
      )
    })
  })
  describe('expression', () => {
    test('show', () => {
      expect(show(parse(`'sunday'`))).toEqual(`'sunday'`)
      expect(show(parse(`true`))).toEqual(`true`)
      expect(show(parse(`500`))).toEqual(`500`)
      expect(show(parse(`sink`))).toEqual(`sink`)
      expect(show(parse(`sink!`))).toEqual(`sink!`)
      expect(show(parse(`sink!!`))).toEqual(`sink!!`)
    })
  })
})
