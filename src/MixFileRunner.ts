import * as path from 'path';
import * as fs from 'fs';
import * as AWS from 'aws-sdk';

import {NameStyle, Rig, Instrument, DeployableAtom} from './runtime/Instrument';
import {Packager,ZipBuilder,S3Ref} from './Packager'
import {CloudFormationPusher} from './CloudFormationPusher';
import { UpdateFunctionCodeRequest } from 'aws-sdk/clients/lambda';

export async function runMixFile(mixFile: string, rigName: string, runtimeDir?: string) {
    console.log(`runMixFile(${mixFile}, ${rigName}, ${runtimeDir})`);
    if (runtimeDir && !path.isAbsolute(runtimeDir)) {
        throw new Error(`runtimeDir (${runtimeDir}) is not an absolute path`);
    }
    const mixSpec = compileConfigFile(mixFile, runtimeDir);
    const rig = mixSpec.rigs.find(curr => curr.name === rigName);
    if (!rig) {
        throw new Error(`Failed to find a rig named ${rigName} in ${mixSpec.rigs.map(curr => curr.name).join(', ')}`);
    }
    return runSpec(mixSpec, rig);
}

interface MixSpec {
    rigs: Rig[]
    instruments: Instrument[]
    dir: string
}

export async function runSpec(mixSpec: MixSpec, rig: Rig) {
    const ps = mixSpec.instruments
        .map(instrument => pushCode(mixSpec.dir, rig, instrument));
    const pushedInstruments = await Promise.all(ps);
    const stack = {
        AWSTemplateFormatVersion: '2010-09-09',
        Transform: 'AWS::Serverless-2016-10-31',
        Description: "Backend services for Testim's tagging application",
        Resources: {}
    };

    pushedInstruments.forEach(curr => {
        stack.Resources[curr.logicalResourceName] = curr.resource;
    });

    console.log('stack=\n' + JSON.stringify(stack, null, 2));
    const cfp = new CloudFormationPusher(rig.region);

    await cfp.deploy(stack, rig.physicalName());


    const lambda = new AWS.Lambda({region: rig.region});

    await Promise.all(pushedInstruments.filter(curr => curr.s3Ref.isOk()).map(curr => {
        const updateFunctionCodeReq: UpdateFunctionCodeRequest = {
            FunctionName: curr.physicalName,
            S3Bucket: curr.s3Ref.s3Bucket,
            S3Key: curr.s3Ref.s3Key
        };    
        return lambda.updateFunctionCode(updateFunctionCodeReq).promise();
    }));
    return `deployed ${rig.physicalName()}`;
}

function compileConfigFile(mixFile: string, runtimeDir?: string) {
    const d = path.dirname(path.resolve(mixFile));
    const packager = new Packager(d, d, '', '', '');
    const file = path.parse(mixFile).name;
    const zb = packager.run(`${file}.ts`, 'spec_compiled', runtimeDir);
    const specDeployedDir = packager.unzip(zb, 'spec_deployed')
    console.log('requiring from', process.cwd());
    const ret: MixSpec = require(path.resolve(specDeployedDir, 'build', `${file}.js`)).run();
    console.log('... requiring completed');
    if (!ret.dir) {
        ret.dir = d;
    }
    return ret;
}

async function pushCode(d: string, rig: Rig, instrument: Instrument) {
    const logicalResourceName = instrument.fullyQualifiedName(NameStyle.CAMEL_CASE);
    console.log('logicalResourceName=', logicalResourceName);
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

    const packager = new Packager(d, d, rig.isolationScope.s3Bucket, rig.isolationScope.s3Prefix, rig.region);
    const pathPrefix = 'build';
    const zb: ZipBuilder = packager.run(instrument.getEntryPointFile(), pathPrefix);
    const frag = instrument.createFragment(pathPrefix);

    const mapping = {};
    instrument.dependencies.forEach(d => {
        mapping[d.name] = {name: d.supplier.physicalName(rig), region: rig.region};
        d.supplier.contributeToConsumerDefinition(rig, def);
    });
    frag.add(new DeployableAtom('bigband/deps.js', 
        `module.exports = ${JSON.stringify(mapping)}`));

    zb.importFragment(frag);
    
    const s3Ref = await packager.pushToS3(`deployables/${physicalName}.zip`, zb);
    const resource = def.get();
    resource.Properties.CodeUri = s3Ref.toUri();

    console.log('resource=\n', JSON.stringify(resource, null, 2));
    console.log('s3Ref=', s3Ref.toUri());
    console.log('mapping=', JSON.stringify(mapping, null, 2));
    return {
        s3Ref,
        resource,
        logicalResourceName,
        physicalName
    }
}

