#!/usr/bin/env node

import * as sourceMapSupport from 'source-map-support';
sourceMapSupport.install();

import * as yargs from 'yargs';
import * as path from 'path';
import * as fs from 'fs';
import * as AWS from 'aws-sdk';

import {Packager,ZipBuilder} from './Packager'
import {CloudFormationPusher} from './CloudFormationPusher';
import { UpdateFunctionCodeRequest } from 'aws-sdk/clients/lambda';

const argv = yargs
    .version('1.0.0')
    .option('s3-bucket', {
        describe: 'The name of the S3 bucket at which the deployable is to be stored'
    })
    .option('s3-object', {
        describe: 'The name of an S3 object (key) where the deployable is to be stored'
    })
    .option('dir', {
        describe: 'Path to your proejct\'s root directory (a directroy with a package.json file)'
    })
    .option('file', {
        describe: 'Path (relative to --dir) to a .ts file to compile.'
    })
    .option('name', {
        describe: 'The name of the Lambda function'
    })
    .option('mix-file', {
        descirbe: 'path to a servicemix.config.ts file',
    })
    // .demandOption(['dir', 'file', 's3-bucket', 's3-object'], 'Required option(s) missing')
    .help()
    .argv;



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

async function main() {
    if (argv.mixFile) {
        const config = compileConfigFile(argv.mixFile);
        const ps = Object.keys(config.package.functions).map(name => {
            const functionConfig = config.package.functions[name];
            return ship(path.resolve(config.dir), name, config, functionConfig);
        });
        return await Promise.all(ps);
    }

    throw new Error('mix-file is missing');
}

function compileConfigFile(mixFile: string) {
    const d = path.dirname(path.resolve(mixFile));
    const packager = new Packager(d, d, '', '');
    const file = 'servicemix.config'
    const outDir = packager.compile(`${file}.ts`, 'meta');
    const ret = require(path.resolve(outDir, `${file}.js`)).config;
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
        'use strict';

        // V_1522
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

async function ship(d: string, simpleName: string, config: any, functionConfig: any) {
    const fullName = composeName(config.namespace.name, config.package.name, simpleName);
    const logicalResourceName = composeCamelCaseName(config.package.name, simpleName);
    console.log('logicalResourceName=', logicalResourceName);
    if (!fs.existsSync(d) || !fs.statSync(d).isDirectory()) {
        throw new Error(`Bad value. ${d} is not a directory.`);
    }

    const packager = new Packager(d, d, config.namespace.s3Bucket, config.namespace.s3Prefix);
    const zb: ZipBuilder = packager.run(`${functionConfig.controller}.ts`, 'build');
    injectHandler(zb, 'handler.js', 'build/' + functionConfig.controller);
    const s3Ref = await packager.pushToS3(`deployables/${fullName}.zip`, zb);

    const cfp = new CloudFormationPusher(config.package.region);

    const functionResource: any = {
        Type: 'AWS::Serverless::Function',
        Properties: {
            FunctionName: fullName,
            Runtime: "nodejs8.10",
            Handler: "handler.handle",
            CodeUri: s3Ref.toUri(),
            Policies: [
                {
                    Version: '2012-10-17',
                    Statement: [
                        {
                            Effect: "Allow",
                            Action: "s3:*",
                            Resource: "arn:aws:s3:::dataplatform-tagging-browsers/*"
                        },
                        {
                            Effect: "Allow",
                            Action: "s3:*",
                            Resource: "arn:aws:s3:::dataplatform-tagging-snapshots/*"
                        },
                        {
                            Effect: "Allow",
                            Action: [
                                "dynamodb:DeleteItem",
                                "dynamodb:DescribeTable",
                                "dynamodb:GetItem",
                                "dynamodb:PutItem",
                                "dynamodb:Query",
                                "dynamodb:Scan",
                                "dynamodb:UpdateItem"
                            ],
                            Resource: [
                                "arn:aws:dynamodb:eu-central-1:274788167589:table/dataplatform.tagging.Snapshots",
                                "arn:aws:dynamodb:eu-central-1:274788167589:table/dataplatform.Users",
                                "arn:aws:dynamodb:eu-central-1:274788167589:table/dataplatform.tagging.Assignments",
                                "arn:aws:dynamodb:eu-central-1:274788167589:table/dataplatform.tagging.Assignments/index/*"
                            ]
                        }
                    ]
                }
            ]
        }
    }

    Object.assign(functionResource.Properties, functionConfig.properties);

    const stack = {
        AWSTemplateFormatVersion: '2010-09-09',
        Transform: 'AWS::Serverless-2016-10-31',
        Description: "Backend services for Testim's tagging application",
        Resources: {}
    };


    stack.Resources[logicalResourceName] = functionResource;

    console.log(`functionResource=${JSON.stringify(functionResource, null, 2)}`);

    const stackName = composeName(config.namespace.name, config.package.name);
    await cfp.deploy(stack, stackName);


    const lambda = new AWS.Lambda({region: config.package.region});
    const updateFunctionCodeReq: UpdateFunctionCodeRequest = {
        FunctionName: fullName,
        S3Bucket: s3Ref.s3Bucket,
        S3Key: s3Ref.s3Key
    };
    await lambda.updateFunctionCode(updateFunctionCodeReq).promise();
    console.log('Function code updated');
    return `deployed ${stackName}`;
}

main()
    .then(o => console.log('L.144', o))
    .catch(e => {
        console.log('Error', e);
        process.exit(-1);
    });
