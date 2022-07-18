import { Name } from '../src/name'

describe('name', () => {
  test('mustBeKebabCase', () => {
    expect(() => Name.mustBeKebabCase('the-quick-brown-fox')).not.toThrow()
    expect(() => Name.mustBeKebabCase('theQuickBrownFox')).toThrowError(
      'The given input ("theQuickBrownFox") is not in kebab-case format',
    )
    expect(() => Name.mustBeKebabCase('')).toThrowError('is not in kebab-case format')
  })
  test('camelCase', () => {
    expect(Name.camelCase('the-quick-brown-fox')).toEqual('theQuickBrownFox')
    expect(Name.camelCase('abc')).toEqual('abc')
    expect(Name.camelCase('foo-goo')).toEqual('fooGoo')
  })
  test('ctor throws if input is not kebab-cased', () => {
    expect(() => new Name('the-quick-brown-fox')).not.toThrow()
    expect(() => new Name('theQuickBrownFox')).toThrowError(
      'The given input ("theQuickBrownFox") is not in kebab-case format',
    )
  })
})
