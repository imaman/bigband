import { BigbandSpec, Instrument, Section, WireSpec, SectionSpec } from "bigband-core";
import { Misc } from "./Misc";
import { SectionSpecModel } from "./SectionSpecModel";


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

    getSetionModel(section: Section): SectionSpecModel {
        const sectionSpec = this.spec.sections.find(s => s.section === section)
        if (!sectionSpec) {
            throw new Error(`The given section (${section.name}) was not found`)
        }

        return new SectionSpecModel(sectionSpec)
    }

    getWiringsOf(instrument: Instrument, section: Section): WireSpec[] {
        const m = this.getSetionModel(section)
        return m.getWiringsOf(instrument)
    }
}
