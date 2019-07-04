import { Instrument, Definition, Section, Bigband, NameStyle } from "bigband-core";
import { ResolvedName } from "./ResolvedName";

export class Namer {
    constructor(private readonly bigband: Bigband, private readonly section: Section) {}

    physicalName(instrument: Instrument): string {
        return `${this.bigband.name}-${this.section.name}-${instrument.fullyQualifiedName()}`;
    }

    path(instrument: Instrument): string {
        return `${this.section.region}/${this.section.name}/${instrument.fullyQualifiedName(NameStyle.SLASH)}`;
    }

    resolve(instrument: Instrument) {
        const physicalName = this.physicalName(instrument)
        const arn = `arn:aws:${instrument.arnService()}:${this.section.region}:` + 
                `${this.bigband.awsAccount}:${instrument.arnType()}${physicalName}`;

        // TODO(imaman): omit dashes from the arn and physical names. use dashses only for separating path components:
        //      <reg>-<sec>-<p1>-<p2>-<namme>
        // This will help in reducing the length of the physical name/ARN
        // TODO(imaman): validate that no two instruments have the same dash-omitted physical name
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
}
