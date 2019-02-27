import * as util from 'util';
import * as child_process from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import * as uuidv1 from 'uuid/v1';
import * as os from 'os';

import { logger } from './logger';
import { AwsFactory } from './AwsFactory';
import { DepsCollector } from './DepsCollector'
import { NpmPackageResolver } from './NpmPackageResolver'
import { Instrument, Rig, SourceExporter } from 'bigband-core';
import { GetFunctionResponse, InvocationRequest, InvocationResponse } from 'aws-sdk/clients/lambda';
import { Teleporter, S3BlobPool } from './Teleporter';
import { S3Ref } from './S3Ref';
import { ZipBuilder } from './ZipBuilder';
import { Misc } from './Misc';
import { CONTRIVED_NPM_PACAKGE_NAME, CONTRIVED_IN_FILE_NAME, CONTRIVED_OUT_FILE_NAME } from './scotty'

export interface PushResult {
  deployableLocation: S3Ref
  wasPushed: boolean
}

export class Packager {
  private readonly workingDir: string;
  private workingDirCreated = false;
  private readonly npmPackageDir;

  constructor(private readonly rootDir: string, npmPackageDir: string, private readonly s3Bucket: string,
      private readonly s3Prefix: string, private readonly rig?: Rig, private readonly blobPool?: S3BlobPool) {
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
    const command = `tsc --outDir "${outDir}" --preserveConstEnums --strictNullChecks --sourceMap --target es2015 --module commonjs --allowJs --checkJs false --lib es2015,dom --rootDir "${this.rootDir}" "${fileToCompile}"`
    logger.silly(`Executing: ${command}`);

    // TODO(imaman): better output on error.
    await util.promisify(child_process.exec)(command, {encoding: 'utf-8'});
    return outDir;
  }
  
  private async createZip(relativeTsFile: string, npmPackageName: string) {
    const absoluteTsFile = this.toAbs(relativeTsFile);
    logger.silly('Packing dependencies of ' + absoluteTsFile);

    const npmPackageResolver = new NpmPackageResolver([this.npmPackageDir, Misc.bigbandPackageDir()], shouldBeIncluded);
    await npmPackageResolver.prepopulate();

    const isScotty = absoluteTsFile === '/home/imaman/code/bigband/packages/cli/lib/scotty';
    if (isScotty) {
      debugger;
    }

    if (isScotty) {
      npmPackageResolver.recordUsage('jszip');
      npmPackageResolver.recordUsage('mkdirp');
      npmPackageResolver.recordUsage('hash.js');
      console.log('isscotty added hardcoded deps');
      // import { DeployableFragment, DeployableAtom } from 'bigband-core';
    }
    else if (npmPackageName) {
      npmPackageResolver.recordUsage(npmPackageName);
    } else {
      const deps = DepsCollector.scanFrom(absoluteTsFile);
      deps.npmDeps.forEach(d => npmPackageResolver.recordUsage(d));  
    } 
    const usageByPackageName = npmPackageResolver.compute();  
    logger.silly('usageByPackageName of ' + relativeTsFile + '\n' + JSON.stringify(usageByPackageName, null, 2));
    /*
      2019-02-27T11:47:02.314Z [main] silly: usageByPackageName of src/chronology/compute
      {
        "moment": {
          "packageName": "moment",
          "version": "2.24.0",
          "dir": "/home/imaman/code/bigband/packages/example/node_modules/moment"
        }
      }
      2019-02-27T11:47:03.202Z [main] silly: Comparing fingerprints for chronology-importantDates:
        ksmZqMaAWa12l5efP72K8Sa5cDbzUEmL4WG+l+6JdBQ=
        xMDkYKmyJnehORVbWqPM3Rd89BMQ9Mtlv0/AnqJcw1c=
      2019-02-27T11:47:03.724Z [main] silly: usageByPackageName of src/geography/analyzer
      {
        "byline": {
          "packageName": "byline",
          "version": "5.0.0",
          "dir": "/home/imaman/code/bigband/packages/example/node_modules/byline"
        }
      }
      2019-02-27T11:47:03.730Z [main] silly: usageByPackageName of src/geography/healthChecker
      {}
      2019-02-27T11:47:03.833Z [main] silly: usageByPackageName of src/geography/compute
      {
        "byline": {
          "packageName": "byline",
          "version": "5.0.0",
          "dir": "/home/imaman/code/bigband/packages/example/node_modules/byline"
        },
        "fast-levenshtein": {
          "packageName": "fast-levenshtein",
          "version": "2.0.6",
          "dir": "/home/imaman/code/bigband/packages/example/node_modules/fast-levenshtein"
        }
      }
    */

   if (isScotty) {
    console.log('scotty deps=' + JSON.stringify(usageByPackageName, null, 2));
    // process.exit(-1);
  }

    const zipBuilder = new ZipBuilder();
    const nodeModulesFragment = zipBuilder.newFragment();
    for (const k in usageByPackageName) {
      const usage = usageByPackageName[k];
      nodeModulesFragment.scan(`node_modules/${usage.packageName}`, usage.dir);
    }


    return zipBuilder;
  }

  public async run(relativeTsFile: string, relativeOutDir: string, npmPackageName: string) {
    logger.silly(`Packing ${relativeTsFile} into ${relativeOutDir}`);

    const compiledFilesDir = npmPackageName ? '' : await this.compile(relativeTsFile, relativeOutDir);
    const zipBuilder = await this.createZip(relativeTsFile, npmPackageName);  
    if (compiledFilesDir.length) {
      zipBuilder.newFragment().scan('build', compiledFilesDir);
    } 

    console.log('relativetsfile=' + relativeTsFile);
    // Special treatment for scotty.
    if (relativeTsFile === CONTRIVED_IN_FILE_NAME) {
      console.log('this-is-scotty!!!');
      const frag = zipBuilder.newFragment();
      frag.addText('node_modules/bigband-core/index.js', SourceExporter.exportBigbandCoreSourceCode('DeployableFragment.js'));
      frag.addText(`node_modules/${CONTRIVED_NPM_PACAKGE_NAME}/${CONTRIVED_OUT_FILE_NAME}`, fs.readFileSync(path.resolve(__dirname, 'scotty.js'), 'utf-8'));
      frag.addText(`node_modules/${CONTRIVED_NPM_PACAKGE_NAME}/ZipBuilder.js`, fs.readFileSync(path.resolve(__dirname, 'ZipBuilder.js'), 'utf-8'));
      // SourceExporter.exportBigbandCoreSourceCode('DeployableFragment.js'));
      // console.log('contents of scotty\'s zipbuilder:');
      // zipBuilder.forEach(a => console.log('   ' + a.path));
      await zipBuilder.unzip('/tmp/xx/yy');
      console.log('zip saved to /tmp/xx/yy_');
    }
    
    return zipBuilder;
  }

  public unzip(zipBuilder: ZipBuilder, relativeOutDir: string) {
    const outDir = this.newOutDir(relativeOutDir);
    zipBuilder.unzip(outDir);
    return outDir;
  }

  public async pushToS3(instrument: Instrument, s3Object: string, zipBuilder: ZipBuilder, scottyLambdaName: string): Promise<PushResult> {      
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

    const ret: PushResult = {
      deployableLocation: new S3Ref(this.s3Bucket, s3Key),
      wasPushed: true
    };

    const deployableLocation = ret.deployableLocation;
    logger.silly(`Comparing fingerprints for ${instrument.fullyQualifiedName()}:\n  ${c}\n  ${fingeprint}`);
    if (c && c == fingeprint) {
      logger.info(`No code changes in ${instrument.fullyQualifiedName()}`);
      ret.wasPushed = false;
      return ret;
    }

    if (!this.blobPool) {
      throw new Error('a blob pool was not specified');
    }
    const teleporter = new Teleporter(this.blobPool);
    const handlePojos = (await teleporter.teleport(zipBuilder)).map(curr => curr.toPojo()); 

    const teleportRequest = {
      deployables: handlePojos,
      destination: deployableLocation.toPojo()
    }

    // await teleporter.fakeTeleport(zipBuilder, ret, instrument.physicalName(this.rig));
    // return ret;
    
    const invocationRequest: InvocationRequest = {
      FunctionName: scottyLambdaName,
      InvocationType: 'RequestResponse', 
      Payload: JSON.stringify({teleportRequest})
    };
    

    try {
      const invocationResponse: InvocationResponse = await factory.newLambda().invoke(invocationRequest).promise();
      if (!invocationResponse.FunctionError) {
        console.log(`Teleported ${formatBytes(teleporter.bytesSent)} for ${instrument.fullyQualifiedName()}`);
        return ret;
      }

      logger.silly('scotty returned an error:\n' + JSON.stringify(invocationResponse));
      throw new Error(`Teleporting of ${instrument.physicalName(this.rig)} failed: ${invocationResponse.FunctionError}`);
    } catch (e) {
      logger.silly('Teleporting error', e);
    }

    const numBytes = await teleporter.nonIncrementalTeleport(zipBuilder, deployableLocation, instrument.physicalName(this.rig));
    console.log(`Non incremental teleporting of ${formatBytes(numBytes)} for ${instrument.fullyQualifiedName()}`);
    
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
  return packageName !== 'aws-sdk' && !packageName.startsWith('aws-sdk/') && packageName !== CONTRIVED_NPM_PACAKGE_NAME;
}

function formatBytes(n: number) {
  return `${(n / (1024 * 1024)).toFixed(3)}MB`
}
