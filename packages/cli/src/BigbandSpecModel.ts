import { BigbandSpec, Instrument, Section } from "bigband-core";
import { Misc } from "./Misc";


export interface AssignedInstrument {
    instrument: Instrument
    section: Section
}

export class BigbandSpecModel {
    constructor(private readonly spec: BigbandSpec) {}

    get instruments(): Instrument[] {
        return Misc.flatten(this.spec.sections.map(s => s.instruments))
    }

    get assignedInstruments(): AssignedInstrument[] {
        return Misc.flatten(this.spec.sections.map(s => s.instruments.map(i => ({instrument: i, section: s.section}))))
    }

    get sections(): Section[] {
        return this.spec.sections.map(s => s.section)
    }
}
