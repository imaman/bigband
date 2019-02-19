import * as path from 'path';
import * as fs from 'fs';
import * as hash from 'hash.js'

import { AwsFactory } from './AwsFactory';
import { NameStyle, Rig, Instrument, DeployableAtom, newLambda } from './instruments/Instrument';
import { Packager, PushResult } from './Packager'
import { ZipBuilder } from './ZipBuilder'
import { S3Ref } from './S3Ref'
import { CloudFormationPusher } from './CloudFormationPusher';
import { UpdateFunctionCodeRequest } from 'aws-sdk/clients/lambda';
import { logger } from './logger';
import { S3BlobPool } from './Teleporter';


const DEPLOYABLES_FOLDER = 'deployables';

export async function runBigbandFile(bigbandFile: string, rigName: string, runtimeDir?: string) {
    const t0 = Date.now();
    if (Number(process.versions.node.split('.')[0]) < 8) {
        throw new Error('You must use node version >= 8 to run this program');
    }
    if (runtimeDir && !path.isAbsolute(runtimeDir)) {
        throw new Error(`runtimeDir (${runtimeDir}) is not an absolute path`);
    }
    const bigbandSpec = await loadSpec(bigbandFile, runtimeDir);
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

    
    const rootDir = path.resolve(__dirname).replace('/build/src', '');

    const scottyInstrument = newLambda('bigbandBootstrap', 'scotty', 'src/bootstrap/scotty', {
        Description: 'beam me up',
        MemorySize: 2560,
        Timeout: 30
        })
        .canDo('s3:GetObject', `arn:aws:s3:::${rig.isolationScope.s3Bucket}/${poolPrefix}/*`)
        .canDo('s3:PutObject', `arn:aws:s3:::${rig.isolationScope.s3Bucket}/${rig.isolationScope.s3Prefix}/${DEPLOYABLES_FOLDER}/*`);

    
    logger.info(`Shipping rig "${rig.name}" to ${rig.region}`);

    const ps = bigbandSpec.instruments.map(instrument => 
        pushCode(bigbandSpec.dir, bigbandSpec.dir, rig, instrument, scottyInstrument, blobPool));
    
    // pushCode of scotty needs slightly different parameters so we run it separately. Then, we can safely add scotty
    // to the list of instruments.
    ps.push(pushCode(rootDir, rootDir, rig, scottyInstrument, scottyInstrument, blobPool));
    
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
        console.log('curr.physicalName=' + curr.physicalName + ' wasPushed=' + curr.wasPushed + ', dest=' + curr.s3Ref.toString());
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

export async function loadSpec(bigbandFile: string, runtimeDir?: string): Promise<BigbandSpec> {
    if (!bigbandFile) {
        throw new Error('bigbandFile cannot be falsy');
    }
    const d = path.dirname(path.resolve(bigbandFile));
    const packager = new Packager(d, d, '', '');
    const file = path.parse(bigbandFile).name;
    const zb = await packager.run(`${file}.ts`, 'spec_compiled', runtimeDir);
    const specDeployedDir = packager.unzip(zb, 'spec_deployed')
    const ret: BigbandSpec = require(path.resolve(specDeployedDir, 'build', `${file}.js`)).run();
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

        const zb: ZipBuilder = await packager.run(instrument.getEntryPointFile(), pathPrefix) as ZipBuilder;
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
    const s3 = AwsFactory.fromRig(rig).newS3();
    const prefix = `${ttlPrefix(rig)}/`;
    const req: AWS.S3.PutBucketLifecycleConfigurationRequest = {
        Bucket: rig.isolationScope.s3Bucket,
        LifecycleConfiguration: {
            Rules: [
                {
                    Expiration: {
                        Days: 1 // Temporarily. change back to 7 once proven working.
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
