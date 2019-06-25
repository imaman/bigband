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
 * Naming. Inside every [[Section]], Instruments are arranged in a tree-like hierarchy (similar to the way files are
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
     * Initializes an Instrument.
     * 
     * @param {(string|string[])} packageName the package name of the instrument. See "Naming" above.
     * @param {string} plainName the instrument's simple name (must be unique within its package). See "Naming" above.
     * @memberof Instrument
     */
    constructor(packageName: string|string[], private readonly name: string) {
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
        if (!this.name.trim().length) {
            throw new Error('name cannot be empty');
        }
    }

    /**
     * Declares an inter-instrument dependency. It indicates that this instrument ("the consumer") will use the
     * supplier instrument
     *  
     * @param supplier the supplier instrument.
     * @param name the name of the dependency. 
     */
    uses(supplier: Instrument, name: string) {
        const existingDep = this.dependencies.find(d => d.name === name);
        if (existingDep) {
            throw new Error(`Name conflict. This instrument (${this.fullyQualifiedName()}) already has a dependency named ${name} (on ${existingDep.supplier.fullyQualifiedName()})`);
        }
        this.dependencies.push(new Dependency(this, supplier, name));
    }
    
    /**
     * Returns a [[DeployableFragment]] to be added to the bundle of shipped code
     * @param pathPrefix path to the directory where the compiled sources file will reside
     */
    abstract createFragment(pathPrefix: string): DeployableFragment


    /**
     * Called on supplier instruments (as per the [[uses]] method). This allows supplier instruments to affect the
     * cloudformation template of their consumer insturments. A supplier would typically add an IAM permission to its
     * consumer. 
     * @param section 
     * @param consumerDef 
     */
    abstract contributeToConsumerDefinition(section: Section, consumerDef: Definition): void

    /**
     * Returns the AWS service namespace to be used when constructing the ARN of this instrument. For instance, in a
     * an ARN of a lambda function, "arn:aws:lambda:eu-west-2:111111111111:function:my-function", this is the "lamda"
     * token.
     */
    abstract arnService(): string
    /**
     * Returns the AWS resource name to be used when constructing the ARN of this instrument. For instance, in a
     * an ARN of a lambda function, "arn:aws:lambda:eu-west-2:111111111111:function:my-function", this is the
     * "function" token.
     */
    abstract arnType(): string
    /**
     * Returns the name of the cloudformation property whose value specifies the exact name of the resource. You need
     * to check Cloudformation's "Resource and Property Types Reference" 
     * (https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/aws-template-resource-type-ref.html) to find
     * the exact value. For instance, for a lambda function this would be "FunctionName", wheras for a DynamoDB table
     * this would be "TableName"
     */
    abstract nameProperty(): string
    
    /**
     * Returns the path to a file that needs to be compiled with this instrument. This is needed for instruments
     * that need user-supplied code to be shipped, such as Lambda instruments. An empty string denotes that no node
     * needs to be shipped.
     */
    abstract getEntryPointFile(): string

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
            return this.packageName.concat(this.name).join('-');
        }
        const ret = camelCase(this.packageName.concat(this.name));
        return ret;
    }

    /**
     * Computes the physical name of the instrument at the given section. The physical name contains the names of the
     * enclosing bigband and section as well as the [[fullyQualifiedName]].
     * @param section
     */
    physicalName(section: Section) {
        return `${section.bigband.name}-${section.name}-${this.fullyQualifiedName()}`;
    }
    
    /**
     * Computes the ARN of this instrument at the given section
     * @param section 
     */
    arn(section: Section): string {
        return `arn:aws:${this.arnService()}:${section.region}:${section.bigband.awsAccount}:${this.arnType()}${this.physicalName(section)}`;
    }

    getDefinition() : Definition {
        return this.definition;
    }

    getPhysicalDefinition(section: Section) : Definition {
        const copy = JSON.parse(JSON.stringify(this.definition.get()));
        copy.Properties[this.nameProperty()] = this.physicalName(section);
        return new Definition(copy);
    }
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
