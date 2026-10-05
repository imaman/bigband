import { Name } from './name.js'
import { ResolvedSection } from './section.js'

export interface Resolution {
  name: Name
  type: string
  properties: unknown
  children?: Instrument[]
  deletionPolicy?: 'Delete' | 'Retain'
}

export interface Instrument {
  resolve(section: ResolvedSection): Resolution
  arn(section: ResolvedSection): string
  get resourceName(): string
}
