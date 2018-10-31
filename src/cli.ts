import * as yargs from 'yargs';
import * as path from 'path';
import * as fs from 'fs';

import * as Packager from './Packager'

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
    .demandOption(['dir', 'file', 's3-bucket', 's3-object'], 'Required option(s) missing')
    .help()
    .argv;


async function main() {
    const d = path.resolve(argv.dir);

    if (!fs.existsSync(d) || !fs.statSync(d).isDirectory()) {
        throw new Error(`Bad value. ${d} is not a directory.`);
    }
    
    return Packager.pushToS3(Packager.run(d, argv.file, d), argv.s3Bucket, argv.s3Object);
}

main()
    .then(o => console.log(o))
    .catch(e => console.log('Error', e));