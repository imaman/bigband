export class DepGraph<T> {

    private readonly nodeByName = new Map<string, DepNode<T>>();

    addDep(from: string, to: string) {
        const fromNode = this.getNode(from);
        const toNode = this.getNode(to);
        fromNode.add(toNode);
    }

    getNode(name: string): DepNode<T> {
        let ret = this.nodeByName.get(name);
        if (ret) {
            return ret;
        }

        ret = new DepNode<T>(name);
        this.nodeByName.set(name, ret);
        return ret;
    }
}

class DepNode<T> {
    private readonly children: DepNode[] = [];
    public data: T|null = null;

    constructor(public readonly name: string) {
        if (!name) {
            throw new Error('Name cannot be falsy');
        }
    }

    add(child: DepNode<T>) {
        this.children.push(child);
    }

    dfs() {
        const visited = new Set<DepNode<T>>();
        
        function run(node: DepNode<T>) {
            if (visited.has(node)) {
                return;
            }

            visited.add(node);
            for (const curr of node.children) {
                run(curr);
            }
        }

        run(this);
        return [...visited];
    }
}