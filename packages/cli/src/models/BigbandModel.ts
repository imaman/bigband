import { BigbandSpec, Instrument, Section, WireSpec, SectionSpec } from "bigband-core";
import { Misc } from "../Misc";
import { SectionModel } from "./SectionModel";


export interface AssignedInstrument {
    instrument: Instrument
    section: Section
}


export interface LookupResult {
    section: Section
    instrument: Instrument
    name: string
}

export class BigbandModel {

    public readonly dir: string
    constructor(private readonly spec: BigbandSpec, defaultDir: string) {
        if (!defaultDir) {
            throw new Error('defaultDir cannot be falsy')
        }

        this.dir = spec.dir || defaultDir
        this.validate()
    }

    // TODO(imaman): coverage
    searchInstrument(lambdaName: string) {
        let matches: LookupResult[] = [];
        const names: string[] = [];    
    
       this.sectionModels.forEach(sectionSpec => {
            sectionSpec.instruments.forEach(curr => {
                const name = curr.instrument.physicalName(sectionSpec.section);
                names.push(name);
                if (name.indexOf(lambdaName) >= 0) {
                    matches.push({section: sectionSpec.section, instrument: curr.instrument, name});
                }
            });
        });
    
        if (!matches.length) {
            throw new Error(`Function ${lambdaName} not found in ${JSON.stringify(names)}`);
        }
    
        if (matches.length > 1) {
            throw new Error(`Multiple matches on ${lambdaName}: ${JSON.stringify(matches.map(x => x.name))}`);
        }
    
        return matches[0];    
    }

    findSectionModel(sectionName: string): SectionModel {
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

    get sectionModels(): SectionModel[] {
        return this.spec.sections.map(s => new SectionModel(s))
    }

    validate() {
        // TODO(imaman): check that a single bigband is used
        this.sectionModels.forEach(curr => curr.validate())
    }
}
