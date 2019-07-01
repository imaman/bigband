import { Instrument, Definition, Section, Bigband } from "bigband-core";
import { ResolvedName } from "./ResolvedName";
import { Misc } from "./Misc";

export class Namer {
    constructor(private readonly bigband: Bigband, private readonly section: Section) {}

    physicalName(instrument: Instrument): string {
        return `${this.bigband.name}-${this.section.name}-${instrument.fullyQualifiedName()}`;
    }

    resolve(instrument: Instrument) {
        const physicalName = this.physicalName(instrument)
        const arn = `arn:aws:${instrument.arnService()}:${this.section.region}:` + 
                `${this.bigband.awsAccount}:${instrument.arnType()}${physicalName}`;

        return new ResolvedName(instrument.fullyQualifiedName(), physicalName, arn)
    }

    /**
     * Computes the physical name of the given instrument. The physical name contains the names of the
     * enclosing bigband and section as well as the fully-qualified-name of the instrument.
     * @param instrument
     */    
    getPhysicalDefinition(instrument: Instrument) : Definition {
        const copy = JSON.parse(JSON.stringify(instrument.getDefinition().get()));
        copy.Properties[instrument.nameProperty()] = this.physicalName(instrument)
        return new Definition(copy);
    }

    static toPascalCase(tokens: string[]) {
        if (tokens.find(curr => curr.toLowerCase() != curr)) {
            throw new Error('One of the tokens contains a capital letter')
        }

        if (tokens.find(curr => curr.indexOf("--") >= 0)) {
            throw new Error(`One of the tokens ("buffered--input") contains multiple consecutive dash signs`)
        }
        
        return Misc.flatten(tokens.map(curr => curr.split("-"))
            .filter(s => Boolean(s)))
            .map(curr => curr.substr(0, 1).toUpperCase() + curr.substr(1)).join('')
    }
}
