import * as path from 'path';
import * as fs from 'fs';
import * as semver from 'semver';
import * as child_process from 'child_process'
import {logger} from './logger';
import { DepGraph, DepNode } from './DepGraph';

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

        const node = this.graph.addDepToNode(parent, name);
        
        const existing: NodeData|null = node.data;
        const record: NodeData = {dir: pojo.path, version: pojo.version };
        // logger.silly(`#dep_record# ${name} (dep of "${parent.name}"): ${JSON.stringify(record)}`);
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

        // pojo.dependencies - prod dependencies.
        // pojo.devDependencies - dev dependencies. 
        // We scan only the former.
        const prodDependencies = pojo.dependencies || {};
        for (const depName in prodDependencies) {
            const curr = prodDependencies[depName];
            if (!curr) {
                throw new Error(`Null entry for ${depName}`);
            }

            this.scanDeps(curr, node);
        }
    }

    async prepopulate() {
        const command = 'npm ls --long --json';
        for (const r of this.roots) {
            // TODO(imaman): better output on errors

            const execution = await exec('npm', ['ls', '--long', '--json'], r)
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


function wait(millis: number) {
    return new Promise(resolve => setTimeout(resolve, millis));
}


class BoundedString {
    private readonly arr: string[] = []

    constructor(private name: string, private limit: number, private readonly reject: (_: Error) => void) {}

    push(obj: object) {
        try {
            const s = obj.toString()
            const newLimit = this.limit - s.length
            if (newLimit < 0) {
                throw new Error(`Buffer (${this.name}) exhausted`)
            }
            this.arr.push(s)    
        } catch (e) {
            this.reject(e)            
        }
    }

    get value(): string {
        return this.arr.join('')
    }
}

interface Execution {
    commandLine: string
    stdout: string
    stderr: string
    exitCode: any
}

function exec(command: string, args: string[], cwd: string): Promise<Execution> {
    const commandLine = `${cwd}$ ${command} ${args.join(' ')}`
    return new Promise<Execution>((resolve, reject) => {
        wait(10000).then(() => reject(new Error(
            'Timedout while waiting for the following command to complete:\n' + commandLine)))

        const stderr = new BoundedString("stderr", 1024 * 1024 * 50, reject)
        const stdout = new BoundedString("stdout", 1024 * 1024 * 50, reject)

        const child = child_process.spawn(command, args, {cwd})
        child.on('exit', code => {
            logger.silly(`Command <${commandLine}> exited with ${code}`)
            resolve({commandLine, stdout: stdout.value, stderr: stderr.value, exitCode: code})
        })

        child.stderr.on('data', data => stderr.push(data))
        child.stdout.on('data', data => stdout.push(data))

            // (err, stdout, stderr) => resolve({err, stdout, stderr}))
    })
}