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

    /**
     * during development we want to run this code on samples without actually having bigband installed
     * at the node_modules/ directory. To achieve that we provide the injectedBigbandDir shim:
     * it specifies a directory from which bigband files can be obtained, thus bypassing the standard discovery
     * mechanism which is based on 'npm ls --json'.
     * 
     * @param roots 
     * @param injectedBigbandDir 
     */
    constructor(private readonly roots: string[], private readonly filter: (string) => boolean, private readonly injectedBigbandDir?: string) {
        if (injectedBigbandDir && !path.isAbsolute(injectedBigbandDir)) {
            throw new Error(`injectedBigbandDir (${injectedBigbandDir}) is not an absolute path`);
        }
        const relatives = roots.filter(r => !path.isAbsolute(r));        
        if (relatives.length) {
            throw new Error(`Roots must be absolute but found some which are not:\n${relatives.join('\n')}`);
        }

        const store = (outerPojo, root) => {
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
                    createDepRecord(depName, root, innerPojo);
                }
                store(innerPojo, root);
            })
        }

        const createDepRecord = (depName: string, root: string, pojo: any) => {
            this.depsByPackageName[depName] = {root, dependencies: pojo.dependencies, version: pojo.version };
        }

        this.roots.forEach(r => {
            // TODO(imaman): better output on errors.
            const npmLsPojo = JSON.parse(child_process.execSync('npm ls --json', {cwd: r}).toString('utf-8'));
            createDepRecord(npmLsPojo.name, r, npmLsPojo);
            store(npmLsPojo, r);
        });
    }

    recordUsage(packageName) {
        if (!this.filter(packageName)) {
            return;
        }
        while (true) {
            const temp = path.dirname(packageName);
            if (temp == '.') {
                break;
            }
            packageName = temp;
        }

        const traverse = (packageName: string) => {
            const obj = this.depsByPackageName[packageName];
            if (!obj) {
                throw new Error(`Arrived at an uninstalled package: "${packageName}".`);
            }

            const dir = path.join(obj.root, 'node_modules', packageName);            
            if (!fs.existsSync(dir)) {
                throw new Error(`Directory ${dir} does not exist`);
            }
            this.usages.push({packageName, version: obj.version, dir});

            const deps = obj.dependencies || {};
            for (const k of Object.keys(deps)) {
                traverse(k);
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

