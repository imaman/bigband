import { Name } from './name'
import { ResolvedSection } from './section'

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
