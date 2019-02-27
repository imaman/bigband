import * as path from 'path';
import * as fs from 'fs';
import * as hash from 'hash.js'
const Module = require('module');

import { AwsFactory } from './AwsFactory';
import { NameStyle, Rig, Instrument, LambdaInstrument } from 'bigband-core';
import { Packager, PushResult } from './Packager'
import { DeployableAtom } from 'bigband-core'
import { ZipBuilder } from 'bigband-bootstrap'
import { S3Ref } from './S3Ref'
import { CloudFormationPusher } from './CloudFormationPusher';
import { UpdateFunctionCodeRequest } from 'aws-sdk/clients/lambda';
import { logger } from './logger';
import { S3BlobPool } from './Teleporter';
import { Misc } from './Misc';

const DEPLOYABLES_FOLDER = 'deployables';

export async function runBigbandFile(bigbandFile: string, rigName: string) {
    const t0 = Date.now();
    if (Number(process.versions.node.split('.')[0]) < 8) {
        throw new Error('You must use node version >= 8 to run this program');
    }
    const bigbandSpec = await loadSpec(bigbandFile);
    const rig = bigbandSpec.rigs.length === 1 && !rigName ? bigbandSpec.rigs[0] : bigbandSpec.rigs.find(curr => curr.name === rigName);
    if (!rig) {
        throw new Error(`Failed to find a rig named ${rigName} in ${bigbandSpec.rigs.map(curr => curr.name).join(', ')}`);
    }

    await Promise.all([runSpec(bigbandSpec, rig), configureBucket(rig)]);
    const dt = (Date.now() - t0) / 1000;
    return `Rig "${rig.name}" shipped in ${dt.toFixed(1)}s`;        
}

export interface BigbandSpec {
    rigs: Rig[]
    instruments: Instrument[]
    dir: string
}

export async function runSpec(bigbandSpec: BigbandSpec, rig: Rig) {
    const cfp = new CloudFormationPusher(rig);
    cfp.peekAtExistingStack();

    const poolPrefix = `${ttlPrefix(rig)}/fragments`;
    const blobPool = new S3BlobPool(AwsFactory.fromRig(rig), rig.isolationScope.s3Bucket, poolPrefix);

    

    const scottyInstrument = new LambdaInstrument('bigband', 'scotty', 'lib/scotty', {
        Description: 'beam me up',
        MemorySize: 2560,
        Timeout: 30
        })
        .fromNpmPackage('bigband-bootstrap')
        .canDo('s3:GetObject', `arn:aws:s3:::${rig.isolationScope.s3Bucket}/${poolPrefix}/*`)
        .canDo('s3:PutObject', `arn:aws:s3:::${rig.isolationScope.s3Bucket}/${rig.isolationScope.s3Prefix}/${DEPLOYABLES_FOLDER}/*`);

    
    logger.info(`Shipping rig "${rig.name}" to ${rig.region}`);

    const ps = bigbandSpec.instruments.map(instrument => 
        pushCode(bigbandSpec.dir, bigbandSpec.dir, rig, instrument, scottyInstrument, blobPool));

    // scotty needs slightly different parameters so we pushCode() it separately. 
    ps.push(pushCode(Misc.bigbandPackageDir(), Misc.bigbandPackageDir(), rig, scottyInstrument, scottyInstrument, blobPool));
    
    const pushedInstruments = await Promise.all(ps);

    const stack = {
        AWSTemplateFormatVersion: '2010-09-09',
        Transform: 'AWS::Serverless-2016-10-31',
        Description: "description goes here",
        Resources: {}
    };

    pushedInstruments.forEach(curr => {
        const def = curr.instrument.getPhysicalDefinition(rig);
        curr.instrument.dependencies.forEach(d => {
            d.supplier.contributeToConsumerDefinition(rig, def);
        });

        if (curr.s3Ref.isOk()) {
            def.mutate(o => o.Properties.CodeUri = curr.s3Ref.toUri());
        }

        stack.Resources[curr.instrument.fullyQualifiedName(NameStyle.CAMEL_CASE)] = def.get();
    });

    await cfp.deploy(stack)
    const lambda = AwsFactory.fromRig(rig).newLambda();

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

export async function loadSpec(bigbandFile: string): Promise<BigbandSpec> {
    if (!bigbandFile) {
        throw new Error('bigbandFile cannot be falsy');
    }
    const d = path.dirname(path.resolve(bigbandFile));
    const packager = new Packager(d, d, '', '');
    const file = path.parse(bigbandFile).name;
    const zb = await packager.run(`${file}.ts`, 'spec_compiled', '');
    const specDeployedDir = packager.unzip(zb, 'spec_deployed');
    const pathToRequire = path.resolve(specDeployedDir, 'build', `${file}.js`);

    const uninstall = installCustomRequire();
    let ret: BigbandSpec
    try {
        console.log('loadSpec from ' + pathToRequire);
        ret = require(pathToRequire).run();
    } finally {
        uninstall();
    }

    if (!ret.dir) {
        ret.dir = d;
    }

    checkSpec(ret);
    return ret;
}


function checkDuplicates(names: string[]): string[] {
    const uniqueNames = new Set<string>(names);
    if (uniqueNames.size === names.length) {
        return [];
    }

    const ret: string[] = [];
    names.forEach(n => {
        if (uniqueNames.has(n)) {
            uniqueNames.delete(n);
        } else {
            ret.push(n);
        }
    });

    return ret;
}

function checkSpec(spec: BigbandSpec) {
    let dupes = checkDuplicates(spec.rigs.map(r => r.name));
    if (dupes.length) {
        throw new Error(`Found two (or more) rigs with the same name: ${JSON.stringify(dupes)}`);
    }

    dupes = checkDuplicates(spec.instruments.map(r => r.name()));
    if (dupes.length) {
        throw new Error(`Found two (or more) instruments with the same name: ${JSON.stringify(dupes)}`);
    }

    // TODO(imaman): validate names!
}

async function pushCode(d: string, npmPackageDir: string, rig: Rig, instrument: Instrument, scottyInstrument: Instrument, blobPool: S3BlobPool) {
    if (!fs.existsSync(d) || !fs.statSync(d).isDirectory()) {
        throw new Error(`Bad value. ${d} is not a directory.`);
    }
    
    const physicalName = instrument.physicalName(rig);
    const def = instrument.getPhysicalDefinition(rig);
    if (!instrument.getEntryPointFile()) {
        return {
            s3Ref: S3Ref.EMPTY,
            wasPushed: false,
            physicalName,
            instrument
        }
    }

    const {zb, packager} = await compileInstrument(d, npmPackageDir, rig, instrument, blobPool);

    const pushResult: PushResult = await packager.pushToS3(instrument, `${DEPLOYABLES_FOLDER}/${physicalName}.zip`, zb, scottyInstrument.physicalName(rig));
    const resource = def.get();
    resource.Properties.CodeUri = pushResult.deployableLocation.toUri();

    return {
        s3Ref: pushResult.deployableLocation,
        wasPushed: pushResult.wasPushed,
        physicalName,
        instrument
    }
}

async function compileInstrument(d: string, npmPackageDir: string, rig: Rig, instrument: Instrument, blobPool: S3BlobPool) {
    try {
        const packager = new Packager(d, npmPackageDir, rig.isolationScope.s3Bucket, rig.isolationScope.s3Prefix, rig, blobPool);
        const pathPrefix = 'build';
        logger.info(`Compiling ${instrument.fullyQualifiedName()}`);
        const frag = instrument.createFragment(pathPrefix);

        const mapping = {};
        instrument.dependencies.forEach(d => {
            mapping[d.name] = {name: d.supplier.physicalName(rig), region: rig.region};
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


function ttlPrefix(rig: Rig) {
    return `${rig.isolationScope.s3Prefix}/TTL/7d`;
}

async function configureBucket(rig: Rig) {
    // You can check the content of the TTL folder via:
    // $ aws s3 ls s3://<isolation_scope_name>/root/TTL/7d/fragments/

    const s3 = AwsFactory.fromRig(rig).newS3();
    const prefix = `${ttlPrefix(rig)}/`;
    const req: AWS.S3.PutBucketLifecycleConfigurationRequest = {
        Bucket: rig.isolationScope.s3Bucket,
        LifecycleConfiguration: {
            Rules: [
                {
                    Expiration: {
                        Days: 7 // Temporarily. change back to 7 once proven working.
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
