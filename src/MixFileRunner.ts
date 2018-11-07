import * as path from 'path';
import * as fs from 'fs';
import * as AWS from 'aws-sdk';

import {NameStyle, Rig, Instrument} from './runtime/Instrument';
import {Packager,ZipBuilder} from './Packager'
import {CloudFormationPusher} from './CloudFormationPusher';
import { UpdateFunctionCodeRequest } from 'aws-sdk/clients/lambda';

export async function runMixFile(mixFile: string, runtimeDir: string, rigName: string) {
    if (!path.isAbsolute(runtimeDir)) {
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
    const ps = mixSpec.instruments.map(instrument => pushCode(mixSpec.dir, rig, instrument));
    const pushedFunctions = await Promise.all(ps);
    const stack = {
        AWSTemplateFormatVersion: '2010-09-09',
        Transform: 'AWS::Serverless-2016-10-31',
        Description: "Backend services for Testim's tagging application",
        Resources: {}
    };

    pushedFunctions.forEach(curr => {
        stack.Resources[curr.logicalResourceName] = curr.functionResource;
    });

    console.log('stack=\n' + JSON.stringify(stack, null, 2));
    const cfp = new CloudFormationPusher(rig.region);

    await cfp.deploy(stack, rig.physicalName());


    const lambda = new AWS.Lambda({region: rig.region});

    await Promise.all(pushedFunctions.map(curr => {
        const updateFunctionCodeReq: UpdateFunctionCodeRequest = {
            FunctionName: curr.physicalName,
            S3Bucket: curr.s3Ref.s3Bucket,
            S3Key: curr.s3Ref.s3Key
        };    
        return lambda.updateFunctionCode(updateFunctionCodeReq).promise();
    }));
    return `deployed ${rig.physicalName()}`;
}

function compileConfigFile(mixFile: string, runtimeDir: string) {
    const d = path.dirname(path.resolve(mixFile));
    const packager = new Packager(d, d, '', '');
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
    
    const packager = new Packager(d, d, rig.isolationScope.s3Bucket, rig.isolationScope.s3Prefix);
    const pathPrefix = 'build';
    const zb: ZipBuilder = packager.run(instrument.getEntryPointFile(), pathPrefix);
    zb.importFragment(instrument.createFragment(pathPrefix));
    
    const physicalName = instrument.physicalName(rig);
    const s3Ref = await packager.pushToS3(`deployables/${physicalName}.zip`, zb);

    const functionResource = instrument.getPhysicalDefinition(rig).get();
    functionResource.Properties.CodeUri = s3Ref.toUri();

    return {
        s3Ref,
        functionResource,
        logicalResourceName,
        physicalName
    }
}

function composeCamelCaseName(...args: string[]) {
    if (args.some(x => !x.length)) {
        throw new Error('One of the name components was empty');
    }

    return args.map((curr, i) => i === 0 ? curr : curr[0].toUpperCase() + curr.substr(1)).join('');
}

function composeName(...args: string[]) {
    if (args.some(x => !x.length)) {
        throw new Error('One of the name components was empty');
    }
    return args.join('-');
}

