import { ResolvedSection } from './section'

export class Name {
  constructor(private readonly value: string) {
    Name.mustBeKebabCase(value)
  }

  get parts() {
    return this.value.split('-')
  }

  get resourceName() {
    return Name.camelCase(this.value)
  }

  qualifiedName(section: ResolvedSection) {
    return `${Name.camelCase(section.bigbandName)}-${Name.camelCase(section.sectionName)}-${Name.camelCase(this.value)}`
  }

  static camelCase(s: string) {
    Name.mustBeKebabCase(s)
    const mapped = s.split('-').map((part, i) => {
      if (i === 0) {
        return part
      }

      return part
        .split('')
        .map((ch, i) => (i === 0 ? ch.toUpperCase() : ch))
        .join('')
    })
    return mapped.join('')
  }

  static isKebabCase(s: string) {
    return s.match(/^([a-z]+)(-[0-9a-z]+)*$/)
  }

  static mustBeKebabCase(s: string) {
    if (!this.isKebabCase(s)) {
      throw new Error(`The given input ("${s}") is not in kebab-case format`)
    }
  }
}
