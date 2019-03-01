import * as path from 'path';
import * as fs from 'fs';

function findPackageDir() {
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

let bigbandCorePackageDir: string;

// TODO(imaman): Rename to About
export class SourceExporter {
    static exportBigbandCoreSourceCode(fileName: string) {
        const location = path.resolve(__dirname, fileName);
        return fs.readFileSync(location, 'utf-8');
    }

    static bigbandCorePackageDir() {
        bigbandCorePackageDir = bigbandCorePackageDir || findPackageDir();
        return bigbandCorePackageDir;
    }
}
