import { pair } from 'misc'

import { Instrument, Resolution } from './instrument'
import { Section } from './section'

// TODO(imaman): timestream, qldb, ddb, s3-folder(?)
export class Bigband {
  constructor(private readonly instruments: Instrument[]) {}

  resolve(section: Section) {
    const resolutions: Resolution[] = []
    for (const at of this.instruments) {
      this.resolveInstrument(section, at, resolutions)
    }

    const pairs = resolutions.map(at =>
      pair(at.name.resourceName, {
        Type: at.type,
        DeletionPolicy: at.deletionPolicy,
        Properties: at.properties,
        DependsOn: at.children?.map(x => x.resourceName),
      }),
    )

    const resources = Object.fromEntries(pairs)

    return {
      Resources: resources,
    }
  }

  private resolveInstrument(section: Section, instrument: Instrument, resolutions: Resolution[]) {
    const r = instrument.resolve(section)
    resolutions.push(r)
    for (const at of r.children ?? []) {
      this.resolveInstrument(section, at, resolutions)
    }
  }
}
