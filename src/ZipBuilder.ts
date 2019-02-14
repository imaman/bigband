import * as JSZip from 'jszip';
import * as mkdirp from 'mkdirp'
import { DeployableFragment, DeployableAtom } from './instruments/Instrument';
import * as path from 'path';
import * as fs from 'fs';

export class ZipBuilder {
  private readonly zip: JSZip = new JSZip();
  public readonly fragment = new DeployableFragment();

  scan(pathInJar: string, absolutePath: string) {
    if (!path.isAbsolute(absolutePath)) {
      throw new Error(`path is not absolute (${absolutePath}).`)
    }
    if (fs.lstatSync(absolutePath).isDirectory()) {
      fs.readdirSync(absolutePath).forEach((f: string) => {
        this.scan(path.join(pathInJar, f), path.join(absolutePath, f));
      });
    } else {
      const content = fs.readFileSync(absolutePath, 'utf-8');
      const atom = new DeployableAtom(pathInJar, content);
      this.fragment.add(atom);
    }
  }

  forEach(consumer: (DeployableAtom) => void){
    this.fragment.forEach(consumer);
  }

  importFragment(from: DeployableFragment) {
    from.forEach(curr => {
      this.fragment.add(curr);
    })
  }

  add(path, content) {
    this.fragment.add(new DeployableAtom(path, content));
  }

  async get(path) {
    return await this.zip.file(path).async("string");
  }

  populateZip() {
      const zipByPath: any = {}
      zipByPath["."] = this.zip;
      this.fragment.forEach(atom => {
          const curr = path.dirname(atom.path);
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
              parZip.file(path.basename(p), '' ,{date: new Date(1000), dir: true});

              zipByPath[p] = parZip.folder(path.basename(p));
            });
      });
  
      this.fragment.forEach(atom => {
        const zz = zipByPath[path.dirname(atom.path)];
        zz.file(path.basename(atom.path), atom.content, {date: new Date(1000)});
      });
  }

  async toBuffer(): Promise<Buffer> {
    return this.zip.generateAsync({ type: "nodebuffer", compression: "DEFLATE", compressionOptions: { level: 0 } });
  }

  unzip(outDir: string) {
    if (!path.isAbsolute(outDir)) {
      throw new Error(`outDir (${outDir}) must be absolute`);
    }

    this.fragment.forEach((curr: DeployableAtom) => {
      const p = path.resolve(outDir, curr.path);
      mkdirp.sync(path.dirname(p));
      fs.writeFileSync(p, curr.content, "utf-8");
    });
  }

  async dump(outputFile: string) {
    const buf = await this.toBuffer();
    fs.writeFileSync(outputFile, buf);
    console.log('-written-')
  }
}
