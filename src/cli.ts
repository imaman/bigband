#!/usr/bin/env node

import * as sourceMapSupport from 'source-map-support';
sourceMapSupport.install();

import {runMixFile,loadSpec} from './MixFileRunner';
import {LogsCommand} from './commands/Logs'
import {ListCommand} from './commands/List'
import {Invoke} from './commands/Invoke'
import {logger} from './logger'

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
    }, argv => run(LogsCommand.run, argv))
    .command('invoke', 'Invoke a function', yargs => {
        specFileAndRigOptions(yargs);
        yargs.option('function-name', {
            descirbe: 'name of a function',
        });
        yargs.option('input', {
            descirbe: 'input to pass to the invoked function',
        });
        yargs.demandOption(['function-name', 'input'])
    }, argv => run(Invoke.run, argv))
    .command('list', 'Show the spec', yargs => {
        specFileAndRigOptions(yargs);
    }, argv => run(ListCommand.run, argv))
    .demandCommand(1, 1, 'You must specify exactly one command', 'You must specify exactly one command')
    .help()
    .argv;

async function ship(argv) {
    return await runMixFile(argv.mixFile, argv.rig, argv.runtimeDir && path.resolve(argv.runtimeDir));
}


function run(handler, argv) {
    if (argv.runtimeDir) {
        argv.runtimeDir = path.resolve(argv.runtimeDir)
    }
    Promise.resolve()
        .then(() => handler(argv))
        .then(output => logger.info(output))
        .catch(e => {
            console.log('Error', e);
            process.exit(-1);
        });
}


/**
 * 
 * https://gist.githubusercontent.com/imaman/5ae792b28657eb24a2044ed324295e3c/raw/dd3f802abef99239e45854ce5f40842a55ea994b/combined.log
 * > bigband ship --rig prod-major

Shipping rig prod-major to eu-central-1
Pushing code: store
Pushing code: errorSink
Pushing code: metricCenter
Creating change set
.
Enacting Change set
Error { InvalidChangeSetStatus: ChangeSet [arn:aws:cloudformation:eu-central-1:274788167589:stack/mm-prod-major/078a2ea0-e269-11e8-bf7a-50a68a770c1e] cannot be executed in its current status of [CREATE_IN_PROGRESS]
    at Request.extractError (/home/imaman/code/data-platform/metric-machine/backend/node_modules/aws-sdk/lib/protocol/query.js:47:29)
    at Request.callListeners (/home/imaman/code/data-platform/metric-machine/backend/node_modules/aws-sdk/lib/sequential_executor.js:106:20)
    at Request.emit (/home/imaman/code/data-platform/metric-machine/backend/node_modules/aws-sdk/lib/sequential_executor.js:78:10)
    at Request.emit (/home/imaman/code/data-platform/metric-machine/backend/node_modules/aws-sdk/lib/request.js:683:14)
    at Request.transition (/home/imaman/code/data-platform/metric-machine/backend/node_modules/aws-sdk/lib/request.js:22:10)
    at AcceptorStateMachine.runTo (/home/imaman/code/data-platform/metric-machine/backend/node_modules/aws-sdk/lib/state_machine.js:14:12)
    at /home/imaman/code/data-platform/metric-machine/backend/node_modules/aws-sdk/lib/state_machine.js:26:10
    at Request.<anonymous> (/home/imaman/code/data-platform/metric-machine/backend/node_modules/aws-sdk/lib/request.js:38:9)
    at Request.<anonymous> (/home/imaman/code/data-platform/metric-machine/backend/node_modules/aws-sdk/lib/request.js:685:12)
    at Request.callListeners (/home/imaman/code/data-platform/metric-machine/backend/node_modules/aws-sdk/lib/sequential_executor.js:116:18)
  message: 'ChangeSet [arn:aws:cloudformation:eu-central-1:274788167589:stack/mm-prod-major/078a2ea0-e269-11e8-bf7a-50a68a770c1e] cannot be executed in its current status of [CREATE_IN_PROGRESS]',
  code: 'InvalidChangeSetStatus',
  time: 2018-11-15T10:08:21.256Z,
  requestId: '617b2275-e8be-11e8-aac5-f5b582dfe984',
  statusCode: 400,
  retryable: false,
  retryDelay: 24.099761850932655 }

 */