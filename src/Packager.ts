import * as JSZip from 'jszip';
import * as child_process from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import * as uuidv1 from 'uuid/v1';
import * as os from 'os';

import * as AWS from 'aws-sdk';
AWS.config.setPromisesDependency(Promise);
AWS.config.update({ region: 'eu-central-1' });

import { DepsCollector } from './DepsCollector'
import { NpmPackageResolver, Usage } from './NpmPackageResolver'
import { DeployableFragment, DeployableAtom } from './Instrument';

export class Packager {
  private readonly workingDir: string;
  private workingDirCreated = false;
  private readonly npmPackageDir;

  constructor(private readonly rootDir: string, npmPackageDir: string, private readonly s3Bucket: string) {
    if (!path.isAbsolute(npmPackageDir)) {
      throw new Error(`Expected an absolute path but got ${npmPackageDir}.`);
    }
    this.npmPackageDir = path.resolve(npmPackageDir);
    if (this.npmPackageDir.endsWith('node_modules')) {
      throw new Error(`npmPackageDir (${npmPackageDir}) must be the parent of a node_modules directory (i.e., a directory which also has a package.json file).`);
    }
    this.workingDir = path.resolve(os.tmpdir(), "packager-" + uuidv1());
    if (!path.isAbsolute(this.workingDir)) {
      throw new Error(`Assertion failed: workingDir must be absoulte, but it was not (${this.workingDir})`);
    }
  }

  compile(relatvieTsFile: string, relativeOutDir: string) {
    const outDir = this.newOutDir(relativeOutDir);
    const command = `tsc --outDir "${outDir}" --preserveConstEnums --strictNullChecks --sourceMap --target es2015 --module commonjs --allowJs --checkJs false --lib es2015 --rootDir "${this.rootDir}" "${this.toAbs(relatvieTsFile)}"`
    console.log('Executing: ', command);
    child_process.execSync(command);
    return outDir;
  }
  
  createZip(relativeTsFile: string, relativeCompiledFilesDir: string) {
    const deps = DepsCollector.scanFrom(this.toAbs(relativeTsFile));
  
    const npmPackageResolver = new NpmPackageResolver([this.npmPackageDir]);
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
  
    zipBuilder.scan('build', this.toAbs(relativeCompiledFilesDir));
  
    zipBuilder.populateZip();
    return zipBuilder;
  }

  run(relativeTsFile: string) {
    const binDir = this.compile(relativeTsFile, 'build');
    return this.createZip(relativeTsFile, binDir);
  }

  async pushToS3(s3Object: string, zipBuilder: ZipBuilder) {
    const s3 = new AWS.S3();
  
    const buf = await zipBuilder.toBuffer();
    await s3.putObject({
      Bucket: this.s3Bucket,
      Key: s3Object,
      Body: buf,
      ContentType: "application/zip"
    }).promise();
  
    return `s3://${this.s3Bucket}/${s3Object}`;
  }

  private toAbs(relativeFile: string) {
    if (path.isAbsolute(relativeFile)) {
      throw new Error('File to compile cannot be absolute');
    }
  
    if (relativeFile.startsWith('.')) {
      throw new Error('File to compile cannot start with a dot');
    }
    return path.resolve(this.rootDir, relativeFile);
  }

  private newOutDir(name) {
    if (path.dirname(name) !== '.') {
      throw new Error(`name (${name} must be a plain (pathless) name.`);
    }
    const ret = path.resolve(this.workingDir, name);

    if (!this.workingDirCreated) {
      fs.mkdirSync(this.workingDir);
      this.workingDirCreated = true;
    }
    fs.mkdirSync(ret);
    return ret;
  }
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

  async toBuffer(): Promise<Buffer> {
    return this.zip.generateAsync({ type: "nodebuffer", compression: "DEFLATE", compressionOptions: { level: 0 } });
  }

  async dump(outputFile: string) {
    const buf = await this.toBuffer();
    fs.writeFileSync(outputFile, buf);
    console.log('-written-')
  }
}
