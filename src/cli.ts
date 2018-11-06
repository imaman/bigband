#!/usr/bin/env node

import * as sourceMapSupport from 'source-map-support';
sourceMapSupport.install();

import {runMixFile} from './MixFileRunner';

import * as yargs from 'yargs';
import * as path from 'path';

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
    .option('runtime-dir', {
        descirbe: 'path to a directory with an Instrument.js file',
    })
    .demandOption(['runtime-dir','mix-file'])
    .help()
    .argv;

async function main() {
    if (!argv.mixFile) {
        throw new Error('mix-file is missing');
    }

    return await runMixFile(argv.mixFile, path.resolve(argv.runtimeDir));
}

main()
    .then(o => console.log('L.144', o))
    .catch(e => {
        console.log('Error', e);
        process.exit(-1);
    });
