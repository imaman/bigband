import { show } from '../src/ast-node'
import * as cdl from '../src/cdl'

describe('parser', () => {
  test('show()', () => {
    expect(show(cdl.parse(`5`))).toEqual('5')
    expect(show(cdl.parse(`fun (x) x*9`))).toEqual('fun (x) (x * 9)')
  })
})
