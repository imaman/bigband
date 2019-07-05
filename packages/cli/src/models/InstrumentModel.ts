import { Instrument, Section, Bigband } from "bigband-core";
import { Misc } from "../Misc";
import { Namer } from "../Namer";
import { NameValidator } from "../NameValidator";
import { WireModel } from "./WireModel";
import { NavigationNode, InspectedItem } from "../NavigationNode";
import { Role } from "./BigbandModel";

export class InstrumentModel {
    constructor(private readonly bigband: Bigband, public readonly section: Section, public readonly instrument: Instrument,
        // TODO(imaman): make wirings private
        // TODO(imaman): rename to wires
        public readonly wirings: WireModel[], private readonly isSystemInstrument) {}

    get physicalName(): string {
        return new Namer(this.bigband, this.section).physicalName(this.instrument)
    }

    get path(): string {
        return new Namer(this.bigband, this.section).path(this.instrument)
    }

    get arn(): string {
        const namer = new Namer(this.bigband, this.section)
        return namer.resolve(this.instrument).arn
    }

    validate() {
        if (!NameValidator.isOk(this.instrument.name)) {
            throw new Error(`Bad instrument name: "${this.instrument.fullyQualifiedName()}"`)
        }
        // Reserve the "bigband" top-level package for system instruments.
        if (!this.isSystemInstrument) {
            const topLevel = this.instrument.topLevelPackageName
            const fqn = this.instrument.fullyQualifiedName()
            if (topLevel.toLowerCase() == 'bigband') {
                throw new Error(`Instrument "${fqn}" has a bad name: the fully qualified name of ` +
                    'an instrument is not allowed to start with "bigband"');
            }    
        }

        const dups = Misc.checkDuplicates(this.wirings.map(w => w.name))
        if (dups.length) {
            throw new Error(`Name collision(s) in wiring of "${this.physicalName}": ${JSON.stringify(dups)}`)
        }
    }

    generateNavigationNodes(root: NavigationNode) {
        let node = root.navigate(this.section.path)
        if (!node) {
            throw new Error(`Path ${this.section.path} leads to nowhere`)
        }

        const acc: string[] = []

        acc.push(this.section.path)

        const tokens = this.instrument.path.split('/')
        for (let i = 0; i < tokens.length; ++i) {
            const curr = tokens[i]
            acc.push(curr)
            let item: InspectedItem
            if (i === tokens.length - 1) {
                item = {
                    path: acc.join('/'),
                    role: Role.INSTRUMENT,
                    subPath: '',
                    type: this.instrument.arnService()
                }
            } else {
                item = {
                    path: acc.join('/'),
                    role: Role.PATH,
                    subPath: ''
                }
            }
            node = node.addChild(curr, item)
        }

        return node
    }
}
