import {Instrument} from './Instrument'
import {Section} from './Section'

export interface SectionSpec {
    section: Section
    instruments: Instrument[]
    wiring: WireSpec[]
}

export interface WireSpec {
    consumer: Instrument 
    supplier: Instrument
    name: string
}
export interface BigbandSpec {
    sections: SectionSpec[]
    dir: string
}

