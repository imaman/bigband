#!/usr/bin/env node

import * as sourceMapSupport from 'source-map-support';
sourceMapSupport.install();

import {runBigbandFile, DeployMode} from './BigbandFileRunner';
import {LogsCommand} from './commands/Logs'
import {ListCommand} from './commands/List'
import {Invoke} from './commands/Invoke'
import {logger} from './logger'

import * as yargs from 'yargs';


function specFileAndRigOptions(yargs, rigOptionEnabled) {
    yargs.option('bigband-file', {
        descirbe: 'path to a bigband file (.ts)',
        default: 'bigband.config.ts'
    })

    if (rigOptionEnabled) {
        yargs.option('rig', {
            descirbe: 'Name of a rig to deploy. optional if only one rig is defined in the bigband file.',
        })    
    }
    return yargs;
}

yargs
    .usage('<cmd> [args]')
    .version('1.0.0')
    .strict()
    .command('ship', 'deploy!', yargs => {
        specFileAndRigOptions(yargs, true);
        yargs.option('teleporting', {
            describe: 'whether to enable teleporting to significantly reduce deployment time',
            default: true,
            type: 'boolean'
        });
        yargs.option('deploy-mode', {
            choices: ['ALWAYS', 'IF_CHANGED'],
            describe: 'When should lambda instruments be deployed',
            default: 'IF_CHANGED'
        });
    }, argv => run(ship, argv))
    .command('logs', 'Watch logs of a function', yargs => {
        specFileAndRigOptions(yargs, false);
        yargs.option('function-name', {
            descirbe: 'name of a function',
        });
        yargs.option('limit', {
            descirbe: 'Number of items to show',
            default: 30
        });
        yargs.demandOption(['function-name'])
    }, argv => run(LogsCommand.run, argv))
    .command('invoke', 'Invoke a function', yargs => {
        specFileAndRigOptions(yargs, false);
        yargs.option('function-name', {
            descirbe: 'name of a function',
        });
        yargs.option('input', {
            descirbe: 'input to pass to the invoked function',
        });
        yargs.demandOption(['function-name', 'input'])
    }, argv => run(Invoke.run, argv))
    .command('list', 'Show all currently defined instruments from the bigband file', yargs => {
        specFileAndRigOptions(yargs, false);
    }, argv => run(ListCommand.run, argv))
    .demandCommand(1, 1, 'You must specify exactly one command', 'You must specify exactly one command')
    .help()
    .argv;

async function ship(argv) {
    const deployMode: DeployMode = (argv.deployMode === 'ALWAYS') ? DeployMode.ALWAYS : DeployMode.IF_CHANGED;
    return await runBigbandFile(argv.bigbandFile, argv.rig, argv.teleporting, deployMode);
}


function run(handler, argv) {
    Promise.resolve()
        .then(() => handler(argv))
        .then(output => logger.info(output, () => process.exit(0)))
        .catch(e => {
            console.log('Error', e);
            logger.error('Exiting: ', e, () => process.exit(-1));
        });
}
