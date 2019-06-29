import * as path from 'path';
import * as fs from 'fs';
import * as hash from 'hash.js'
const Module = require('module');

import { AwsFactory } from './AwsFactory';
import { BigbandSpec, SectionSpec, NameStyle, Section, Instrument, LambdaInstrument, WireSpec, Bigband } from 'bigband-core';
import { Packager, PushResult, DeployMode } from './Packager'
import { DeployableAtom } from 'bigband-core'
import { ZipBuilder } from './ZipBuilder'
import { S3Ref } from './S3Ref'
import { CloudFormationPusher } from './CloudFormationPusher';
import { UpdateFunctionCodeRequest } from 'aws-sdk/clients/lambda';
import { logger } from './logger';
import { S3BlobPool } from './Teleporter';
import { Misc } from './Misc';
import { CONTRIVED_NPM_PACAKGE_NAME, CONTRIVED_IN_FILE_NAME } from './scotty';
import { BigbandModel } from './models/BigbandModel';
import { SectionModel } from './models/SectionModel';
import { InstrumentModel } from './models/InstrumentModel';
import { Namer } from './Namer';

const DEPLOYABLES_FOLDER = 'deployables';

export { DeployMode } from './Packager'

function grantPermission(instrument: Instrument, action: string, arn: string) {
    instrument.getDefinition().mutate(o => o.Properties.Policies.push({
        Version: '2012-10-17',
        Statement: [{ 
            Effect: "Allow",
            Action: [
              action,
            ],
            Resource: arn
        }]
    }));
}


interface PushedInstrument {
    s3Ref: S3Ref
    wasPushed: boolean
    physicalName: string
    model: InstrumentModel
}


// TODO(imaman): coverage. can be hard.
export class BigbandFileRunner {
    private readonly poolPrefix: string
    private readonly blobPool: S3BlobPool
    private readonly teleportInstrument: Instrument
    private readonly namer: Namer

    constructor(private readonly bigbandModel: BigbandModel, 
        private readonly sectionModel: SectionModel, 
        private readonly teleportingEnabled: boolean, 
        private readonly deployMode: DeployMode) {
            this.poolPrefix = `${this.ttlPrefix()}/fragments`;
            this.blobPool = new S3BlobPool(AwsFactory.fromSection(this.sectionModel.section), this.bigbandModel.bigband.s3Bucket, this.poolPrefix);
            this.teleportInstrument = new LambdaInstrument(['bigband', 'system'], 'teleport', CONTRIVED_IN_FILE_NAME, {
                Description: 'Rematerializes a deployable at the deployment site',
                MemorySize: 2560,
                Timeout: 30
            }).fromNpmPackage(CONTRIVED_NPM_PACAKGE_NAME);
        
            this.namer = new Namer(bigbandModel, sectionModel)
    
        }

    // TODO(imaman): rename to ship()
    static async runBigbandFile(bigbandFile: string, sectionName: string, teleportingEnabled: boolean, deployMode: DeployMode) {
        const t0 = Date.now();
        if (Number(process.versions.node.split('.')[0]) < 8) {
            throw new Error('You must use node version >= 8 to run this program');
        }
        const bigbandModel = await BigbandFileRunner.loadSpec(bigbandFile);
        const sectionModel = bigbandModel.findSectionModel(sectionName)
        
        const flow = new BigbandFileRunner(bigbandModel, sectionModel, teleportingEnabled, deployMode)

        await Promise.all([flow.runSpec(), flow.configureBucket()]);
        const dt = (Date.now() - t0) / 1000;
        return `Section "${sectionModel.section.name}" shipped in ${dt.toFixed(1)}s`;        
    }

    private async runSpec() {
        const section = this.sectionModel.section
        const cfp = new CloudFormationPusher(section);
        cfp.peekAtExistingStack();
            
        grantPermission(this.teleportInstrument, 's3:GetObject', 
            `arn:aws:s3:::${section.bigband.s3Bucket}/${this.poolPrefix}/*`);
    
        grantPermission(this.teleportInstrument, 's3:PutObject',
            `arn:aws:s3:::${section.bigband.s3Bucket}/${section.bigband.s3Prefix}/${DEPLOYABLES_FOLDER}/*`);
    
    
        logger.info(`Shipping section "${section.name}" to ${section.region}`);
    
        const dir = this.bigbandModel.dir
        if (!dir) {
            throw new Error('Found a fasly dir') 
        }
    
        const ps = this.sectionModel.instruments.map(im => 
            this.pushCode(dir, dir, im));
    
        const teleportModel = new InstrumentModel(this.sectionModel.section, this.teleportInstrument, [], true)
        // teleporter needs slightly different parameters so we pushCode() it separately. 
        ps.push(this.pushCode(Misc.bigbandPackageDir(), dir, teleportModel));
        
        const pushedInstruments = await Promise.all(ps);
    
        const stack = {
            AWSTemplateFormatVersion: '2010-09-09',
            Transform: 'AWS::Serverless-2016-10-31',
            Description: "description goes here",
            Resources: {}
        };
    
        pushedInstruments.forEach(curr => {
            const def = curr.model.instrument.getPhysicalDefinition(section);
            curr.model.wirings.forEach(d => {
                d.supplier.contributeToConsumerDefinition(section, def);
            });
    
            if (curr.s3Ref.isOk()) {
                def.mutate(o => o.Properties.CodeUri = curr.s3Ref.toUri());
            }
    
            stack.Resources[curr.model.instrument.fullyQualifiedName(NameStyle.CAMEL_CASE)] = def.get();
        });
    
        await cfp.deploy(stack)
        const lambda = AwsFactory.fromSection(section).newLambda();
    
        await Promise.all(pushedInstruments.filter(curr => curr.s3Ref.isOk() && curr.wasPushed).map(async curr => {
            const req: UpdateFunctionCodeRequest = {
                FunctionName: curr.physicalName,
                S3Bucket: curr.s3Ref.s3Bucket,
                S3Key: curr.s3Ref.s3Key
            };    
            try {
                return await lambda.updateFunctionCode(req).promise();
            } catch (e) {
                logger.error(`lambda.updateFunctionCode failure (${JSON.stringify(req)})`, e);
                throw new Error(`Failed to update code of ${curr.physicalName}`);
            }
        }));
    }        

    private async pushCode(dir: string, npmPackageDir: string, instrumentModel: InstrumentModel): Promise<PushedInstrument> {
        const model: SectionModel = this.sectionModel             
        if (!fs.existsSync(dir) || !fs.statSync(dir).isDirectory()) {
            throw new Error(`Bad value. ${dir} is not a directory.`);
        }
        
        const section = model.section
        const instrument = instrumentModel.instrument
        const physicalName = instrument.physicalName(section);
        const def = instrument.getPhysicalDefinition(section);
        if (!instrument.getEntryPointFile()) {
            return {
                s3Ref: S3Ref.EMPTY,
                wasPushed: false,
                physicalName,
                model: instrumentModel
            }
        }
    
        const {zb, packager} = await this.compileInstrument(dir, npmPackageDir, instrumentModel);
        const pushResult: PushResult = await packager.pushToS3(instrument, `${DEPLOYABLES_FOLDER}/${physicalName}.zip`, 
            zb, this.teleportInstrument.physicalName(section), this.teleportingEnabled, this.deployMode);
        const resource = def.get();
        resource.Properties.CodeUri = pushResult.deployableLocation.toUri();
    
        return {
            s3Ref: pushResult.deployableLocation,
            wasPushed: pushResult.wasPushed,
            physicalName,
            model: instrumentModel
        }
    }
    
    private async compileInstrument(d: string, npmPackageDir: string, instrumentModel: InstrumentModel) {
        const model: SectionModel = this.sectionModel
        const section = model.section
        const instrument = instrumentModel.instrument
        try {
            const packager = new Packager(d, npmPackageDir, section.bigband.s3Bucket, section.bigband.s3Prefix, section, this.blobPool);
            const pathPrefix = 'build';
            logger.info(`Compiling ${instrument.fullyQualifiedName()}`);
            const frag = instrument.createFragment(pathPrefix);
    
            const mapping = {};
            // TODO(imaman): coverage
            instrumentModel.wirings.forEach(w => {
                mapping[w.name] = {name: w.supplier.physicalName(section), region: section.region};
            });
            frag.add(new DeployableAtom('bigband/deps.js', 
                `module.exports = ${JSON.stringify(mapping)}`));
    
            const sha256 = hash.sha256();
            const atomConsumer = (a: DeployableAtom) => {
                sha256.update(a.path);
                sha256.update(a.content);
            };
    
    
            const zb: ZipBuilder = await packager.run(
                instrument.getEntryPointFile(), 
                pathPrefix, 
                (instrument as LambdaInstrument).getNpmPackage()) as ZipBuilder;
            zb.forEach(atomConsumer);
            frag.forEach(atomConsumer);
    
            const fp = Buffer.from(sha256.digest()).toString('base64');
            frag.add(new DeployableAtom('bigband/build_manifest.js',
                `module.exports = "${fp}";`));
    
            zb.importFragment(frag);
    
            return {zb, packager}
        } catch (e) {
            e.message = `(instrument: "${instrument.fullyQualifiedName()}", rootDir: "${d}", npmPackageDir: "${npmPackageDir}") ${e.message}`;
            throw e;
        }
    }
    
    
    private ttlPrefix() {
        return `${this.bigbandModel.bigband.s3Prefix}/TTL/7d`;
    }     
    
    private async configureBucket() {
        const section = this.sectionModel.section
        // You can check the content of the TTL folder via:
        // $ aws s3 ls s3://<isolation_scope_name>/root/TTL/7d/fragments/
    
        const s3 = AwsFactory.fromSection(section).newS3();
        const prefix = `${this.ttlPrefix()}/`;
        const req: AWS.S3.PutBucketLifecycleConfigurationRequest = {
            Bucket: section.bigband.s3Bucket,
            LifecycleConfiguration: {
                Rules: [
                    {
                        Expiration: {
                            Days: 7
                        },
                        Filter: {
                            Prefix: prefix
                        },
                        ID: "BigbandStandardTTL7D",
                        Status: "Enabled"
                    }
                ]
            }
        };
    
        try {
            await s3.putBucketLifecycleConfiguration(req).promise();
            logger.silly(`expiration policy set via ${JSON.stringify(req)}`);
        } catch (e) {
            console.error(`s3.putBucketLifecycleConfiguration failure (request: ${JSON.stringify(req)})`, e);
            throw new Error(`Failed to set lifecycle policies (bucket: ${req.Bucket}, prefix: ${prefix})`);
        }
    }    


    static async loadSpec(bigbandFile: string): Promise<BigbandModel> {
        if (!bigbandFile) {
            throw new Error('bigbandFile cannot be falsy');
        }
    
        const d = path.dirname(path.resolve(bigbandFile));
        const protcolVersion = readVersionFromRcFile(d);
        const packager = new Packager(d, d, '', '');
        const file = path.parse(bigbandFile).name;
        const zb = await packager.run(`${file}.ts`, 'spec_compiled', '');
        const specDeployedDir = packager.unzip(zb, 'spec_deployed');
        const pathToRequire = path.resolve(specDeployedDir, 'build', `${file}.js`);
    
        const uninstall = installCustomRequire();
        let bigbandSpec: BigbandSpec
        try {
            logger.silly(`Loading compiled bigbandfile from ${pathToRequire} using protocolversion ${protcolVersion}`);
            bigbandSpec = require(pathToRequire).run();
        } finally {
            uninstall();
        }
    
        return new BigbandModel(bigbandSpec, d)
    }    
}


let numChangesToModuleRequire = 0;
function installCustomRequire() {
    if (numChangesToModuleRequire > 0) {
        throw new Error(`numChangesToModuleRequire expected to be zero (was: ${numChangesToModuleRequire})`);
    }

    numChangesToModuleRequire += 1;
    const originalRequire = Module.prototype.require;

    function runOriginalRequire(m, arg) {
        return originalRequire.apply(m, [arg]);
    }

    Module.prototype.require = function(arg) {
        try {
            return runOriginalRequire(this, arg);
        } catch (err) {
            if (!err.message.startsWith("Cannot find module ")) {
                throw err;
            }

            let dir = Misc.bigbandPackageDir();
            if (path.basename(path.dirname(dir)) === 'node_modules') {
                dir = path.dirname(path.dirname(dir));
            }

            return runOriginalRequire(this, path.resolve(dir, 'node_modules', arg));
        }
    };


    return () => { 
        if (numChangesToModuleRequire !== 1) {
            throw new Error('More than one change to Module.require()');
        }
        Module.prototype.require = originalRequire;
        --numChangesToModuleRequire;
    };
}

function readVersionFromRcFile(dir: string) {
    try {
        const p = path.resolve(path.resolve(dir, '.bigbandrc'));
        const pojo = JSON.parse(fs.readFileSync(p, 'utf-8'));
        return pojo.bigbandFileProtocolVersion;
    } catch (e) {
        return -1;
    }
}






// TODO list:
// + rig -> section (in the public API)
// + rename scotty to bigand-system-teleport
// + add a special version indication at dataplatform
// - introduce a metric-monster npm with intruments + source code for superclasses
// - migrate metric-machine to reuse metric-monster
// - deploy the tagging ui to github.testim.io
// - new CLI language
// - show telport in the CLI (logs, list)
// - migrate dataplatform lambdas to the new stubs. get rid of the rogue abstratcontroller there
// - injected stubs
//
// - hard to understand error message when tsc compilation fails (for instance, error in the bigband file)
// - improve parsing of the output of npm ls. Sepcficially, it looks like the devDependencies just mentions the names of deps.
//     These deps are listed under "dependencies" so cross filtering is needed.
// - add checking of names. in particular, "bigband" and "bigband-system" should be reserved.
//     We probably want to disallow the use of hyphens inside logical names as they are used as separators.
// - consider changing "package" to something different (to avoid collision with "NPM packages")
// - bigbandfilerunner should be a class
// - rig -> section (in the impl)
// - unit tests for as much of /cli/src/ as possible

