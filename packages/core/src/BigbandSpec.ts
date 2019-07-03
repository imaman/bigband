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
    name: string
    supplier: Instrument
    supplierSection?: Section
}
export interface BigbandSpec {
    bigband: Bigband
    sections: SectionSpec[]
    dir?: string
}

