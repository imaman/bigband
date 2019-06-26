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

let bigbandPackageDir: string = '';

export class Misc {
    static bigbandPackageDir() {
        bigbandPackageDir = bigbandPackageDir || findPackageDir();
        return bigbandPackageDir;
    }

    static flatten<T>(arr: T[][]): T[] {
        const ret: T[] = []
        arr.forEach(curr => {
            curr.forEach(t => ret.push(t))
        })
        return ret
    }

    static checkDuplicates(names: string[]): string[] {
        const uniqueNames = new Set<string>(names);
        if (uniqueNames.size === names.length) {
            return [];
        }
    
        const ret: string[] = [];
        names.forEach(n => {
            if (uniqueNames.has(n)) {
                uniqueNames.delete(n);
            } else {
                ret.push(n);
            }
        });
    
        return ret;
    }    
}
