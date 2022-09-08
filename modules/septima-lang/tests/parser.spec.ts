import { show } from '../src/ast-node'
import * as cdl from '../src/septima'

describe('parser', () => {
  test('show()', () => {
    expect(show(cdl.parse(`5`))).toEqual('5')
    expect(show(cdl.parse(`fun (x) x*9`))).toEqual('fun (x) (x * 9)')
  })
  test('syntax errors', () => {
    expect(() => cdl.parse(`a + #$%x`)).toThrowError('Unparsable input at (1:5..8) #$%x')
    expect(() => cdl.parse(`{#$%x: 8}`)).toThrowError('Expected an identifier at (1:2..9) #$%x: 8}')
    expect(() => cdl.parse(`"foo" "goo"`)).toThrowError('Loitering input at (1:7..11) "goo"')
  })
})
