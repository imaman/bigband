import * as path from 'path';
import * as fs from 'fs';
import * as semver from 'semver';
import * as child_process from 'child_process'
import {logger} from './logger';
import { DepGraph, DepNode } from './DepGraph';


const LABEL_DEV = 'DEV';
const LABEL_PROD = 'PROD';

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

interface NodeData {
    dir: string
    version: string
}

export class NpmPackageResolver {

    private readonly graph = new DepGraph<NodeData>();

    private readonly usages: Usage[] = [];
    // TODO(imaman): use Map<,>
    private readonly depRecordByPackageName: any = {};

    constructor(private readonly roots: string[], private readonly filter: (string) => boolean) {
        const relatives = roots.filter(r => !path.isAbsolute(r));        
        if (relatives.length) {
            throw new Error(`Roots must be absolute but found some which are not:\n${relatives.join('\n')}`);
        }
    }

    private createNode(pojo: any, parent: DepNode<NodeData>) {
        const name: string = pojo.name;
        if (!name) {
            throw new Error('Found a nameless package');
        }

        if (name === 'jszip') {
            console.log('pojo=' + JSON.stringify(pojo, null, 2));
        }
        const node = this.graph.addDepToNode(parent, name, pojo._development ? LABEL_DEV: LABEL_PROD);
        
        const existing: NodeData|null = node.data;
        const record: NodeData = {dir: pojo.path, version: pojo.version };
        logger.silly(`#dep_record# ${name} (parent: ${parent.name}): ${JSON.stringify(record)}`);
        if (existing) {
            record.dir = record.dir || existing.dir;
        }

        node.data = record;
        return node;
    }

    private scanDeps(pojo, parent: DepNode<NodeData>) {
        if (!pojo || pojo.missing) {
            return;
        }          

        const node = this.createNode(pojo, parent);

        const dependencies = pojo.dependencies || {};
        for (const depName in dependencies) {
            const curr = dependencies[depName];
            if (!curr) {
                throw new Error(`Null entry for ${depName}`);
            }

            this.scanDeps(curr, node);
        }
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
            this.scanDeps(npmLsPojo, this.graph.rootNode);
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

        const startNode = this.graph.getNode(packageName);
        const nodes = startNode.dfs();
        for (const curr of nodes) {
            if (!this.filter(curr.name)) {
                return;
            }

            const depRecord: NodeData|null = curr.data;
            if (!depRecord) {
                throw new Error(`Arrived at a node with no data: "${curr.name}".`);
            }

            if (!fs.existsSync(depRecord.dir)) {
                throw new Error(`Package "${curr.name}" specifies a non-existing directory (${depRecord.dir})`);
            }
            this.usages.push({packageName: curr.name, version: depRecord.version, dir: depRecord.dir});
        }
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

