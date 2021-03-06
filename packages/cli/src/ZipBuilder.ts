import * as JSZip from 'jszip';
import * as mkdirp from 'mkdirp'
import { DeployableFragment, DeployableAtom } from 'bigband-core';
import * as path from 'path';
import * as fs from 'fs';
import * as hash from 'hash.js';


const DATE = new Date(1000);


class FolderTree {
  private readonly zipByPath: any = {}

  constructor(private readonly jszip: JSZip) {
    this.zipByPath["."] = jszip;
  }

  addPath(pathInZip: string) {
    while (pathInZip.endsWith('/')) {
      pathInZip = pathInZip.slice(0, -1);
    }

    const curr = path.dirname(pathInZip);
    const ps: string[] = [];
    for (let x = curr; x !== '.'; x = path.dirname(x)) {
      ps.push(x);
    }
    
    ps.reverse();
    ps.forEach(p => {
        if (this.zipByPath[p]) {
            return;
        }

        const parPath = path.dirname(p);
        const parZip = this.zipByPath[parPath];
        const base = path.basename(p);
        parZip.file(base, '' ,{date: DATE, dir: true, dosPermissions: 16});

        this.zipByPath[p] = parZip.folder(base);
      });
  }

  getFolder(pathInZip: string) {
    return this.zipByPath[path.dirname(pathInZip)];
  }
}

export class ZipBuilder {
  public readonly fragments: DeployableFragment[] = [];

  static bufferTo256Fingerprint(buf: Buffer) {
    return Buffer.from(hash.sha256().update(buf).digest()).toString('base64');
  }

  static async fragmentToBuffer(fragment: DeployableFragment): Promise<Buffer> {
    const zb = new ZipBuilder();
    zb.importFragment(fragment);
    return zb.toBuffer();
  }
  
  static async merge(buffers: Buffer[]): Promise<Buffer> {
    const out = new ZipBuilder();

    const jszips = await Promise.all(buffers.map(curr => JSZip.loadAsync(curr)));

    const promises: Promise<any>[] = [];

    jszips.forEach(jszip => {
      const frag = out.newFragment();
      jszip.forEach(async (_: string, zipObject) => {
          if (zipObject.dir) {
            return;
          }

          const p = zipObject.async('text').then(text => frag.add(new DeployableAtom(zipObject.name, text)));
          promises.push(p);
      });
    });
    await Promise.all(promises);

    return out.toBuffer();
  }

  private populateZip() {
    const ret = new JSZip();
    const folderTree = new FolderTree(ret);
    this.forEach(atom => folderTree.addPath(atom.path));

    this.forEach(atom => {
      ret.file(atom.path, atom.content, {date: DATE});
    });

    return ret;
  }

  newFragment() {
    const ret = new DeployableFragment();
    this.importFragment(ret);
    return ret;
  }

  forEach(consumer: (_: DeployableAtom) => void) {
    const atoms: DeployableAtom[] = [];
    for (const frag of this.fragments) {
      frag.forEach(atom => atoms.push(atom));
    }
    atoms.sort((a, b) => lexicographicallyCompare(a.path, b.path));
    atoms.forEach(consumer);
  }

  getFragments() {
    return [...this.fragments];
  }

  importFragment(frag: DeployableFragment) {
    this.fragments.push(frag);
  }

  async toBuffer(): Promise<Buffer> {
    return this.populateZip().generateAsync(
      { type: "nodebuffer", compression: "DEFLATE", compressionOptions: { level: 0 } });
  }

  unzip(outDir: string) {
    if (!path.isAbsolute(outDir)) {
      throw new Error(`outDir (${outDir}) must be absolute`);
    }

    this.forEach((curr: DeployableAtom) => {
      const p = path.resolve(outDir, curr.path);
      mkdirp.sync(path.dirname(p));
      fs.writeFileSync(p, curr.content, "utf-8");
    });
  }

  static async toPojo(buffer: Buffer) {
    const jszip = await JSZip.loadAsync(buffer);
    const promises: Promise<any>[] = [];
    jszip.forEach(async (_, curr) => {
      const meta = {date: curr.date, name: curr.name, dir: curr.dir, unixPermissions: curr.unixPermissions, dosPermissions: curr.dosPermissions, options: curr.options};

      const p = (curr.dir ? Promise.resolve('_N/A_') : curr.async('text')).then(content => ({meta, content}));
      promises.push(p);
    });
    const ret = await Promise.all(promises);
    return ret;
  }
}

function lexicographicallyCompare(a: string, b: string) {
  if (a.length !== b.length) {
    return a.length - b.length;
  }

  return a.localeCompare(b);
}
