import { BigbandSpec, Instrument, Section, Bigband, NavigationItem, Role } from "bigband-core";
import { Misc } from "../Misc";
import { SectionModel } from "./SectionModel";
import { InstrumentModel } from "./InstrumentModel";
import { NameValidator } from "../NameValidator";
import { WireModel } from "./WireModel";
import { NavigationNode } from "../NavigationNode";



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
    list: NavigationItem[]
    data?: any
}


export class BigbandModel {

    private readonly sectionByPath = new Map<string, SectionModel>()
    private readonly instrumentModelByPath = new Map<string, InstrumentModel>()

    public readonly dir: string
    constructor(private readonly spec: BigbandSpec, defaultDir: string) {
        if (!defaultDir) {
            throw new Error('defaultDir cannot be falsy')
        }

        this.dir = spec.dir || defaultDir

        const wiresByInstrumentPath = new Map<string, WireModel[]>()
        for (const s of spec.sections) {
            // we create an array, pass it down to the sectionmodel and then populate it. Due to the absence of
            // package-visibility in typescript, this trick allow us to create mututally-dependent object without having
            // them exposed state-mutating methods.
            const acc: InstrumentModel[] = []
            const sm = new SectionModel(this, s.section, acc)
            if (this.sectionByPath.has(sm.path)) {
                throw new Error(`Section path collision. two (or more) sections share the same path: "${sm.path}"`)
            }
            this.sectionByPath.set(sm.path, sm)

            for (const i of s.instruments) {
                // Again, we create an array pass it down to the created object (InstrumentModel) and mutate it
                // later - to avoid state-mutating methods on the created object.
                const wires: WireModel[] = []
                
                const im = new InstrumentModel(this.spec.bigband, sm, i, wires, false)
                if (this.instrumentModelByPath.has(im.path)) {
                    throw new Error(`Instrument path collision. two (or more) instruments share the same path: "${im.path}"`)
                }
                this.instrumentModelByPath.set(im.path, im)
                acc.push(im)
                wiresByInstrumentPath.set(im.path, wires)
            }

            acc.sort(byPath)
        }

        for (const s of spec.sections) {
            const sm = this.sectionByPath.get(s.section.path)
            if (!sm) {
                throw new Error(`SectionModel not found (path=${s.section.path})`)
            }
            for (const w of s.wiring) {
                const consumer = sm.getInstrumentModel(w.consumer)
                if (!consumer) {
                    throw new Error(`Instrument "${w.consumer.sectionRelativeName}" cannot be used as a consumer ` +
                        `because it is not a member of the "${sm.path}" section`)
                }
                
                const supplierSection: Section = w.supplierSection || s.section
                const supplierSectionModel = this.sectionByPath.get(supplierSection.path)
                if (!supplierSectionModel) {
                    throw new Error(`Bad wire. Supplier section "${supplierSection.path}" is not a member of ` + 
                        'the bigband')
                }
                const supplier = supplierSectionModel.getInstrumentModel(w.supplier)
                if (!supplier) {
                    throw new Error(`Bad wire. Supplier section "${supplierSectionModel.path}" does not contain ` + 
                        `the given supplier instrument ("${w.supplier.sectionRelativeName}")`)
                }

                const wireModel = new WireModel(w, consumer, supplier)
                const wires = wiresByInstrumentPath.get(consumer.path)
                if (!wires) {
                    throw new Error(`Inconceivable. No wires were found (path=${consumer.path})`)
                }
                wires.push(wireModel)
            }
        }

        for (const wires of wiresByInstrumentPath.values()) {
            wires.sort((a, b) => a.name.localeCompare(b.name))
        }

        // TODO(imaman): test that an instrument has all of its wiremodels, sorted

        this.validate()
    }

    get bigband(): Bigband {
        return this.spec.bigband
    }

    get profileName(): string {
        return this.spec.bigband.profileName
    }

    /**
     * Fetches an instrument by its full path. Throws an exception if not found.
     *
     * @param {string} path
     * @returns {InstrumentModel}
     */
    getInstrument(path: string): InstrumentModel {
        const ret = this.instrumentModelByPath.get(path)
        if (!ret) {
            throw new Error(`No instrument was found at path "${path}"`)
        }
        return ret
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
        const ret = [...this.instrumentModelByPath.values()]
        ret.sort(byPath)
        return ret
    }

    async inspect(path_: string, includeSynthetic = true): Promise<InsepctResult> {
        const root = new NavigationNode("", {
            path: '',
            role: Role.BIGBAND
        })
        for (const curr of this.sections) {
            curr.generateNavigationNodes(root)
        }

        for (const i of this.instruments) {
            i.generateNavigationNodes(root, includeSynthetic)
        }

        const path = path_
        const navNode = root.navigate(path)

        if (!navNode) {
            return {list: []}
        }


        if (navNode.children.length) {
            return {list: navNode.children.map(curr => curr.item)}
        }

        return {list: [navNode.item]}
    }

    async searchInspect(path: string): Promise<LookupResult> {
        const list = (await this.inspect(path, false)).list
        if (list.length > 1) {
            throw new Error(`Multiple matches on "${path}": ${JSON.stringify(list.map(x => x.path))}`);
        }    

        if (!list.length) {
            throw new Error(`No instrument found under "${path}"`)
        }

        const first: NavigationItem = list[0]
        if (first.role !== Role.INSTRUMENT) {
            throw new Error(`The specifeid path (${path}) does not refer to an instrument`)
        }

        const instrument = this.getInstrument(first.path)
        const sectionModel = this.findSectionModel(instrument.section.path)

        return  {
            instrumentModel: instrument,
            instrument: instrument.instrument,
            physicalName: instrument.physicalName,
            section: instrument.section.section,
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

                set.add(im.section.section)
            }
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

