import {DeployableFragment} from './DeployableFragment';
import {Section} from './Section';
import {Definition} from './Definition';

export enum NameStyle {
    DASH,
    CAMEL_CASE
}


class Dependency {
    constructor(readonly consumer: Instrument, readonly supplier: Instrument, readonly name: string) {}
}


/** 
 * Bigband's basic building block. Usually corresponds to an AWS resources such as: a Lambda function, a DynamoDB
 * table, a Kinesis stream, etc.
 * 
 * Naming. Inside every Section, Instruments are arranged in a tree-like hierarchy (similar to the way filews are
 * arranged in directories). This enables logical grouping of related instruments. The packageName (denoting a "path
 * in the tree") is specified as an array of string: ["p1", "p2", "p3"] denotes a package nested inside the
 * ["p1", "p2"] package. For brevity, a packageName can also be specified as a plain string: "p1" is equivalent to
 * ["p1"]. The instrument's plain name is must be unique within its package. In other words: two instruments can have
 * the same simple name if they belond to two different packages.
 */
export abstract class Instrument {

    protected readonly definition = new Definition();
    public readonly dependencies: Dependency[] = [];
    private readonly packageName: string[];


    /**
     * Creates an instance of Instrument.
     * 
     * @param {(string|string[])} packageName the package name of the instrument. See "Naming" above.
     * @param {string} plainName the instrument's simple name (must be unique within its package). See "Naming" above.
     * @memberof Instrument
     */
    constructor(packageName: string|string[], private readonly _name: string) {
        this.packageName = (Array.isArray(packageName) ? packageName : [packageName]);
        if (!this.packageName.join('').trim().length) {
            throw new Error('pacakge name cannot be empty');
        }

        const withHyphen = this.packageName.find(curr => curr.includes('-'));
        if (withHyphen) {
            throw new Error(`The hyphen symbol is not allowed in package names. Found: "${withHyphen}"`);
        }

        const withUpperCase = this.packageName.find(curr => curr.search(/[A-Z]/) >= 0)
        if (withUpperCase) {
            throw new Error(`Upper-case symbols are not allowed in package names. Found: "${withUpperCase}"`);
        }
        if (!this._name.trim().length) {
            throw new Error('name cannot be empty');
        }
    }

    uses(supplier: Instrument, name: string) {
        const existingDep = this.dependencies.find(d => d.name === name);
        if (existingDep) {
            throw new Error(`Name conflict. This instrument (${this.fullyQualifiedName()}) already has a dependency named ${name} (on ${existingDep.supplier.fullyQualifiedName()})`);
        }
        this.dependencies.push(new Dependency(this, supplier, name));
    }

    
    /**
     * Add an IAM permission to this instrument
     *
     * @param {string} action the action to be allowed 
     * @param {string} arn specifies the resource that this instrument is being granted permission to access   
     * @returns this
     * @memberof Instrument
     */
    canDo(action: string, arn: string) {
        this.definition.mutate(o => o.Properties.Policies.push({
            Version: '2012-10-17',
            Statement: [{ 
                Effect: "Allow",
                Action: [
                  action,
                ],
                Resource: arn
            }]
        }));      
        return this;
    }

    abstract createFragment(pathPrefix: string): DeployableFragment
    abstract contributeToConsumerDefinition(section: Section, consumerDef: Definition): void
    abstract arnService(): string
    abstract arnType(): string
    abstract nameProperty(): string
    abstract getEntryPointFile(): string

    name(): string {
        return this._name;
    }


    /**
     * Computes the full name of this instrument. The full name is a composition of the "last name" (as specified by the
     * package name) with the "first name" (this instrument's name)
     *
     * @param {NameStyle} [style=NameStyle.DASH] determines how to concatenate the different pieces of the name
     * @returns the full qualified name
     * @memberof Instrument
     */
    fullyQualifiedName(style: NameStyle = NameStyle.DASH) {
        if (style == NameStyle.DASH) {
            return this.packageName.concat(this.name()).join('-');
        }
        const ret = camelCase(this.packageName.concat(this.name()));
        return ret;
    }

    physicalName(section: Section) {
        return `${section.isolationScope.name}-${section.name}-${this.fullyQualifiedName()}`;
    }
    
    arn(section: Section): string {
        return `arn:aws:${this.arnService()}:${section.region}:${section.isolationScope.awsAccount}:${this.arnType()}${this.physicalName(section)}`;
    }

    getDefinition() : Definition {
        return this.definition;
    }

    getPhysicalDefinition(section: Section) : Definition {
        const copy = JSON.parse(JSON.stringify(this.definition.get()));
        copy.Properties[this.nameProperty()] = this.physicalName(section);
        return new Definition(copy);
    }

    // contributeToConsumerCode(deployable: Deployable) {
    //     throw new Error('Not implemented yet.');
    // }
}

function camelCase(...args) {
    function capitalize(s: string) {
        if (!s) {
            throw new Error('Cannot capitalize an empty string');
        }
        return s[0].toUpperCase() + s.substr(1);
    }

    return [].concat(...args).map((curr, i) => i === 0 ? curr : capitalize(curr)).join('');
}
