#!/usr/bin/env node

import * as sourceMapSupport from 'source-map-support';
sourceMapSupport.install();

import {BigbandFileRunner, DeployMode} from './BigbandFileRunner';
import {LogsCommand} from './commands/Logs'
import {ListCommand} from './commands/List'
import {logger} from './logger'
import * as yargs from 'yargs';
import { Exec } from './commands/Exec';


function specFileAndSectionOptions(yargs) {
    yargs.option('bigband-file', {
        descirbe: 'path to a bigband file (.ts)',
        default: 'bigband.config.ts'
    })

    return yargs;
}

yargs
    .usage('<cmd> [args]')
    .version('1.0.0')
    .strict()
    .command('ship [path]', 'deploy!', yargs => {
        specFileAndSectionOptions(yargs);
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
    .command('logs [path]', 'Fetches logs of a function', yargs => {
        specFileAndSectionOptions(yargs);
        yargs.option('limit', {
            descirbe: 'Number of items to show',
            default: 30
        });
    }, argv => run(LogsCommand.run, argv))
    .command('exec [path]', 'Invokes a function', yargs => {
        specFileAndSectionOptions(yargs);
        yargs.option('input', {
            descirbe: 'input to pass to the invoked function',
        });
        yargs.demandOption(['input'])
    }, argv => run(Exec.run, argv))
    .command('ls [path]', 'Shows instruments as defined in the bigband file', yargs => {
        specFileAndSectionOptions(yargs);
        yargs.option('l', {
            describe: 'Use a long listing format',
            default: false,
            type: 'boolean'
        });
    }, argv => run(ListCommand.run, argv))
    .demandCommand(1, 1, 'You must specify exactly one command', 'You must specify exactly one command')
    .help()
    .argv;

async function ship(argv) {
    const deployMode: DeployMode = (argv.deployMode === 'ALWAYS') ? DeployMode.ALWAYS : DeployMode.IF_CHANGED;
    return await BigbandFileRunner.runBigbandFile(argv.bigbandFile, argv.path, argv.teleporting, deployMode);
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
