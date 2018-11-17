import * as JSZip from 'jszip';
import * as hash from 'hash.js'
import * as path from 'path';
import * as fs from 'fs';

async function zip(forward: boolean) {
    const folders = [
        'a/b/c',
        'a/d/e',
        // 'a/b',
        // 'a/c/d2',
        // 'a/c/d3',
        // 'a/d/e/d5',
        // 'a/d/d6'
    ]

    
    const files: string[] = new Array(4)
        .fill(0)
        .map((_, i, a) => forward ? i : (a.length - i) - 1)
        .map(curr => `${folders[curr % folders.length]}/a_${curr}`);
    

    const jsZip: JSZip = new JSZip();
    return await populate(jsZip, files);
}


async function populate(jsZip: JSZip, files: string[]) {
    const zipByPath: any = {}
    zipByPath["."] = jsZip;
    files.map(curr => path.dirname(curr)).forEach(curr => {
        const ps: string[] = [];
        for (let x = curr; x !== '.'; x = path.dirname(x)) {
            ps.push(x);
        }
        ps.reverse();
        ps.forEach(p => {
            console.log('p=', p);
            if (zipByPath[p]) {
                return;
            }
            const dn = path.dirname(p);
            const parZip = zipByPath[dn];
            console.log('Found parZip of ' + dn + ' it is' + parZip);
            const baseName = path.basename(p);
            parZip.file(baseName, '' ,{date: new Date(1000), dir: true});
            zipByPath[p] = parZip.folder(baseName);
        });
    });

    // zipByPath[p] = parZip.folder(baseName);
    files.forEach((fullPath, i) => {
            const d = path.dirname(fullPath);
            const zz = zipByPath[d];
            console.log('fullPath=', fullPath, 'd=', d);
            zz.file(path.basename(fullPath), `content_${i}`, {date: new Date(1000)});
        });
    const buf = await jsZip.generateAsync({ type: "nodebuffer", compression: "DEFLATE", compressionOptions: { level: 0 } });
    return Buffer.from(hash.sha256().update(buf).digest()).toString('base64');
}
async function run() {
    const arr = await Promise.all([zip(true)]);
    return JSON.stringify(arr, null, 2);
}

Promise.resolve()   
    .then(() => run())
    .then(x => console.log(x))
    .catch(e => console.error('program failed', e));

