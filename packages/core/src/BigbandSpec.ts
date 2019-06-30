import {Instrument} from './Instrument'
import {Section} from './Section'
import { Bigband } from './Bigband';

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
    bigband: Bigband
    sections: SectionSpec[]
    dir?: string
}

