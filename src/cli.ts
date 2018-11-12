#!/usr/bin/env node

import * as sourceMapSupport from 'source-map-support';
sourceMapSupport.install();

import {runMixFile} from './MixFileRunner';
import {LogsCommand} from './logs/LogsCommand'

import * as yargs from 'yargs';
import * as path from 'path';

yargs
    .usage('<cmd> [args]')
    .version('1.0.0')
    .strict()
    .command('ship', 'deploy!', yargs => {
        yargs.option('mix-file', {
            descirbe: 'path to a servicemix.config.ts file',
            default: 'bigband.spec.ts'
        })
        yargs.option('rig', {
            descirbe: 'Name of the rig to deploy',
        })
        yargs.option('runtime-dir', {
            descirbe: 'path to a directory with an Instrument.js file',
        })
        .demandOption(['rig','mix-file'])
    }, argv => {
        run(ship, argv)
    })
    .command('logs', 'Watch logs of a function', yargs => {
        yargs.option('function-name', {
            descirbe: 'Physical name of a function',
        })
        yargs.option('region', {
            descirbe: 'AWS region',
        })
        yargs.option('limit', {
            descirbe: 'Number of items to show',
            default: 30
        })
        .demandOption(['function-name', 'region'])
    }, argv => {
        run(LogsCommand.run, argv)
    })
    .demandCommand(1, 1, 'You must specify exactly one command', 'You must specify exactly one command')
    .help()
    .argv;

async function ship(argv) {
    return await runMixFile(argv.mixFile, argv.rig, argv.runtimeDir && path.resolve(argv.runtimeDir));
}


function run(handler, argv) {
    Promise.resolve()
        .then(() => handler(argv))
        .then(o => console.log(o))
        .catch(e => {
            console.log('Error', e);
            process.exit(-1);
        });
}
