import * as path from 'path';
import * as fs from 'fs';
import * as hash from 'hash.js'
const Module = require('module');

import { AwsFactory } from './AwsFactory';
import { NameStyle, Section, Instrument, LambdaInstrument } from 'bigband-core';
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

const DEPLOYABLES_FOLDER = 'deployables';

export {DeployMode} from './Packager'

export function grantPermission(instrument: Instrument, action: string, arn: string) {
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

export async function runBigbandFile(bigbandFile: string, sectionName: string, teleportingEnabled: boolean, deployMode: DeployMode) {
    const t0 = Date.now();
    if (Number(process.versions.node.split('.')[0]) < 8) {
        throw new Error('You must use node version >= 8 to run this program');
    }
    const bigbandSpec = await loadSpec(bigbandFile);
    const section = bigbandSpec.sections.length === 1 && !sectionName ? bigbandSpec.sections[0] : bigbandSpec.sections.find(curr => curr.name === sectionName);
    if (!section) {
        throw new Error(`Failed to find a section named ${sectionName} in ${bigbandSpec.sections.map(curr => curr.name).join(', ')}`);
    }

    await Promise.all([runSpec(bigbandSpec, section, teleportingEnabled, deployMode), configureBucket(section)]);
    const dt = (Date.now() - t0) / 1000;
    return `Section "${section.name}" shipped in ${dt.toFixed(1)}s`;        
}

export interface BigbandSpec {
    sections: Section[]
    instruments: Instrument[]
    dir: string
}

export async function runSpec(bigbandSpec: BigbandSpec, section: Section, teleportingEnabled: boolean, deployMode: DeployMode) {
    // Check that user-supplied instruments do not put instruments inside the "bigband" package (as "bigband" is
    // reserved for bigband's own use).
    // Naturally, this check must take place before we introduce bigband's own instruments.
    const violation = bigbandSpec.instruments.find(curr => curr.fullyQualifiedName().toLowerCase().startsWith('bigband'))
    if (violation) {
        throw new Error(`Instrument "${violation.fullyQualifiedName()}" has a bad name: the fully qualified name of\n`
            + `an\n instrument is not allowed to start with "bigband"`);
    }

    const cfp = new CloudFormationPusher(section);
    cfp.peekAtExistingStack();

    const poolPrefix = `${ttlPrefix(section)}/fragments`;
    const blobPool = new S3BlobPool(AwsFactory.fromSection(section), section.bigband.s3Bucket, poolPrefix);

    const teleportInstrument = new LambdaInstrument(['bigband', 'system'], 'teleport', CONTRIVED_IN_FILE_NAME, {
        Description: 'Rematerializes a deployable at the deployment site',
        MemorySize: 2560,
        Timeout: 30
        })
        .fromNpmPackage(CONTRIVED_NPM_PACAKGE_NAME)
        .canDo('s3:GetObject', `arn:aws:s3:::${section.bigband.s3Bucket}/${poolPrefix}/*`)
        .canDo('s3:PutObject', `arn:aws:s3:::${section.bigband.s3Bucket}/${section.bigband.s3Prefix}/${DEPLOYABLES_FOLDER}/*`);


    logger.info(`Shipping section "${section.name}" to ${section.region}`);

    const ps = bigbandSpec.instruments.map(instrument => 
        pushCode(bigbandSpec.dir, bigbandSpec.dir, section, instrument, teleportInstrument, blobPool, teleportingEnabled, deployMode));

    // scotty needs slightly different parameters so we pushCode() it separately. 
    ps.push(pushCode(Misc.bigbandPackageDir(), bigbandSpec.dir, section, teleportInstrument, teleportInstrument, blobPool, teleportingEnabled, deployMode));
    
    const pushedInstruments = await Promise.all(ps);

    const stack = {
        AWSTemplateFormatVersion: '2010-09-09',
        Transform: 'AWS::Serverless-2016-10-31',
        Description: "description goes here",
        Resources: {}
    };

    pushedInstruments.forEach(curr => {
        const def = curr.instrument.getPhysicalDefinition(section);
        curr.instrument.dependencies.forEach(d => {
            d.supplier.contributeToConsumerDefinition(section, def);
        });

        if (curr.s3Ref.isOk()) {
            def.mutate(o => o.Properties.CodeUri = curr.s3Ref.toUri());
        }

        stack.Resources[curr.instrument.fullyQualifiedName(NameStyle.CAMEL_CASE)] = def.get();
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

export async function loadSpec(bigbandFile: string): Promise<BigbandSpec> {
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
    let ret: BigbandSpec
    try {
        logger.silly(`Loading compiled bigbandfile from ${pathToRequire} using protocolversion ${protcolVersion}`);
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
    let dupes = checkDuplicates(spec.sections.map(r => r.name));
    if (dupes.length) {
        throw new Error(`Found two (or more) sections with the same name: ${JSON.stringify(dupes)}`);
    }

    dupes = checkDuplicates(spec.instruments.map(r => r.fullyQualifiedName()));
    if (dupes.length) {
        throw new Error(`Found two (or more) instruments with the same name: ${JSON.stringify(dupes)}`);
    }

    // TODO(imaman): validate names!
}

async function pushCode(dir: string, npmPackageDir: string, section: Section, instrument: Instrument, 
    teleportInstrument: Instrument,  blobPool: S3BlobPool, teleportingEnabled: boolean, deployMode: DeployMode) {
    if (!fs.existsSync(dir) || !fs.statSync(dir).isDirectory()) {
        throw new Error(`Bad value. ${dir} is not a directory.`);
    }
    
    const physicalName = instrument.physicalName(section);
    const def = instrument.getPhysicalDefinition(section);
    if (!instrument.getEntryPointFile()) {
        return {
            s3Ref: S3Ref.EMPTY,
            wasPushed: false,
            physicalName,
            instrument
        }
    }

    const {zb, packager} = await compileInstrument(dir, npmPackageDir, section, instrument, blobPool);
    const pushResult: PushResult = await packager.pushToS3(instrument, `${DEPLOYABLES_FOLDER}/${physicalName}.zip`, 
        zb, teleportInstrument.physicalName(section), teleportingEnabled, deployMode);
    const resource = def.get();
    resource.Properties.CodeUri = pushResult.deployableLocation.toUri();

    return {
        s3Ref: pushResult.deployableLocation,
        wasPushed: pushResult.wasPushed,
        physicalName,
        instrument
    }
}

async function compileInstrument(d: string, npmPackageDir: string, section: Section, instrument: Instrument, blobPool: S3BlobPool) {
    try {
        const packager = new Packager(d, npmPackageDir, section.bigband.s3Bucket, section.bigband.s3Prefix, section, blobPool);
        const pathPrefix = 'build';
        logger.info(`Compiling ${instrument.fullyQualifiedName()}`);
        const frag = instrument.createFragment(pathPrefix);

        const mapping = {};
        instrument.dependencies.forEach(d => {
            mapping[d.name] = {name: d.supplier.physicalName(section), region: section.region};
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


function ttlPrefix(section: Section) {
    return `${section.bigband.s3Prefix}/TTL/7d`;
}

async function configureBucket(section: Section) {
    // You can check the content of the TTL folder via:
    // $ aws s3 ls s3://<isolation_scope_name>/root/TTL/7d/fragments/

    const s3 = AwsFactory.fromSection(section).newS3();
    const prefix = `${ttlPrefix(section)}/`;
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

