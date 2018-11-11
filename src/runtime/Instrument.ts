const settings: any = {
    DEPLOYABLES_FOLDER: 'deployables'
};


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
            throw new Error(`Name conflict. There is always a dependency named ${name} on ${existingDep.supplier.fullyQualifiedName()}`);
        }
        this.dependencies.push(new Dependency(this, supplier, name));
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
        // copy.Properties.CodeUri = `s3://${rig.isolationScope.s3Bucket}/${rig.isolationScope.s3Prefix}/${settings.DEPLOYABLES_FOLDER}/${this.physicalName(rig)}.zip`;
        copy.Properties[this.nameProperty()] = this.physicalName(rig);
        return new Definition(copy);
    }

    // contributeToConsumerCode(deployable: Deployable) {
    //     throw new Error('Not implemented yet.');
    // }
}

class LambdaInstrument extends Instrument {
    private static readonly BASE_DEF = {
        Type: "AWS::Serverless::Function",
        Properties: {
            Runtime: "nodejs8.10",
            Policies: []
        }
    }

    constructor(packageName: string, name: string, private readonly controllerPath: string, cloudFormationProperties: any = {}) {
        super(packageName, name);

        this.definition.overwrite(LambdaInstrument.BASE_DEF);
        this.definition.mutate(o => o.Properties.Handler = `${this.getHandlerFile()}.handle`);
        this.definition.mutate(o => Object.assign(o.Properties, cloudFormationProperties));
    }
    
    arnService(): string {
        return 'lambda'
    }

    arnType(): string {
        return 'function:';
    }

    nameProperty(): string {
        return 'FunctionName';
    }

    getEntryPointFile(): string {
        return this.controllerPath;
    }

    private getHandlerFile() {
        return this.fullyQualifiedName() + '_Handler';
    }

    createFragment(pathPrefix: string) {
        const fragment = new DeployableFragment();
        const content = `
            const {runLambda} = require('./${pathPrefix}/${this.getEntryPointFile()}');
            const mapping = require('./bigband/deps.js');

            function handle(event, context, callback) {
                try {
                    Promise.resolve()
                    .then(() => runLambda(context, event, mapping))
                    .then(response => callback(null, response))
                    .catch(e => {
                        console.error('Exception caught from promise flow (event=\\n:' + JSON.stringify(event) + ")\\n\\n", e);
                        callback(e);
                    });
                } catch (e) {
                    console.error('Exception caught:', e);
                    callback(e);
                }
            }

            module.exports = {handle};
        `;

        console.log('content=\n' + content);
        fragment.add(new DeployableAtom(this.getHandlerFile() + '.js', content));
        return fragment;
    }

    contributeToConsumerDefinition(rig: Rig, consumerDef: Definition) {
        consumerDef.mutate(o => o.Properties.Policies.push({
            Version: '2012-10-17',
            Statement: [{ 
                Effect: "Allow",
                Action: [
                  'lambda:InvokeFunction'
                ],
                Resource: this.arn(rig)
            }]
        }));
    }
}


export function newLambda(packageName: string, name: string, controllerPath: string, cloudFormationProperties?: any) {
    return new LambdaInstrument(packageName, name, controllerPath, cloudFormationProperties);
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


export class DynamoDbInstrument extends Instrument {

    private static readonly BASE_DEF = {
        Type: "AWS::DynamoDB::Table",
        Properties: {}
    }

    constructor(packageName: string, name: string, partitionKey: DynamoDbAttribute, sortKey: DynamoDbAttribute, readCapacityUnits: number, writeCapacityUnits: number, cloudFormationProperties?: any) {
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
        this.definition.mutate(o => Object.assign(o.Properties, {
            AttributeDefinitions: atts,
            KeySchema: keySchema,
            ProvisionedThroughput: {
                ReadCapacityUnits: readCapacityUnits,
                WriteCapacityUnits: writeCapacityUnits
            }
        }));
        this.definition.mutate(o => Object.assign(o.Properties, cloudFormationProperties));
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


export class KinesisStreamInstrument extends Instrument {
    private static readonly BASE_DEF = {
        Type: "AWS::Kinesis::Stream",
        Properties: {
            RetentionPeriodHours: 24,
        }
    }

    constructor(packageName: string, name: string, shardCount: number) {
        super(packageName, name);

        this.definition.overwrite(KinesisStreamInstrument.BASE_DEF);
        this.definition.mutate(o => Object.assign(o.Properties, {
            ShardCount: shardCount
        }));
    }

    arnService() {
        return 'kinesis'
    }

    arnType() {
        return 'stream/'
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
                  'kinesis:*'
                ],
                Resource: this.arn(rig)
            }]
        }));
    }
    
    nameProperty(): string {
        return 'Name';
    }

    getEntryPointFile(): string {
        return "";
    }
}

export class KinesisStreamConsumer extends LambdaInstrument {
    constructor(packageName: string, name: string, controllerPath: string, stream: KinesisStreamInstrument, batchSize: number) {
        super(packageName, name, controllerPath, {
            Events: {
                Stream: {
                    Type: "Kinesis",
                    Properties: {
                        Stream: { "Fn::GetAtt" : [ stream.fullyQualifiedName(NameStyle.CAMEL_CASE), "Arn" ] },
                        BatchSize: batchSize,
                        StartingPosition: "LATEST"
                    }
                }
            }
        });
    }
}

export class Rig {
    constructor(public readonly isolationScope: IsolationScope, 
        public readonly region: string, public readonly name: string) {}    

    physicalName() {
        return `${this.isolationScope.name}-${this.name}`;
    }        
}

export class Definition {
    private readonly obj;

    constructor(obj: any = {}) { 
        this.obj = obj;
    }

    mutate(f: (any) => void) {
        f(this.obj);
    }

    overwrite(o: any) {
        const copy = JSON.parse(JSON.stringify(o));
        Object.assign(this.obj, copy);
    }

    get() {
        return this.obj;
    }
}


export class DeployableAtom {
    constructor(readonly path, readonly content) {}

    toString() {
        return `Path: ${this.path}/`;
    }
}

export class DeployableFragment {
    private readonly usedPaths = new Set<string>();
    private readonly atoms: DeployableAtom[] = [];

    add(atom: DeployableAtom) {
        if (this.usedPaths.has(atom.path)) {
            throw new Error(`Duplicate path: ${atom.path}`);
        }
        this.usedPaths.add(atom.path);
        this.atoms.push(atom);
    }

    forEach(f: (DeployableAtom) => void) {
        this.atoms.forEach(f);
    }

    toString() {
        return `#Atoms: ${this.atoms.length} -- ${this.atoms.slice(0, 10).join('; ')}...`;
    }
}

// export class Deployable {
//     private readonly fragments: DeployableFragment[] = [];
//     add(fragment: DeployableFragment) {
//         this.fragments.push(fragment);
//     }

//     storeIn(jsZip: JSZip) {
//         this.fragments.forEach(fragment => {
//             fragment.forEach(atom => jsZip.file(atom.path, atom.content));
//         });
//     }
// }

export class IsolationScope {
    constructor(public readonly awsAccount: string, public readonly name: string,
        public readonly s3Bucket: string, public readonly s3Prefix: string) {}
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