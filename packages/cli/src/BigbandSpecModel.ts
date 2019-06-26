import { BigbandSpec, Instrument, Section, WireSpec, SectionSpec } from "bigband-core";
import { Misc } from "./Misc";
import { SectionSpecModel } from "./SectionSpecModel";


export interface AssignedInstrument {
    instrument: Instrument
    section: Section
}

export class BigbandSpecModel {
    constructor(private readonly spec: BigbandSpec) {}

    get sectionModels(): SectionSpecModel[] {
        return this.spec.sections.map(curr => new SectionSpecModel(curr))
    }

    findSectionModel(sectionName: string): SectionSpecModel {
        const sectionSpec = this.spec.sections.length === 1 && !sectionName ? this.spec.sections[0] : this.spec.sections.find(curr => curr.section.name === sectionName);
        if (!sectionSpec) {
            throw new Error(`Failed to find a section named ${sectionName} in ${this.spec.sections.map(curr => curr.section.name).join(', ')}`);
        }    


        return new SectionSpecModel(sectionSpec)
    }
    
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
