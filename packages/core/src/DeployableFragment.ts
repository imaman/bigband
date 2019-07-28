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

    addText(path: string, content: string) {
        this.add(new DeployableAtom(path, content));
    }

    forEach(f: (_: DeployableAtom) => void) {
        this.all.forEach(f)
    }

    get all(): DeployableAtom[] {
        this.atoms.sort((lhs, rhs) => lhs.path.localeCompare(rhs.path));
        return [...this.atoms]
    }

    scan(pathInFragment: string, absolutePath: string, approver: (path: string) => boolean = () => true) {
        if (!path.isAbsolute(absolutePath)) {
            throw new Error(`path is not absolute (${absolutePath}).`)
        }
        if (!approver(absolutePath)) {
            return
        }
        if (fs.statSync(absolutePath).isDirectory()) {
            for (const f of fs.readdirSync(absolutePath)) {
                this.scan(path.join(pathInFragment, f), path.join(absolutePath, f), approver);
            }
        } else {
            const content = fs.readFileSync(absolutePath, 'utf-8');
            const atom = new DeployableAtom(pathInFragment, content);
            this.add(atom);
        }
    }    

    toString() {
        return `#Atoms: ${this.atoms.length} -- ${this.atoms.slice(0, 10).join('; ')}...`;
    }
}
