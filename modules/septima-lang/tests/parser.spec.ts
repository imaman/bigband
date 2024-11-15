import { show } from '../src/ast-node'
import { Parser } from '../src/parser'
import { Scanner } from '../src/scanner'
import { SourceCode } from '../src/source-code'

function parse(arg: string) {
  const parser = new Parser(new Scanner(new SourceCode(arg, '<test-file>')))
  const ast = parser.parse()
  return ast
}

describe('parser', () => {
  test('show()', () => {
    expect(show(parse(`5`))).toEqual('5')
    expect(show(parse(`fun (x) x*9`))).toEqual('fun (x) (x * 9)')
  })
  test('syntax errors', () => {
    expect(() => parse(`a + #$%x`)).toThrowError('Unparsable input at (<test-file>:1:5..8) #$%x')
    expect(() => parse(`{#$%x: 8}`)).toThrowError('Expected an identifier at (<test-file>:1:2..9) #$%x: 8}')
    expect(() => parse(`"foo" "goo"`)).toThrowError('Loitering input at (<test-file>:1:7..11) "goo"')
  })

  describe('unit', () => {
    test('show', () => {
      expect(show(parse(`import * as foo from './bar';'a'`))).toEqual(`import * as foo from './bar';\n'a'`)
      expect(show(parse(`let f = x => x*x; f(2)`))).toEqual(`let f = fun (x) (x * x); f(2)`)
      expect(show(parse(`let f = x => x*x; let g = n => n+1`))).toEqual(
        `let f = fun (x) (x * x); let g = fun (n) (n + 1);`,
      )
      expect(show(parse(`export let a = 1; let b = 2; export let c = 3;`))).toEqual(
        `export let a = 1; let b = 2; export let c = 3;`,
      )
    })
  })
  describe('expression', () => {
    test('show', () => {
      expect(show(parse(`'sunday'`))).toEqual(`'sunday'`)
      expect(show(parse(`true`))).toEqual(`true`)
      expect(show(parse(`500`))).toEqual(`500`)
      expect(show(parse(`throw 'sunday'`))).toEqual(`throw 'sunday'`)
      expect(show(parse(`let a = 8;throw 'sunday'`))).toEqual(`let a = 8; throw 'sunday'`)
      expect(show(parse(`if (3+4 > 8) "above" else "below"`))).toEqual(`if (((3 + 4) > 8)) 'above' else 'below'`)
      expect(show(parse(`(3+4 > 8) ? "above" : "below"`))).toEqual(`((3 + 4) > 8) ? 'above' : 'below'`)
    })
  })
  describe('lambda', () => {
    test('show', () => {
      expect(show(parse(`(a) => a*2`))).toEqual(`fun (a) (a * 2)`)
      expect(show(parse(`(a, b = {x: 1, y: ['bee', 'camel']}) => a*2 + b.x`))).toEqual(
        `fun (a, b = {x: 1, y: ['bee', 'camel']}) ((a * 2) + b.x)`,
      )
    })
  })
})
