import * as JSZip from 'jszip';
import * as child_process from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import * as uuidv1 from 'uuid/v1';
import * as os from 'os';
import * as mkdirp from 'mkdirp'

import {logger} from './logger';
import {AwsFactory} from './AwsFactory';
import { DepsCollector } from './DepsCollector'
import { NpmPackageResolver, Usage } from './NpmPackageResolver'
import { DeployableFragment, DeployableAtom, Rig } from './runtime/Instrument';

export class Packager {
  private readonly workingDir: string;
  private workingDirCreated = false;
  private readonly npmPackageDir;

  constructor(private readonly rootDir: string, npmPackageDir: string, private readonly s3Bucket: string,
      private readonly s3Prefix: string, private readonly rig?: Rig) {
    if (s3Prefix.endsWith('/')) {
      throw new Error(`s3Prefix ${s3Prefix} cannot have a trailing slash`)
    }
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
    const fileToCompile = this.toAbs(relatvieTsFile);

    logger.silly(`Compiling ${fileToCompile}`);
    const command = `tsc --outDir "${outDir}" --preserveConstEnums --strictNullChecks --sourceMap --target es2015 --module commonjs --allowJs --checkJs false --lib es2015 --rootDir "${this.rootDir}" "${fileToCompile}"`
    logger.silly(`Executing: ${command}`);
    child_process.execSync(command, {encoding: 'utf-8'});
    return outDir;
  }
  
  createZip(relativeTsFile: string, compiledFilesDir: string, runtimeDir?: string) {
    const absoluteTsFile = this.toAbs(relativeTsFile);
    logger.silly('Packing dependencies of ' + absoluteTsFile);

    const deps = DepsCollector.scanFrom(absoluteTsFile);
    const npmPackageResolver = new NpmPackageResolver([this.npmPackageDir], runtimeDir);
    deps.npmDeps
      .filter(d => shouldBeIncluded(d))
      .forEach(d => npmPackageResolver.recordUsage(d));
    const usageByPackageName = npmPackageResolver.compute();
  
    const zipBuilder = new ZipBuilder();
    Object.keys(usageByPackageName).forEach(k => {
      const usage: Usage = usageByPackageName[k];
      zipBuilder.scan(`node_modules/${usage.packageName}`, usage.dir);
    });
  
    zipBuilder.scan('build', compiledFilesDir);
    return zipBuilder;
  }

  run(relativeTsFile: string, relativeOutDir: string, runtimeDir?: string) {
    logger.silly(`Packing ${relativeTsFile} into ${relativeOutDir}`);
    const compiledFilesDir = this.compile(relativeTsFile, relativeOutDir);
    return this.createZip(relativeTsFile, compiledFilesDir, runtimeDir);
  }

  unzip(zipBuilder: ZipBuilder, relativeOutDir: string) {
    zipBuilder.populateZip();
    const outDir = this.newOutDir(relativeOutDir);
    zipBuilder.unzip(outDir);
    return outDir;
  }

  async pushToS3(s3Object: string, zipBuilder: ZipBuilder): Promise<S3Ref> {      
    if (!this.rig) {
      throw new Error('rig was not set.');
    }
    zipBuilder.populateZip();
    const buf = await zipBuilder.toBuffer();

    const s3Key = `${this.s3Prefix}/${s3Object}`;
    const factory = AwsFactory.fromRig(this.rig)
    const s3 = factory.newS3();

    try {
      await s3.putObject({
        Bucket: this.s3Bucket,
        Key: s3Key,
        Body: buf,
        ContentType: "application/zip"
      }).promise();
    } catch (e) {
      console.log(`S3 putObject error. Profile: ${factory.profileName}, Region: ${factory.region}, Bucket:${this.s3Bucket}, Key:${s3Key}`);
      throw e;
    }
  
    logger.silly(`Size: ${buf.byteLength} bytes`);
    return new S3Ref(this.s3Bucket, s3Key);
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

export class S3Ref {
  constructor(public readonly s3Bucket, public readonly s3Key) {}

  static EMPTY = new S3Ref("", "");

  isOk() {
    return Boolean(this.s3Bucket) && Boolean(this.s3Key);
  }

  toUri() {
    return `s3://${this.s3Bucket}/${this.s3Key}`
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
      const content = fs.readFileSync(absolutePath, 'utf-8');
      const atom = new DeployableAtom(pathInJar, content);
      this.fragment.add(atom);
    }
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
    this.fragment.forEach((curr: DeployableAtom) => {
      this.zip.file(curr.path, curr.content);
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
