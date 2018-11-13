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
    private readonly npmLsByRoot: any = {};
    private readonly depsByPackageName: any = {};

    /**
     * during development we want to run this code on samples without actually having servicemix installed
     * at the node_modules/ directory. To achieve that we provide the injectedServiceMixDir shim: it specifies
     * it specifies a directory from which servicemix files can be obtained, thus bypassing the standard discovery
     * mechanism which is based on 'npm ls --json'.
     * 
     * @param roots 
     * @param injectedServiceMixDir 
     */
    constructor(private readonly roots: string[], private readonly injectedServiceMixDir?: string) {
        if (injectedServiceMixDir && !path.isAbsolute(injectedServiceMixDir)) {
            throw new Error(`injectedServiceMixDir (${injectedServiceMixDir}) is not an absolute path`);
        }
        const relatives = roots.filter(r => !path.isAbsolute(r));        
        if (relatives.length) {
            throw new Error(`Roots must be absolute but found some which are not:\n${relatives.join('\n')}`);
        }

        const store = (e, root) => {
            if (!e) {
                return;
            }          

            const deps = e['dependencies'] || {};
            Object.keys(deps).forEach(d => {
                const x = deps[d];
                if (!x) {
                    throw new Error(`Null entry for ${d}`);
                }
                const existing = this.depsByPackageName[d];
                if (!existing || x['dependencies']) {
                    this.depsByPackageName[d] = {root, ent: x}
                }
                store(x, root);
            })
        }

        this.roots.forEach(r =>{
            const npmLs = JSON.parse(child_process.execSync('npm ls --json', {cwd: r}).toString('utf-8'));
            this.npmLsByRoot[r] = npmLs;
            store(npmLs, r);
        });
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
            let obj = this.depsByPackageName[packageName];
            if (!obj && (packageName === '@servicemix') && this.injectedServiceMixDir) {
                this.usages.push({packageName, version: "0.0.0", dir: this.injectedServiceMixDir});
                return;
            }
            if (!obj) {
                throw new Error(`Arrived at an uninstalled package: ${packageName}.`);
            }

            const dir = path.join(obj.root, 'node_modules', packageName);
            if (!fs.existsSync(dir)) {
                throw new Error(`Directory ${dir} does not exist`);
            }

            this.usages.push({packageName, version: obj.ent.version, dir});
            const deps = obj.ent['dependencies'] || {};
            Object.keys(deps).forEach(k => traverse(k));
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
