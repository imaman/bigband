import * as JSZip from 'jszip';
import * as child_process from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import * as uuidv1 from 'uuid/v1';
import * as os from 'os';
import { DepsCollector } from './DepsCollector'
import { NpmPackageResolver, Usage } from './NpmPackageResolver'
import { DeployableFragment, DeployableAtom } from './Instrument';


// run tsc
// collects all npm deps
// resolve npm deps
// add every npm dep to a fragment
// add the fragment to a zip



function compile(rootDir: string, relativeTsFile: string, outDir: string, npmProjectDirs: string[]) {
  if (!path.isAbsolute(outDir)) {
    throw new Error(`outDir must be absoulte (${outDir})`);
  }
  if (path.isAbsolute(relativeTsFile)) {
    throw new Error('File to compile cannot be absolute');
  }

  if (relativeTsFile.startsWith('.')) {
    throw new Error('File to compile cannot start with a dot');
  }

  const tsFile = path.resolve(rootDir, relativeTsFile);
  const deps = DepsCollector.scanFrom(tsFile);

  const npmPackageResolver = new NpmPackageResolver(npmProjectDirs);
  deps.npmDeps
    .filter(d => shouldBeIncluded(d))
    .forEach(d => npmPackageResolver.recordUsage(d));
  const map = npmPackageResolver.complete();
  console.log("packages=\n" + JSON.stringify(map, null, 2));

  const zipBuilder = new ZipBuilder();
  Object.keys(map).forEach(k => {
    const usage: Usage = map[k];
    zipBuilder.scan(`node_modules/${usage.packageName}`, usage.dir);
  });

  const command = `tsc --outDir "${outDir}" --preserveConstEnums --strictNullChecks --sourceMap --target es2015 --module commonjs --allowJs --checkJs false --lib es2015 --rootDir "${rootDir}" "${tsFile}"`
  console.log('Executing: ', command);
  child_process.execSync(command);

  zipBuilder.scan('build', outDir);

  zipBuilder.populateZip();
  zipBuilder.dump('/tmp/abcd.zip');

}

function shouldBeIncluded(packageName: string) {
  return packageName !== 'aws-sdk';
}


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
      const atom = new DeployableAtom(pathInJar, fs.readFileSync(absolutePath, 'utf-8'));
      this.fragment.add(atom);
    }
  }

  populateZip() {
    this.fragment.forEach((curr: DeployableAtom) => {
      this.zip.file(curr.path, curr.content);
    });
  }

  dump(outputFile: string) {
    this.zip.generateAsync({ type: "nodebuffer", compression: "DEFLATE", compressionOptions: { level: 0 } }).then(buf => {
      fs.writeFileSync(outputFile, buf);
      console.log('-written-')
    });
  }
}


const rootDir = '/home/me/code/abc';
const tsFile = 'p1/p2/handler.ts';

const workingDir = path.resolve(os.tmpdir(), "packager-" + uuidv1());
fs.mkdirSync(workingDir);
const outDir = path.resolve(workingDir, 'build');

compile(rootDir, tsFile, outDir, ['/home/me/code/abc/p1/p2']);
