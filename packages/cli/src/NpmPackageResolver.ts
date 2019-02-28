import * as path from 'path';
import * as fs from 'fs';
import * as semver from 'semver';
import * as child_process from 'child_process'
import {logger} from './logger';

export interface Usage {
    packageName: string
    version: string,
    dir: string
}

interface DepRecord {
    dir: string,
    dependencies: string[]
    version: string
}

export class NpmPackageResolver {

    private readonly usages: Usage[] = [];
    // TODO(imaman): use Map<,>
    private readonly depRecordByPackageName: any = {};

    constructor(private readonly roots: string[], private readonly filter: (string) => boolean) {
        const relatives = roots.filter(r => !path.isAbsolute(r));        
        if (relatives.length) {
            throw new Error(`Roots must be absolute but found some which are not:\n${relatives.join('\n')}`);
        }
    }

    private saveDepRecord(depName: string, pojo: any) {
        const record: DepRecord = {dir: pojo.path, dependencies: Object.keys(pojo.dependencies || {}), version: pojo.version };
        this.depRecordByPackageName[depName] = record;
    }

    private store(outerPojo, root) {
        if (!outerPojo) {
            return;
        }          

        const dependencies = outerPojo.dependencies || {};
        Object.keys(dependencies).forEach(depName => {
            const innerPojo = dependencies[depName];
            if (!innerPojo) {
                throw new Error(`Null entry for ${depName}`);
            }

            if (innerPojo._development) {
                return;
            }
            const existing = this.depRecordByPackageName[depName];
            if (!existing || innerPojo.dependencies) {
                this.saveDepRecord(depName, innerPojo);
            }
            this.store(innerPojo, root);
        })
    }

    async prepopulate() {
        const command = 'npm ls --long --json';
        for (const r of this.roots) {
            // TODO(imaman): better output on errors.
            const execution = await new Promise<{err, stdout, stderr}>(resolve => 
                child_process.exec(command, {cwd: r, maxBuffer: 20 * 1024 * 1024 }, 
                    (err, stdout, stderr) => resolve({err, stdout, stderr})));
            const npmLsPojo = JSON.parse(execution.stdout);
            if (!npmLsPojo.name || !npmLsPojo.version) {
                throw new Error(`Running ${command} in ${r} resulted in a failure:\n${execution.stdout}\n${execution.err}}`);
            }
            this.saveDepRecord(npmLsPojo.name, npmLsPojo);
            this.store(npmLsPojo, r);
        }
    }

    recordUsage(packageName) {
        while (true) {
            const temp = path.dirname(packageName);
            if (temp == '.') {
                break;
            }
            packageName = temp;
        }

        const traverse = (packageName: string) => {
            if (!this.filter(packageName)) {
                return;
            }

            const depRecord: DepRecord = this.depRecordByPackageName[packageName];
            if (!depRecord) {
                throw new Error(`Arrived at an uninstalled package: "${packageName}".`);
            }

            if (!fs.existsSync(depRecord.dir)) {
                throw new Error(`Directory ${depRecord.dir}, for package ${packageName}, does not exist (${JSON.stringify(depRecord)})`);
            }
            this.usages.push({packageName, version: depRecord.version, dir: depRecord.dir});

            const deps = depRecord.dependencies || [];
            for (const curr of deps) {
                traverse(curr);
            }
        }

        traverse(packageName);
    }

    compute(): {[s: string]: Usage} {
        const usageByPackageName: {[s: string]: Usage} = {};
        this.usages.forEach(u => {
            const preexisting = usageByPackageName[u.packageName];
            if (!preexisting) {
                usageByPackageName[u.packageName] = u;
                return;
            }

            logger.silly(`Comparing ${u.packageName}: ${u.version} with ${preexisting.version}`);
            if (semver.gt(u.version, preexisting.version)) {
                usageByPackageName[u.packageName] = u;
            }
        })

        return usageByPackageName;
    }
}

