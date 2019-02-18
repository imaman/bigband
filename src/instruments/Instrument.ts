import * as fs from 'fs'
import * as path from 'path'



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
            Policies: [],
            Events: {}
        }
    }

    constructor(packageName: string, name: string, private readonly controllerPath: string, cloudFormationProperties: any = {}) {
        super(packageName, name);

        this.definition.overwrite(LambdaInstrument.BASE_DEF);
        this.definition.mutate(o => o.Properties.Handler = `${this.getHandlerFile()}.handle`);
        this.definition.mutate(o => Object.assign(o.Properties, cloudFormationProperties));
    }

    
    invokeEveryMinutes(durationInMinutes: number) {
        if (!Number.isInteger(durationInMinutes)) {
            throw new Error('durationInMinutes must be an integer');
        }

        if (durationInMinutes < 0 || durationInMinutes > 59) {
            throw new Error(`durationInMinutes must be >= 0 and <= 59`);
        }
        const obj = {
            Timer: {
                Type: "Schedule",
                Properties: {
                    Schedule: `cron(0/${durationInMinutes} * * * ? *)`
                }    
            }
        };

        // Resulting event object passed to the lambda function:
        // { 
        //   version: '0',
        //   id: 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee',
        //   'detail-type': 'Scheduled Event',
        //   source: 'aws.events',
        //   account: '222266664444',
        //   time: '2018-03-20T05:06:00Z',
        //   region: 'eu-west-2',
        //   resources: [ 
        //     'arn:aws:events:eu-west-2:222266664444:rule/my-function-name' 
        //   ],
        //   detail: {} 
        // }
      

        this.definition.mutate(o => Object.assign(o.Properties.Events, obj));
        return this;
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
            const fp = require('./bigband/build_manifest.js');

            function handle(event, context, callback) {
                try {
                    Promise.resolve()
                    .then(() => runLambda(context, event, mapping, fp))
                    .then(response => callback(null, response))
                    .catch(e => {
                        console.error('Exception caught from promise flow (event=\\n:' + JSON.stringify(event).substring(0, 1000) + ")\\n\\n", e);
                        callback(e);
                    });
                } catch (e) {
                    console.error('Exception caught:', e);
                    callback(e);
                }
            }

            module.exports = {handle};
        `;

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
    constructor(packageName: string, name: string, controllerPath: string, 
            stream: KinesisStreamInstrument, batchSize: number, cloudFormationProperties: any = {}) {
        super(packageName, name, controllerPath, Object.assign({}, {
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
        }, cloudFormationProperties));
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
    constructor(readonly path: string, readonly content: string) {}

    toString() {
        return `Path: ${this.path}/`;
    }
}

export class DeployableFragment {
    private readonly usedPaths = new Set<string>();
    private readonly atoms: DeployableAtom[] = [];


    add(atom: DeployableAtom): DeployableFragment {
        if (this.usedPaths.has(atom.path)) {
            throw new Error(`Duplicate path: ${atom.path}`);
        }
        this.usedPaths.add(atom.path);
        this.atoms.push(atom);
        return this;
    }

    forEach(f: (DeployableAtom) => void) {
        this.atoms.sort((lhs, rhs) => lhs.path.localeCompare(rhs.path));
        this.atoms.forEach(f);
    }

    scan(pathInFragment: string, absolutePath: string) {
        if (!path.isAbsolute(absolutePath)) {
            throw new Error(`path is not absolute (${absolutePath}).`)
        }
        if (fs.lstatSync(absolutePath).isDirectory()) {
            fs.readdirSync(absolutePath).forEach((f: string) => {
                this.scan(path.join(pathInFragment, f), path.join(absolutePath, f));
            });
        } else {
            const content = fs.readFileSync(absolutePath, 'utf-8');
            const atom = new DeployableAtom(pathInFragment, content);
            this.add(atom);
        }
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
        public readonly s3Bucket: string, public readonly s3Prefix: string,
        public readonly profile: string) {}
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

