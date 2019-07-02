import { BigbandSpec, Instrument, Section, Bigband } from "bigband-core";
import { Misc } from "../Misc";
import { SectionModel } from "./SectionModel";
import { InstrumentModel } from "./InstrumentModel";
import { Namer } from "../Namer";
import { NameValidator } from "../NameValidator";


export interface AssignedInstrument {
    instrument: Instrument
    section: Section
}


export interface LookupResult {
    section: Section
    sectionModel: SectionModel
    instrumentModel: InstrumentModel
    instrument: Instrument
    physicalName: string
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

    get bigband(): Bigband {
        return this.spec.bigband
    }

    searchInstrument(instrumentName: string): LookupResult {
        const matches: LookupResult[] = [];
        const names: string[] = [];    
        const exactMatches: LookupResult[] = []
    

       this.sections.forEach(sectionModel => {
            sectionModel.instruments.forEach(curr => {
                const physicalName = new Namer(this.bigband, sectionModel.section).physicalName(curr.instrument)
                const lookupResult: LookupResult = {
                    section: sectionModel.section, 
                    instrument: curr.instrument, 
                    instrumentModel: curr,
                    physicalName, 
                    sectionModel
                };

                if (curr.instrument.name == instrumentName) {
                    exactMatches.push(lookupResult)
                } 
                names.push(physicalName);
                if (physicalName.indexOf(instrumentName) >= 0) {
                    matches.push(lookupResult);
                }
            });
        });

        if (exactMatches.length === 1) {
            return exactMatches[0]
        }
    
        if (!matches.length) {
            throw new Error(`Instrument "${instrumentName}" not found in ${JSON.stringify(names)}`);
        }
    
        if (matches.length > 1) {
            throw new Error(`Multiple matches on "${instrumentName}": ${JSON.stringify(matches.map(x => x.physicalName))}`);
        }
    
        return matches[0];    
    }

    findSectionModel(sectionName: string): SectionModel {
        const sections = this.sections
        const ret = sections.length === 1 && !sectionName ? sections[0] : sections.find(curr => curr.section.name === sectionName);

        const names = sections.map(curr => curr.section.name).join(', ')
        if (!ret && !sectionName) {
            throw new Error(`You must pass a --section. Currently defined sections: ${names}`)
        }
        if (!ret) {
            throw new Error(`Failed to find a section named "${sectionName || ''}" in ${names}`);
        }    

        return ret
    }

    private get sections(): SectionModel[] {
        return this.spec.sections.map(s => new SectionModel(this.bigband, s))
    }

    computeList() {
        const ret = {};
        const bigbandObject = {}
        ret[this.bigband.name] = bigbandObject;
        this.sections.forEach(sectionModel => {
            const secObject = {};
            bigbandObject[sectionModel.section.name] = secObject;
            const namer = new Namer(this.bigband, sectionModel.section)
            sectionModel.instruments.forEach(curr => 
                secObject[namer.physicalName(curr.instrument)] = curr.instrument.arnService());
        });
    
        return ret;    
    }

    navigate(path_: string) {
        const acc: any[] = [];

        this.sections.forEach(curr => {
            acc.push({path: curr.section.region, role: Role.REGION, subPath: ''})
        })
        const instruments: InstrumentModel[]  = Misc.flatten(this.sections.map(s => s.instruments))
        instruments.forEach(i => {
            acc.push({path: i.path, role: Role.INSTRUMENT, subPath: '', type: i.instrument.arnService() })
        })

        console.log('acc=\n' + JSON.stringify(acc, null, 2))

        const path = path_.length ? path_ + '/' : path_
        const matchingPaths = acc
            .filter(curr => curr.path.startsWith(path))
            .map(curr => generateEntry(curr, path))

        console.log('matchingPaths=\n' + JSON.stringify(matchingPaths, null, 2))
        const set = new Set<String>()

        const chosen = matchingPaths.filter(curr => {
            if (set.has(curr.subPath)) {
                return false
            } 

            set.add(curr.subPath)
            return true
        })

        chosen.sort((a, b) => a.subPath.localeCompare(b.subPath))
        console.log('chosen=\n' + JSON.stringify(chosen, null, 2))

        return {list: chosen}
    }

    validate() {
        if (!NameValidator.isOk(this.bigband.name)) { 
            throw new Error(`Bad bigband name: "${this.bigband.name}"`)
        }
        this.sections.forEach(curr => curr.validate())

        let dupes = Misc.checkDuplicates(this.sections.map(s => s.section.name));
        if (dupes.length) {
            throw new Error(`Section name collision. The following names were used by two (or more) sections: ${JSON.stringify(dupes)}`);
        }

        const instruments: InstrumentModel[] = Misc.flatten(this.sections.map(s => s.instruments))
        dupes = Misc.checkDuplicates(instruments.map(curr => curr.physicalName))
        if (dupes.length) {
            throw new Error('Instrument name collision. The following names were used by two (or more) instruments: ' +
                    JSON.stringify(dupes));
        }
        
        // TODO(imaman): validate name length + characters
    }
}
function trimAt(p: string, stopAt: string) {
    const index = p.indexOf(stopAt)
    if (index < 0) {
        return p
    }

    return p.substr(0, index)
}

export enum Role {
    REGION,
    SECTION,
    PATH,
    INSTRUMENT
}

function generateEntry(i: any, path: string) {
    const pathSuffix = i.path.substr(path.length)
    const trimmedPath = trimAt(pathSuffix, "/")
    const isPath = trimmedPath != pathSuffix


    i.subPath = trimmedPath
    if (isPath) {
        i.role = Role.PATH
        i.path = path + trimmedPath
        delete i.type
    }

    return i
}