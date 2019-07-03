import { BigbandSpec, Instrument, Section, Bigband } from "bigband-core";
import { Misc } from "../Misc";
import { SectionModel } from "./SectionModel";
import { InstrumentModel } from "./InstrumentModel";
import { Namer } from "../Namer";
import { NameValidator } from "../NameValidator";



interface Pathable {
    path: string
}

function byPath(a: Pathable, b: Pathable) {
    return a.path.localeCompare(b.path)
}

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

    private readonly sectionByPath = new Map<string, SectionModel>()
    private readonly instrumentByPath = new Map<string, InstrumentModel>()

    public readonly dir: string
    constructor(private readonly spec: BigbandSpec, defaultDir: string) {
        if (!defaultDir) {
            throw new Error('defaultDir cannot be falsy')
        }

        this.dir = spec.dir || defaultDir

        for (const s of spec.sections) {
            // we create an array, pass it down to the sectionmodel and then populate it. Due to the absence of
            // package-visibility in typescript, this trick allow us to create mututally-dependent object without having
            // them exposed state-mutating methods.
            const acc: InstrumentModel[] = []
            const sm = new SectionModel(this.spec.bigband, s, acc)
            if (this.sectionByPath.has(sm.path)) {
                throw new Error(`Section path collision. two (or more) sections share the same path: "${sm.path}"`)
            }
            this.sectionByPath.set(sm.path, sm)

            for (const i of s.instruments) {
                const wires = s.wiring.filter(w => w.consumer === i)
                const im = new InstrumentModel(this.spec.bigband, s.section, i, wires, false)
                if (this.instrumentByPath.has(im.path)) {
                    throw new Error(`Instrument path collision. two (or more) instruments share the same path: "${im.path}"`)
                }
                this.instrumentByPath.set(im.path, im)
                acc.push(im)
            }

            acc.sort(byPath)
        }

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
        const ret = this.sectionByPath.get(path)

        const names = this.sections.map(curr => curr.path).join(', ')
        if (!ret) {
            throw new Error(`Failed to find a section at "${path || ''}". Valids section paths are: ${names}`);
        }    

        return ret
    }

    private get sections(): SectionModel[] {
        const ret = [...this.sectionByPath.values()]
        ret.sort(byPath)
        return ret
    }

    private get instruments(): InstrumentModel[] {
        const ret = [...this.instrumentByPath.values()]
        ret.sort(byPath)
        return ret
    }

    inspect(path_: string): InsepctResult {
        const acc: InspectedItem[] = [];

        this.sections.forEach(curr => {
            acc.push({path: curr.section.region, role: Role.REGION, subPath: ''})
            acc.push({path: curr.path, role: Role.SECTION, subPath: ''})
        })
        for (const i of this.instruments) {
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
        const list = this.inspect(path).list
        if (list.length > 1) {
            throw new Error(`Multiple matches on "${path}": ${JSON.stringify(list.map(x => x.path))}`);
        }    

        if (!list.length) {
            throw new Error(`No instrument found under "${path}"`)
        }

        const first: InspectedItem = list[0]
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
