export interface Location {
  readonly offset: number
}

export interface Span {
  from: Location
  to: Location
}

export interface Location2d {
  line: number
  col: number
}
