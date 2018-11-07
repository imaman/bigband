#!/usr/bin/env node

import * as sourceMapSupport from 'source-map-support';
sourceMapSupport.install();

import {runMixFile} from './MixFileRunner';

import * as yargs from 'yargs';
import * as path from 'path';

const argv = yargs
    .version('1.0.0')
    .option('mix-file', {
        descirbe: 'path to a servicemix.config.ts file',
    })
    .option('rig', {
        descirbe: 'Name of the rig to deploy',
    })
    .option('runtime-dir', {
        descirbe: 'path to a directory with an Instrument.js file',
    })
    .demandOption(['rig','mix-file'])
    .help()
    .argv;

async function main() {
    if (!argv.mixFile) {
        throw new Error('mix-file is missing');
    }

    return await runMixFile(argv.mixFile, argv.rig, argv.runtimeDir && path.resolve(argv.runtimeDir));
}

Promise.resolve()
    .then(() => main())
    .then(o => console.log('L.144', o))
    .catch(e => {
        console.log('Error', e);
        process.exit(-1);
    });
