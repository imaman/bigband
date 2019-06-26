import { BigbandSpec, Instrument, Section, WireSpec, SectionSpec } from "bigband-core";
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

    getWiringsOf(instrument: Instrument, section: Section): WireSpec[] {
        const sectionSpec: SectionSpec|undefined = this.spec.sections.find(s => s.section === section)
        if (!sectionSpec) {
            return []
        }

        return sectionSpec.wiring.filter(w => w.consumer === instrument)
    }
}
