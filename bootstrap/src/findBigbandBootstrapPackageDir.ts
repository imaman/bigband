import * as path from 'path';
import * as fs from 'fs';

// HERE
export function findBigbandBootstrapPackageDir() {
  let ret = path.resolve(__dirname);
  while (true) {
    const resolved = path.resolve(ret, 'package.json')
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
