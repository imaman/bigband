import * as YAML from 'yamljs';
import * as JSZip from 'jszip';
const settings: any = {
    DEPLOYABLES_FOLDER: 'deployables'
};

export abstract class Instrument {

    protected readonly definition = new Definition();

    constructor(
        private readonly packageName: string,
        private readonly _name: string) {}

    abstract createFragment();
    abstract contributeToConsumerDefinition(rig: Rig, consumerDef: Definition);
    abstract arnType(): string;
    abstract nameProperty(): string

    name(): string {
        return this._name;
    }

    fullyQualifiedName() {
        return `${this.packageName}-${this.name()}`;
    }

    physicalName(rig: Rig) {
        return `${rig.isolationScope.name}-${rig.name}-${this.fullyQualifiedName()}`;
    }
    
    arn(rig: Rig): string {
        return `arn:aws:lambda:${rig.region}:${rig.isolationScope.awsAccount}:${this.arnType()}:${this.physicalName(rig)}`;
    }

    getDefinition() : Definition {
        return this.definition;
    }

    getPhysicalDefinition(rig: Rig) : Definition {
        const temp = {};
        const copy = JSON.parse(JSON.stringify(this.definition.get()));
        copy.Properties.CodeUri = `s3://${rig.isolationScope.s3Bucket}/${rig.isolationScope.s3Prefix}/${settings.DEPLOYABLES_FOLDER}/${this.physicalName(rig)}.zip`;
        copy.Properties[this.nameProperty()] = this.physicalName(rig);
        temp[this.fullyQualifiedName()] = copy;
        return new Definition(temp);
    }

    contributeToConsumerCode(deployable: Deployable) {
        throw new Error('Not implemented yet.');
    }
}

class LambdaInstrument extends Instrument {
    private static readonly BASE_DEF = {
        Type: "AWS::Serverless::Function",
        Properties: {
            Runtime: "nodejs8.10",
            Policies: []
        }
    }

    constructor(packageName: string, name: string, private readonly controllerPath?: string, cloudFormationProperties: any = {}) {
        super(packageName, name);

        this.definition.overwrite(LambdaInstrument.BASE_DEF);
        this.definition.mutate(o => o.Properties.Handler = `${this.getHandlerFile()}.handle`);
        this.definition.mutate(o => Object.assign(o.Properties, cloudFormationProperties));
    }
    
    arnType(): string {
        return 'function';
    }

    nameProperty(): string {
        return 'FunctionName';
    }

    private getHandlerFile() {
        return this.fullyQualifiedName() + '_Handler';
    }

    createFragment() {
        const fragment = new DeployableFragment();
        fragment.add(new DeployableAtom(this.getHandlerFile() + '.js', `
            const c = require('${this.controllerPath}');
            console.log('controller=', c.toString());
        `));
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


export function newLambda(packageName: string, name: string, controllerPath?: string, cloudFormationProperties?: any) {
    return new LambdaInstrument(packageName, name, controllerPath, cloudFormationProperties);
}

export class Rig {
    constructor(public readonly isolationScope: IsolationScope, 
        public readonly region: string, public readonly name: string) {}    
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
        Object.assign(this.obj, o);
    }

    get() {
        return this.obj;
    }

    toYml(): string {
        return YAML.stringify(this.obj, 4);
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

export class Deployable {
    private readonly fragments: DeployableFragment[] = [];
    add(fragment: DeployableFragment) {
        this.fragments.push(fragment);
    }

    storeIn(jsZip: JSZip) {
        this.fragments.forEach(fragment => {
            fragment.forEach(atom => jsZip.file(atom.path, atom.content));
        });
    }
}

export class IsolationScope {
    constructor(public readonly awsAccount: string, public readonly name: string,
        public readonly s3Bucket: string, public readonly s3Prefix: string) {}
}
