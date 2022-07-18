import { Instrument, Resolution } from './instrument'
import { Name } from './name'
import { ResolvedSection } from './section'

export interface ArnDetails {
  serviceName: string
  resourceType: string
  resourceId: string
  // If set overrides the section's region. Set to '' for regionless resources
  region?: string
  // If set overrides the section's account. Set to '' for resources (such as S3) whose ARN is account-free.
  account?: string
}

export abstract class AbstractInstrument implements Instrument {
  protected readonly name: Name
  constructor(name: string) {
    this.name = new Name(name)
  }
  abstract resolve(section: ResolvedSection): Resolution

  abstract getArnDetails(s: ResolvedSection): ArnDetails

  get resourceName() {
    return this.name.resourceName
  }

  arn(s: ResolvedSection): string {
    const d = this.getArnDetails(s)
    const suffix = d.resourceId ? `${d.resourceId}` : ''
    return `arn:${s.partition}:${d.serviceName}:${d.region ?? s.region}:${d.account ?? s.account}:${
      d.resourceType
    }${suffix}`
  }
}
