import * as path from 'path';
import * as fs from 'fs';

function findBigbandPackageDir() {
    let ret = path.resolve(__dirname);
    while (true) {
        const resolved = path.resolve(ret, 'node_modules')
        if (fs.existsSync(resolved)) {
            return ret;
        }

        const next = path.dirname(ret);
        if (next === ret) {
            throw new Error('package dir for bigband was not found');
        }

        ret = next;
    }
}

let bigbandPackageDir: string = '';

export class Misc {
    static bigbandPackageDir() {
        bigbandPackageDir = bigbandPackageDir || findBigbandPackageDir();
        return bigbandPackageDir;
    }
}
