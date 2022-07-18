import { Name } from './name'
import { Section } from './section'

export interface Resolution {
  name: Name
  type: string
  properties: unknown
  children?: Instrument[]
  deletionPolicy?: 'Delete' | 'Retain'
}

export interface Instrument {
  resolve(section: Section): Resolution
  arn(section: Section): string
  get resourceName(): string
}
