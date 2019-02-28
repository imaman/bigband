export class DepGraph {

    private readonly nodeByName = new Map<string, DepNode>();

    addDep(from: string, to: string) {
        const fromNode = this.getNode(from);
        const toNode = this.getNode(to);
        fromNode.add(toNode);
    }

    getNode(name: string): DepNode {
        let ret = this.nodeByName.get(name);
        if (ret) {
            return ret;
        }

        ret = new DepNode(name);
        this.nodeByName.set(name, ret);
        return ret;
    }
}

class DepNode {
    private readonly children: DepNode[] = [];
    constructor(public readonly name: string) {
        if (!name) {
            throw new Error('Name cannot be falsy');
        }
    }

    add(child: DepNode) {
        this.children.push(child);
    }

    dfs() {
        const visited = new Set<DepNode>();
        
        function run(node: DepNode) {
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