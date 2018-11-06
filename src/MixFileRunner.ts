import * as path from 'path';
import * as fs from 'fs';
import * as AWS from 'aws-sdk';

import {NameStyle, IsolationScope,newLambda,Rig, Instrument} from './runtime/Instrument';
import {Packager,ZipBuilder} from './Packager'
import {CloudFormationPusher} from './CloudFormationPusher';
import { UpdateFunctionCodeRequest } from 'aws-sdk/clients/lambda';

export async function runMixFile(mixFile: string, runtimeDir: string) {
    if (!path.isAbsolute(runtimeDir)) {
        throw new Error(`runtimeDir (${runtimeDir}) is not an absolute path`);
    }
    const config = compileConfigFile(mixFile, runtimeDir);
    runSpec(config);
}

interface MixSpec {
    rigs: Rig[]
    instruments: Instrument[]
    dir: string
}

function crossProduct<T, U>(ts: T[], us: U[]): Array<[T, U]> {
    const ret = new Array<[T, U]>();
    ts.forEach(t => {
        us.forEach(u => {
            ret.push([t, u]);
        })
    })

    return ret;
}

export async function runSpec(mixSpec: MixSpec) {
    const ps = crossProduct(mixSpec.rigs, mixSpec.instruments).map(([rig, instrument]: [Rig, Instrument]) => {
        ship(mixSpec.dir, rig, instrument);
    });
    return await Promise.all(ps);
}

function compileConfigFile(mixFile: string, runtimeDir: string) {
    const d = path.dirname(path.resolve(mixFile));
    const packager = new Packager(d, d, '', '');
    const file = 'servicemix.config'
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


function injectHandler(zipBuilder: ZipBuilder, pathToHandlerFile, pathToControllerFile) {
    function validate(name, value) {
        if (value.startsWith('.')) {
            throw new Error(`Leading dot not allowed. Argument name: ${name}, value: "${pathToControllerFile}"`);
        }
    
        if (path.isAbsolute(value)) {
            throw new Error(`Absolute path not allowed. Argument name: ${name}, value: "${pathToControllerFile}"`);
        }    
    }

    validate('pathToHandlerFile', pathToHandlerFile);
    validate('pathToControllerFile', pathToControllerFile);

    const content = `
        const {runLambda} = require('./${pathToControllerFile}');

        function handle(event, context, callback) {
            try {
                Promise.resolve()
                .then(() => runLambda(context, event))
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

    zipBuilder.add(pathToHandlerFile, content);
}

async function ship(d: string, rig: Rig, instrument: Instrument) {
    const logicalResourceName = instrument.fullyQualifiedName(NameStyle.CAMEL_CASE);
    console.log('logicalResourceName=', logicalResourceName);
    if (!fs.existsSync(d) || !fs.statSync(d).isDirectory()) {
        throw new Error(`Bad value. ${d} is not a directory.`);
    }
    
    const packager = new Packager(d, d, rig.isolationScope.s3Bucket, rig.isolationScope.s3Prefix);
    const pathPrefix = 'build';
    const zb: ZipBuilder = packager.run(instrument.getEntryPointFile(), pathPrefix);
    zb.importFragment(instrument.createFragment(pathPrefix));
    
    // injectHandler(zb, 'handler.js', 'build/' + functionConfig.controller);
    const physicalName = instrument.physicalName(rig);
    const s3Ref = await packager.pushToS3(`deployables/${physicalName}.zip`, zb);

    const cfp = new CloudFormationPusher(rig.region);

    const functionResource = instrument.getPhysicalDefinition(rig).get();
    functionResource.Properties.CodeUri = s3Ref.toUri();

    const stack = {
        AWSTemplateFormatVersion: '2010-09-09',
        Transform: 'AWS::Serverless-2016-10-31',
        Description: "Backend services for Testim's tagging application",
        Resources: {}
    };


    stack.Resources[logicalResourceName] = functionResource;

    console.log(`functionResource=${JSON.stringify(functionResource, null, 2)}`);
    await cfp.deploy(stack, rig.physicalName());


    const lambda = new AWS.Lambda({region: rig.region});
    const updateFunctionCodeReq: UpdateFunctionCodeRequest = {
        FunctionName: physicalName,
        S3Bucket: s3Ref.s3Bucket,
        S3Key: s3Ref.s3Key
    };
    await lambda.updateFunctionCode(updateFunctionCodeReq).promise();
    console.log('Function code updated:\n' + JSON.stringify(updateFunctionCodeReq, null, 2));
    return `deployed ${rig.physicalName()}`;
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

