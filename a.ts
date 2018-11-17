import * as JSZip from 'jszip';
import * as hash from 'hash.js'
import * as path from 'path';

async function zip(forward: boolean) {
    const folders = [
        'a/c/d2/d4',
        'a/b/d1',
        'a/b',
        'a/c/d2',
        'a/c/d3',
        'a/d/e/d5',
        'a/d/d6'
    ]

    
    const files: string[] = new Array(30)
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
            if (zipByPath[p]) {
                return;
            }
            const parZip = zipByPath[path.dirname(p)];
            zipByPath[p] = parZip.file(path.basename(p), '' ,{date: new Date(1000), dir: true});
        });
    });

    files.forEach((fullPath, i) => {
            const zz = zipByPath[path.dirname(fullPath)];
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

