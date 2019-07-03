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


export interface InsepctResult {
    list: InspectedItem[]
}


interface InspectedItem {
    path: string
    role: Role
    subPath: string
    type?: string
    instrument?: InstrumentModel
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

    // TODO(imaman): section name is not enough for finding a section. you need the region too.
    // TODO(imaman): rename this method
    findSectionModel(path: string): SectionModel {
        const sections: SectionModel[] = this.sections
        const ret = sections.find(curr => curr.section.path === path)

        const names = sections.map(curr => curr.section.path).join(', ')
        if (!ret) {
            throw new Error(`Failed to find a section at "${path || ''}". Valids section paths are: ${names}`);
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

    inspect(path_: string): InsepctResult {
        const acc: InspectedItem[] = [];

        this.sections.forEach(curr => {
            acc.push({path: curr.section.region, role: Role.REGION, subPath: ''})
            acc.push({path: curr.section.path, role: Role.SECTION, subPath: ''})
        })
        const instruments: InstrumentModel[]  = Misc.flatten(this.sections.map(s => s.instruments))
        for (const i of instruments) {
            const item = {
                path: i.path,
                role: Role.INSTRUMENT,
                subPath: '',
                type: i.instrument.arnService(),
                instrument: i 
            }

            if (i.path === path_) {
                return {list: [item]}
            }
            acc.push(item)
        }

        const path = path_.length ? path_ + '/' : path_
        const matchingPaths = acc
            .filter(curr => curr.path.startsWith(path))
            .map(curr => generateEntry(curr, path))

        const set = new Set<String>()
        const chosen = matchingPaths.filter(curr => {
            if (set.has(curr.subPath)) {
                return false
            } 

            set.add(curr.subPath)
            return true
        })

        chosen.sort((a, b) => a.subPath.localeCompare(b.subPath))

        return {list: chosen}
    }

    searchInspect(path: string): LookupResult {
        const {list}  = this.inspect(path)
        if (list.length > 1) {
            throw new Error(`Multiple matches on "${path}": ${JSON.stringify(list.map(x => x.path))}`);
        }    

        if (!list.length) {
            throw new Error(`No instrument found under "${path}"`)
        }

        const first: InspectedItem = list[0]
        const x = first
        if (first.role !== Role.INSTRUMENT || !first.instrument) {
            throw new Error(`The specifeid path (${path}) does not refer to an instrument`)
        }

        const section = first.instrument.section
        const sectionModel = this.findSectionModel(section.path)

        return  {
            instrumentModel: first.instrument,
            instrument: first.instrument.instrument,
            physicalName: first.instrument.physicalName,
            section,
            sectionModel
        }
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


        const sectionByInstrument = new Map<Instrument, Set<Section>>()
        for (const s of this.sections) {
            for(const im of s.instruments) {
                let set = sectionByInstrument.get(im.instrument)
                if (!set) {
                    set = new Set<Section>()
                    sectionByInstrument.set(im.instrument, set)
                }

                set.add(im.section)
            }
        }
       
        for (const s of this.sections) {
            for (const w of s.wires) {
                const set = sectionByInstrument.get(w.supplier)
                const supplierSection = w.supplierSection || s.section
                if (!set) {
                    throw new Error(`Instrument "${w.supplier.fullyQualifiedName()}" cannot be used as a supplier because it is not placed in any section`)
                }
                if (!set.has(supplierSection)) {
                    throw new Error(`Instrument "${w.supplier.fullyQualifiedName()}" cannot be used as a supplier because it is not a member of the ${supplierSection.name} section`)
                }
            }
        }

        // const wiringsWithbadSuppliers = this.spec.wiring.filter(w => !set.has(w.supplier))
        // if (wiringsWithbadSuppliers.length) {
        //     const w = wiringsWithbadSuppliers[0]
        //     throw new Error(`Instrument "${w.supplier.fullyQualifiedName()}" cannot be used as a supplier because ` + 
        //         `it is not a member of the "${this.section.name}" section`)
        // }

        
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