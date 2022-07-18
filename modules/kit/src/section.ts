export interface Section {
  partition: string
  region: string
  account: string
  sectionName: string
}

export interface ResolvedSection extends Section {
  bigbandName: string
}
