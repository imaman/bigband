#!/usr/bin/env node

import * as sourceMapSupport from 'source-map-support';
sourceMapSupport.install();

import {runMixFile,loadSpec} from './MixFileRunner';
import {LogsCommand} from './commands/Logs'
import {ListCommand} from './commands/List'

import * as yargs from 'yargs';
import * as path from 'path';


function specFileAndRigOptions(yargs) {
    yargs.option('mix-file', {
        descirbe: 'path to a servicemix.config.ts file',
        default: 'bigband.spec.ts'
    })
    yargs.option('rig', {
        descirbe: 'Name of a rig to deploy',
    })
    yargs.option('runtime-dir', {
        descirbe: 'path to a directory with an Instrument.js file',
    });
return yargs;
}

yargs
    .usage('<cmd> [args]')
    .version('1.0.0')
    .strict()
    .command('ship', 'deploy!', yargs => {
        specFileAndRigOptions(yargs);
        yargs.demandOption(['rig']);
    }, argv => run(ship, argv))
    .command('logs', 'Watch logs of a function', yargs => {
        specFileAndRigOptions(yargs);
        yargs.option('function-name', {
            descirbe: 'name of a function',
        });
        yargs.option('limit', {
            descirbe: 'Number of items to show',
            default: 30
        });
        yargs.demandOption(['function-name', 'rig'])
    }, argv => {
        if (argv.runtimeDir) {
            argv.runtimeDir = path.resolve(argv.runtimeDir)
        }
        run(LogsCommand.run, argv)
    })
    .command('list', 'Show the spec', yargs => {
        specFileAndRigOptions(yargs);
    }, argv => {
        if (argv.runtimeDir) {
            argv.runtimeDir = path.resolve(argv.runtimeDir)
        }
        run(ListCommand.run, argv)
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
