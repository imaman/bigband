#!/usr/bin/env node

import * as sourceMapSupport from 'source-map-support';
sourceMapSupport.install();

import * as yargs from 'yargs';
import * as path from 'path';
import * as fs from 'fs';

import { Packager } from './Packager'
import { CloudFormationPusher } from './CloudFormationPusher';

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
            const handler = functionConfig.handler;
            return ship(path.resolve(config.dir), `${handler}.ts`, name, config.namespace.s3Bucket, config.s3Object, config, functionConfig);
        });
        return await Promise.all(ps);
    }

    throw new Error('mix-file is missing');
}

function compileConfigFile(mixFile: string) {
    const d = path.dirname(path.resolve(mixFile));
    const packager = new Packager(d, d, argv.s3Bucket);
    const file = 'servicemix.config'
    const outDir = packager.compile(`${file}.ts`, 'meta');
    const ret = require(path.resolve(outDir, `${file}.js`)).config;
    if (!ret.dir) {
        ret.dir = d;
    }
    return ret;
}

async function ship(d: string, file: string, simpleName: string, s3Bucket: string, s3Object: string, config: any, functionConfig: any) {
    const fullName = composeName(config.namespace.name, config.package.name, simpleName);
    const logicalResourceName = composeCamelCaseName(config.namespace.name, config.package.name, simpleName);
    console.log('logicalResourceName=', logicalResourceName);
    if (!fs.existsSync(d) || !fs.statSync(d).isDirectory()) {
        throw new Error(`Bad value. ${d} is not a directory.`);
    }

    const packager = new Packager(d, d, s3Bucket);
    const zb = packager.run(file, 'build');
    await packager.pushToS3(s3Object, zb);

    const cfp = new CloudFormationPusher(config.package.region);

    const functionResource: any = {
        Type: 'AWS::Serverless::Function',
        Properties: {
            FunctionName: fullName,
            Runtime: "nodejs8.10",
            Handler: "build/handler.endpoint",
            CodeUri: `s3://${s3Bucket}/${s3Object}`,
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
    return `deployed ${stackName}`;
}

main()
    .then(o => console.log('L.144', o))
    .catch(e => {
        console.log('Error', e);
        process.exit(-1);
    });
