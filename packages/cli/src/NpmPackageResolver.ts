import * as path from 'path';
import * as fs from 'fs';
import * as semver from 'semver';
import {logger} from './logger';
import { DepGraph, DepNode } from './DepGraph';
import { Spawner } from './Spawner';

export interface Usage {
    packageName: string
    version: string,
    dir: string
}

interface NodeData {
    dir: string
    version: string
}

export class NpmPackageResolver {

    private readonly graph = new DepGraph<NodeData>();
    private readonly usages: Usage[] = [];

    constructor(private readonly roots: string[], private readonly filter: (s: string) => boolean) {
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

        const node = this.graph.addDepToNode(parent, name);
        
        const existing: NodeData|null = node.data;
        const record: NodeData = {dir: pojo.path, version: pojo.version };
        logger.silly(`#dep_record# ${name} (dep of "${parent.name}"): ${JSON.stringify(record)}`);
        if (existing) {
            record.dir = record.dir || existing.dir;
        }

        node.data = record;
        return node;
    }

    private scanDeps(pojo, parent: DepNode<NodeData>) {
        if (!pojo) {
            return
        }
        
        if (pojo.missing && pojo.name !== 'bigband-lambda') {
            debugger;
            return;
        }          

        const node = this.createNode(pojo, parent);

        // pojo.dependencies - prod dependencies.
        // pojo.devDependencies - dev dependencies. 
        // We scan only the former.
        const prodDependencies = pojo.dependencies || {};
        for (const depName in prodDependencies) {
            const curr = prodDependencies[depName];
            if (!curr) {
                throw new Error(`Null entry for ${depName}`);
            }

            if (depName === 'execa') {
                debugger
            }

            this.scanDeps(curr, node);
        }
    }

    async prepopulate() {
        const command = 'npm ls --long --json';
        for (const r of this.roots) {
            // TODO(imaman): generate friendlier output on errors

            const execution = await Spawner.exec('npm', ['ls', '--long', '--json'], r)
            const npmLsPojo = JSON.parse(execution.stdout);
            if (!npmLsPojo.name || !npmLsPojo.version) {
                throw new Error(`Failure from ${execution.commandLine}: Exit code=${execution.exitCode}, stdout=\n${execution.stdout}`);
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
        const nodes = startNode.dfs(n => this.filter(n.name))
        for (const curr of nodes) {
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
        for (const u of this.usages) {
            const preexisting = usageByPackageName[u.packageName];
            if (!preexisting) {
                usageByPackageName[u.packageName] = u;
                continue;
            }

            logger.silly(`Comparing ${u.packageName}: ${u.version} with ${preexisting.version}`);
            if (semver.gt(u.version, preexisting.version)) {
                usageByPackageName[u.packageName] = u;
            }
        }

        return usageByPackageName;
    }
}


