import * as fs from 'fs'
import * as path from 'path'

export class DeployableAtom {
    constructor(readonly path: string, readonly content: string) {}

    toString() {
        return `Path: ${this.path}/`;
    }
}

export class DeployableFragment {
    private readonly usedPaths = new Set<string>();
    private readonly atoms: DeployableAtom[] = [];


    add(atom: DeployableAtom): DeployableFragment {
        if (this.usedPaths.has(atom.path)) {
            throw new Error(`Duplicate path: ${atom.path}`);
        }
        this.usedPaths.add(atom.path);
        this.atoms.push(atom);
        return this;
    }

    forEach(f: (_: DeployableAtom) => void) {
        this.atoms.sort((lhs, rhs) => lhs.path.localeCompare(rhs.path));
        this.atoms.forEach(f);
    }

    scan(pathInFragment: string, absolutePath: string) {
        if (!path.isAbsolute(absolutePath)) {
            throw new Error(`path is not absolute (${absolutePath}).`)
        }
        if (fs.statSync(absolutePath).isDirectory()) {
            fs.readdirSync(absolutePath).forEach((f: string) => {
                this.scan(path.join(pathInFragment, f), path.join(absolutePath, f));
            });
        } else {
            try {
                const content = fs.readFileSync(absolutePath, 'utf-8');
                const atom = new DeployableAtom(pathInFragment, content);
                this.add(atom);
            } catch (e) {
                throw new Error(`Scanning failed when trying to read ${absolutePath} (pathInFragment: "${pathInFragment}")`);
            }
        }
    }    

    toString() {
        return `#Atoms: ${this.atoms.length} -- ${this.atoms.slice(0, 10).join('; ')}...`;
    }
}
