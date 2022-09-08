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
})