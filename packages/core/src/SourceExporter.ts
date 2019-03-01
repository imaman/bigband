import * as path from 'path';
import * as fs from 'fs';

export class SourceExporter {
    static exportBigbandCoreSourceCode(fileName: string) {
        const location = path.resolve(__dirname, fileName);
        return fs.readFileSync(location, 'utf-8');
    }
}
