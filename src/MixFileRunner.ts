import * as path from 'path';
import * as fs from 'fs';

import {AwsFactory} from './AwsFactory';
import {NameStyle, Rig, Instrument, DeployableAtom} from './runtime/Instrument';
import {Packager,ZipBuilder,S3Ref} from './Packager'
import {CloudFormationPusher} from './CloudFormationPusher';
import { UpdateFunctionCodeRequest } from 'aws-sdk/clients/lambda';
import { logger } from './logger';

export async function runMixFile(mixFile: string, rigName: string, runtimeDir?: string) {
    if (Number(process.versions.node.split('.')[0]) < 8) {
        throw new Error('You must use node version >= 8 to run this program');
    }
    if (runtimeDir && !path.isAbsolute(runtimeDir)) {
        throw new Error(`runtimeDir (${runtimeDir}) is not an absolute path`);
    }
    const mixSpec = await loadSpec(mixFile, runtimeDir);
    const rig = mixSpec.rigs.find(curr => curr.name === rigName);
    if (!rig) {
        throw new Error(`Failed to find a rig named ${rigName} in ${mixSpec.rigs.map(curr => curr.name).join(', ')}`);
    }
    return runSpec(mixSpec, rig);
}

export interface MixSpec {
    rigs: Rig[]
    instruments: Instrument[]
    dir: string
}

export async function runSpec(mixSpec: MixSpec, rig: Rig) {
    const cfp = new CloudFormationPusher(rig);
    cfp.peekAtExistingStack();
    
    logger.info(`Shipping rig ${rig.name} to ${rig.region}`);
    const ps = mixSpec.instruments
        .map(instrument => pushCode(mixSpec.dir, rig, instrument));
    const pushedInstruments = await Promise.all(ps);
    const stack = {
        AWSTemplateFormatVersion: '2010-09-09',
        Transform: 'AWS::Serverless-2016-10-31',
        Description: "description goes here",
        Resources: {}
    };

    pushedInstruments.forEach(curr => {
        stack.Resources[curr.logicalResourceName] = curr.resource;
    });

    await cfp.deploy(stack)


    const lambda = AwsFactory.fromRig(rig).newLambda();

    await Promise.all(pushedInstruments.filter(curr => curr.s3Ref.isOk()).map(curr => {
        const updateFunctionCodeReq: UpdateFunctionCodeRequest = {
            FunctionName: curr.physicalName,
            S3Bucket: curr.s3Ref.s3Bucket,
            S3Key: curr.s3Ref.s3Key
        };    
        return lambda.updateFunctionCode(updateFunctionCodeReq).promise();
    }));
    return `Rig ${rig.name} shipped.`;
}

export async function loadSpec(mixFile: string, runtimeDir?: string): Promise<MixSpec> {
    const d = path.dirname(path.resolve(mixFile));
    const packager = new Packager(d, d, '', '');
    const file = path.parse(mixFile).name;
    const zb = await packager.run(`${file}.ts`, 'spec_compiled', runtimeDir);
    const specDeployedDir = packager.unzip(zb, 'spec_deployed')
    const ret: MixSpec = require(path.resolve(specDeployedDir, 'build', `${file}.js`)).run();
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

function checkSpec(spec: MixSpec) {
    let dupes = checkDuplicates(spec.rigs.map(r => r.name));
    if (dupes.length) {
        throw new Error(`Found two (or more) rigs with the same name: ${JSON.stringify(dupes)}`);
    }

    dupes = checkDuplicates(spec.instruments.map(r => r.name()));
    if (dupes.length) {
        throw new Error(`Found two (or more) instruments with the same name: ${JSON.stringify(dupes)}`);
    }
}

async function pushCode(d: string, rig: Rig, instrument: Instrument) {
    const logicalResourceName = instrument.fullyQualifiedName(NameStyle.CAMEL_CASE);
    if (!fs.existsSync(d) || !fs.statSync(d).isDirectory()) {
        throw new Error(`Bad value. ${d} is not a directory.`);
    }
    
    const physicalName = instrument.physicalName(rig);
    const def = instrument.getPhysicalDefinition(rig);
    if (!instrument.getEntryPointFile()) {
        return {
            s3Ref: S3Ref.EMPTY,
            resource: def.get(),
            logicalResourceName,
            physicalName
        }
    }

    const packager = new Packager(d, d, rig.isolationScope.s3Bucket, rig.isolationScope.s3Prefix, rig);
    const pathPrefix = 'build';
    logger.info(`Compiling ${instrument.fullyQualifiedName()}`);
    const zb: ZipBuilder = await packager.run(instrument.getEntryPointFile(), pathPrefix);
    const frag = instrument.createFragment(pathPrefix);

    const mapping = {};
    instrument.dependencies.forEach(d => {
        mapping[d.name] = {name: d.supplier.physicalName(rig), region: rig.region};
        d.supplier.contributeToConsumerDefinition(rig, def);
    });
    frag.add(new DeployableAtom('bigband/deps.js', 
        `module.exports = ${JSON.stringify(mapping)}`));

    zb.importFragment(frag);
    
    logger.info(`Pushing code: ${instrument.name()}`);
    const s3Ref = await packager.pushToS3(instrument, `deployables/${physicalName}.zip`, zb);
    const resource = def.get();
    resource.Properties.CodeUri = s3Ref.toUri();

    return {
        s3Ref: S3Ref.EMPTY,
        resource: def.get(),
        logicalResourceName,
        physicalName
    }
}

