import {DeployableFragment} from 'bigband-bootstrap';
import {Rig} from './Rig';
import {Definition} from './Definition';

export enum NameStyle {
    DASH,
    CAMEL_CASE
}


class Dependency {
    constructor(readonly consumer: Instrument, readonly supplier: Instrument, readonly name: string) {}
}

export abstract class Instrument {

    protected readonly definition = new Definition();
    public readonly dependencies: Dependency[] = [];

    constructor(
        private readonly packageName: string,
        private readonly _name: string) {}

    uses(supplier: Instrument, name: string) {
        const existingDep = this.dependencies.find(d => d.name === name);
        if (existingDep) {
            throw new Error(`Name conflict. This instrument (${this.fullyQualifiedName()}) already has a dependency named ${name} (on ${existingDep.supplier.fullyQualifiedName()})`);
        }
        this.dependencies.push(new Dependency(this, supplier, name));
    }

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
    abstract contributeToConsumerDefinition(rig: Rig, consumerDef: Definition): void
    abstract arnService(): string
    abstract arnType(): string
    abstract nameProperty(): string
    abstract getEntryPointFile(): string

    name(): string {
        return this._name;
    }

    fullyQualifiedName(style: NameStyle = NameStyle.DASH) {
        if (style == NameStyle.DASH) {
            return `${this.packageName}-${this.name()}`;
        }

        return camelCase(this.packageName, this.name());
    }

    physicalName(rig: Rig, style: NameStyle = NameStyle.DASH) {
        if (style == NameStyle.DASH) {
            return `${rig.isolationScope.name}-${rig.name}-${this.fullyQualifiedName()}`;
        }

        return camelCase(rig.isolationScope.name, rig.name, this.packageName, this.name());
    }
    
    arn(rig: Rig): string {
        return `arn:aws:${this.arnService()}:${rig.region}:${rig.isolationScope.awsAccount}:${this.arnType()}${this.physicalName(rig)}`;
    }

    getDefinition() : Definition {
        return this.definition;
    }

    getPhysicalDefinition(rig: Rig) : Definition {
        const copy = JSON.parse(JSON.stringify(this.definition.get()));
        copy.Properties[this.nameProperty()] = this.physicalName(rig);
        return new Definition(copy);
    }

    // contributeToConsumerCode(deployable: Deployable) {
    //     throw new Error('Not implemented yet.');
    // }
}

export enum DynamoDbAttributeType {
    STRING = 'S',
    NUMBER = 'N',
    BINARY = 'B'
}

interface DynamoDbAttribute {
    name: string
    type: DynamoDbAttributeType
}


export interface DynamoDbInstrumentOptions {
    provisioned?: {
        readCapacityUnits: number
        writeCapacityUnits: number
    }
    cloudFormationProperties?: any
}

export class DynamoDbInstrument extends Instrument {

    private static readonly BASE_DEF = {
        Type: "AWS::DynamoDB::Table",
        Properties: {}
    }

    constructor(packageName: string, name: string, partitionKey: DynamoDbAttribute, sortKey?: DynamoDbAttribute,
            options: DynamoDbInstrumentOptions = {}) {
        super(packageName, name);

        function toAttributeDefinition(a: DynamoDbAttribute) {
            if (!a.type) {
                throw new Error(`Missing type in attribute ${a.name}`);
            }
            return {
                AttributeName: a.name,
                AttributeType: a.type
            }
        }

        const atts: any[] = [];
        atts.push(toAttributeDefinition(partitionKey));
        sortKey && atts.push(toAttributeDefinition(sortKey));

        const keySchema: any[] = [];
        keySchema.push({AttributeName: partitionKey.name, KeyType: 'HASH'});
        sortKey && keySchema.push({AttributeName: sortKey.name, KeyType: 'RANGE'});

        this.definition.overwrite(DynamoDbInstrument.BASE_DEF);


        let provisioned: any = {
            BillingMode: 'PAY_PER_REQUEST'
        };
        if (options.provisioned) {
            provisioned = {
                BillingMode: 'PROVISIONED',
                ProvisionedThroughput: {
                    ReadCapacityUnits: options.provisioned.readCapacityUnits,
                    WriteCapacityUnits: options.provisioned.writeCapacityUnits
                }    
            }
        };

        this.definition.mutate(o => Object.assign(o.Properties, provisioned, {
            AttributeDefinitions: atts,
            KeySchema: keySchema,
        }));
        this.definition.mutate(o => Object.assign(o.Properties, options.cloudFormationProperties));
    }

    createFragment(pathPrefix: string): DeployableFragment {
        return new DeployableFragment();
    }

    contributeToConsumerDefinition(rig: Rig, consumerDef: Definition): void {
        consumerDef.mutate(o => o.Properties.Policies.push({
            Version: '2012-10-17',
            Statement: [{ 
                Effect: "Allow",
                Action: [
                  'dynamodb:*'
                ],
                Resource: this.arn(rig)
            }]
        }));
    }

    arnService(): string {
        return 'dynamodb';
    }

    arnType(): string {
        return 'table/'
    }

    nameProperty(): string {
        return 'TableName'
    }

    getEntryPointFile(): string {
        return "";
    }
}

function camelCase(...args) {
    function capitalize(s: string) {
        if (!s) {
            throw new Error('Cannot capitalize an empty string');
        }
        return s[0].toUpperCase() + s.substr(1);
    }

    return args.map((curr, i) => i === 0 ? curr : capitalize(curr)).join('');
}

