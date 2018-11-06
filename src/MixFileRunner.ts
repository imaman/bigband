import * as path from 'path';
import * as fs from 'fs';
import * as AWS from 'aws-sdk';

import {NameStyle, IsolationScope,newLambda,Rig, Instrument} from '../src/Instrument';
import {Packager,ZipBuilder} from './Packager'
import {CloudFormationPusher} from './CloudFormationPusher';
import { UpdateFunctionCodeRequest } from 'aws-sdk/clients/lambda';

export async function runMixFile(mixFile) {
    const config = compileConfigFile(mixFile);
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

function compileConfigFile(mixFile: string) {
    const d = path.dirname(path.resolve(mixFile));
    const packager = new Packager(d, d, '', '');
    const file = 'servicemix.config'
    const outDir = packager.compile(`${file}.ts`, 'meta');
    const ret: MixSpec = require(path.resolve(outDir, `${file}.js`)).config;
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
    const fullName = composeName(rig.isolationScope.name, instrument.fullyQualifiedName());
    const logicalResourceName = instrument.fullyQualifiedName(NameStyle.CAMEL_CASE);
    console.log('logicalResourceName=', logicalResourceName);
    if (!fs.existsSync(d) || !fs.statSync(d).isDirectory()) {
        throw new Error(`Bad value. ${d} is not a directory.`);
    }

    const packager = new Packager(d, d, rig.isolationScope.s3Bucket, rig.isolationScope.s3Prefix);
    const zb: ZipBuilder = packager.run(instrument.getEntryPointFile(), 'build');
    zb.importFragment(instrument.createFragment());

    // injectHandler(zb, 'handler.js', 'build/' + functionConfig.controller);
    const s3Ref = await packager.pushToS3(`deployables/${fullName}.zip`, zb);

    const cfp = new CloudFormationPusher(rig.region);

    const functionResource = instrument.getDefinition().get();

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
        FunctionName: fullName,
        S3Bucket: s3Ref.s3Bucket,
        S3Key: s3Ref.s3Key
    };
    await lambda.updateFunctionCode(updateFunctionCodeReq).promise();
    console.log('Function code updated');
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

