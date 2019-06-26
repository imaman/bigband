import { BigbandSpec, Instrument, Section, WireSpec, SectionSpec } from "bigband-core";
import { Misc } from "./Misc";
import { SectionSpecModel } from "./SectionSpecModel";


export interface AssignedInstrument {
    instrument: Instrument
    section: Section
}

export class BigbandSpecModel {
    constructor(private readonly spec: BigbandSpec) {}

    findSectionModel(sectionName: string): SectionSpecModel {
        const models = this.sectionModels
        const ret = models.length === 1 && !sectionName ? models[0] : models.find(curr => curr.section.name === sectionName);
        if (!ret) {
            throw new Error(`Failed to find a section named ${sectionName} in ${models.map(curr => curr.section.name).join(', ')}`);
        }    

        return ret
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

    get sectionModels(): SectionSpecModel[] {
        return this.spec.sections.map(s => new SectionSpecModel(s))
    }

    validate() {
        this.sectionModels.forEach(curr => curr.validate())
    }
}
