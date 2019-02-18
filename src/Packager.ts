import * as util from 'util';
import * as child_process from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import * as uuidv1 from 'uuid/v1';
import * as os from 'os';

import { logger } from './logger';
import { AwsFactory } from './AwsFactory';
import { DepsCollector } from './DepsCollector'
import { NpmPackageResolver, Usage } from './NpmPackageResolver'
import { Instrument, Rig, DeployableAtom, DeployableFragment } from './instruments/Instrument';
import { GetFunctionResponse, InvocationRequest, InvocationResponse } from 'aws-sdk/clients/lambda';
import { Teleporter, S3BlobPool } from './Teleporter';
import { S3Ref } from './S3Ref';
import { ZipBuilder } from './ZipBuilder';

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

  private async compile(relatvieTsFile: string, relativeOutDir: string) {
    const outDir = this.newOutDir(relativeOutDir);
    const fileToCompile = this.toAbs(relatvieTsFile);

    logger.silly(`Compiling ${fileToCompile}`);
    const command = `tsc --outDir "${outDir}" --preserveConstEnums --strictNullChecks --sourceMap --target es2015 --module commonjs --allowJs --checkJs false --lib es2015 --rootDir "${this.rootDir}" "${fileToCompile}"`
    logger.silly(`Executing: ${command}`);

    await util.promisify(child_process.exec)(command, {encoding: 'utf-8'});
    return outDir;
  }
  
  private createZip(relativeTsFile: string, compiledFilesDir: string, runtimeDir?: string) {
    const absoluteTsFile = this.toAbs(relativeTsFile);
    logger.silly('Packing dependencies of ' + absoluteTsFile);

    const deps = DepsCollector.scanFrom(absoluteTsFile);
    const npmPackageResolver = new NpmPackageResolver([this.npmPackageDir], runtimeDir);
    deps.npmDeps
      .filter(d => shouldBeIncluded(d))
      .forEach(d => npmPackageResolver.recordUsage(d));
    const usageByPackageName = npmPackageResolver.compute();
  
    const zipBuilder = new ZipBuilder();
    const nodeModulesFragment = zipBuilder.newFragment();
    Object.keys(usageByPackageName).forEach(k => {
      const usage: Usage = usageByPackageName[k];
      nodeModulesFragment.scan(`node_modules/${usage.packageName}`, usage.dir);
    });
    
    zipBuilder.newFragment().scan('build', compiledFilesDir);
    return zipBuilder;
  }

  public async run(relativeTsFile: string, relativeOutDir: string, runtimeDir?: string) {
    logger.silly(`Packing ${relativeTsFile} into ${relativeOutDir}`);
    const compiledFilesDir = await this.compile(relativeTsFile, relativeOutDir);
    return this.createZip(relativeTsFile, compiledFilesDir, runtimeDir);
  }

  public unzip(zipBuilder: ZipBuilder, relativeOutDir: string) {
    const outDir = this.newOutDir(relativeOutDir);
    zipBuilder.unzip(outDir);
    return outDir;
  }

  public async pushToS3(instrument: Instrument, s3Object: string, zipBuilder: ZipBuilder): Promise<S3Ref> {      
    if (!this.rig) {
      throw new Error('rig was not set.');
    }
    const factory = AwsFactory.fromRig(this.rig);

    const p = factory.newLambda().getFunction({
      FunctionName: instrument.physicalName(this.rig)
    }).promise().catch(e => null);
    const buf = await zipBuilder.toBuffer();
    const fingeprint = ZipBuilder.bufferTo256Fingerprint(buf);
    const getFunctionResponse: GetFunctionResponse|null = await p;
    const c = getFunctionResponse && getFunctionResponse.Configuration && getFunctionResponse.Configuration.CodeSha256;

    const s3Key = `${this.s3Prefix}/${s3Object}`;

    const ret = new S3Ref(this.s3Bucket, s3Key);
    logger.silly(`Comparing fingerprints for ${instrument.fullyQualifiedName()}:\n  ${c}\n  ${fingeprint}`);
    if (c && c == fingeprint) {
      logger.info(`No code changes in ${instrument.fullyQualifiedName()}`);
      return ret;
    }

    const pool = new S3BlobPool(factory, this.s3Bucket, `${this.s3Prefix}/TTL/7d/deployables`);
    const teleporter = new Teleporter(pool);
    const handlePojos = (await teleporter.teleport(zipBuilder)).map(curr => curr.toPojo()); 

    const teleportRequest = {
      deployables: handlePojos,
      destination: ret.toPojo()
    }

    
    const invocationRequest: InvocationRequest = {
      FunctionName: `${this.rig.physicalName()}-bigband-scotty`,
      InvocationType: 'RequestResponse', 
      Payload: JSON.stringify({teleportRequest})
    };
    
    // await teleporter.fakeTeleport(zipBuilder, ret, instrument.physicalName(this.rig));
    // return ret;

    try {
      const invocationResponse: InvocationResponse = await factory.newLambda().invoke(invocationRequest).promise();
      console.log('invocationResponse=' + JSON.stringify(invocationResponse));
    } catch (e) {
      if (e.code !== 'ResourceNotFoundException') {
        logger.error('Teleporting failed: ' + JSON.stringify(teleportRequest));
        throw e;
      }

      throw e;
      // await teleporter.fakeTeleport(zipBuilder, ret, instrument.physicalName(this.rig));
    }
    
    return ret;
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
  return packageName !== 'aws-sdk' && !packageName.startsWith('aws-sdk/');
}
