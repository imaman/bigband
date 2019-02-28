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

export class NpmPackageResolver {

    private readonly usages: Usage[] = [];
    // TODO(imaman): use Map<,>
    private readonly depsByPackageName: any = {};

    constructor(private readonly roots: string[], private readonly filter: (string) => boolean) {
        const relatives = roots.filter(r => !path.isAbsolute(r));        
        if (relatives.length) {
            throw new Error(`Roots must be absolute but found some which are not:\n${relatives.join('\n')}`);
        }
    }

    private createDepRecord(depName: string, root: string, pojo: any) {
        this.depsByPackageName[depName] = {root: pojo.path, dependencies: Object.keys(pojo.dependencies), version: pojo.version };
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
            const existing = this.depsByPackageName[depName];
            if (!existing || innerPojo.dependencies) {
                this.createDepRecord(depName, root, innerPojo);
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
            this.createDepRecord(npmLsPojo.name, r, npmLsPojo);
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
            console.log('  - packageName=' + packageName);
            if (!this.filter(packageName)) {
                return;
            }

            const obj = this.depsByPackageName[packageName];
            if (!obj) {
                throw new Error(`Arrived at an uninstalled package: "${packageName}".`);
            }

            let dir = obj.root; //path.join(obj.root, 'node_modules', packageName);            
            if (!fs.existsSync(dir)) {
                throw new Error(`Directory ${dir}, for package ${packageName}, does not exist (${JSON.stringify(obj)})`);
            }
            this.usages.push({packageName, version: obj.version, dir});

            const deps = obj.dependencies || [];
            for (const curr of deps) {
                traverse(curr);
            }
        }

        console.log('TRAVERSE starting from ' + packageName);
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

