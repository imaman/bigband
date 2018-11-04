#!/usr/bin/env node

import * as sourceMapSupport from 'source-map-support';
sourceMapSupport.install();

import * as yargs from 'yargs';
import * as path from 'path';
import * as fs from 'fs';

import {Packager} from './Packager'
import { ETIME } from 'constants';

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
    .option('mix-file', {
        descirbe: 'path to a servicemix.config.ts file',
    })
    // .demandOption(['dir', 'file', 's3-bucket', 's3-object'], 'Required option(s) missing')
    .help()
    .argv;


async function main() {
    if (argv.mixFile) {
        const config = compileConfigFile(argv.mixFile);
        return await ship(path.resolve(config.dir), config.file, config.s3Bucket, config.s3Object);
    }

    const d = path.resolve(argv.dir);
    return ship(d, argv.file, argv.s3Bucket, argv.s3Object);
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

async function ship(d: string, file: string, s3Bucket: string, s3Object: string) {
    if (!fs.existsSync(d) || !fs.statSync(d).isDirectory()) {
        throw new Error(`Bad value. ${d} is not a directory.`);
    }

    const packager = new Packager(d, d, s3Bucket);
    const zb = packager.run(file, 'build');
    return await packager.pushToS3(s3Object, zb);
}

main()
    .then(o => console.log(o))
    .catch(e => {
        console.log('Error', e);
        process.exit(-1);
    });
