import { logger } from "./logger";

export class DepGraph<T> {

    private readonly nodeByName = new Map<string, DepNode<T>>();
    public readonly rootNode = new DepNode<T>('');

    constructor() {
        this.nodeByName.set(this.rootNode.name, this.rootNode);
    }

    addDep(from: string, to: string) {
        const fromNode = this.getNode(from);
        const toNode = this.getNode(to);
        fromNode.add(toNode);
    }

    addDepToNode(fromNode: DepNode<T>, to: string, label?: string): DepNode<T> {
        const toNode = this.getNode(to);
        fromNode.add(toNode, label);
        return toNode;
    }

    lookup(name: string): DepNode<T>|undefined {
        if (!name) {
            throw new Error('Name cannot be falsy');
        }
        return this.nodeByName.get(name);
    }

    getNode(name: string): DepNode<T> {
        let ret = this.lookup(name)
        if (ret) {
            return ret;
        }

        ret = new DepNode<T>(name);
        this.nodeByName.set(name, ret);
        return ret;
    }
}

interface Edge<T> {
    to: DepNode<T>
    label?: string
}

export class DepNode<T> {
    private readonly edges: Edge<T>[] = [];
    public data: T|null = null;

    constructor(public readonly name: string) {
    }

    add(child: DepNode<T>, label?: string) {
        this.edges.push({to: child, label});
    }

    dfs(approver: (n: DepNode<T>) => boolean = () => true) {
        const visited = new Set<DepNode<T>>();
        
        function run(node: DepNode<T>, depth) {
            if (!approver(node)) {
                return
            }

            if (visited.has(node)) {
                return
            }

            visited.add(node);

            logger.silly('|' + new Array(depth).fill('  ').join('') + node.name)
            for (const curr of node.edges) {
                run(curr.to, depth + 1);
            }
        }

        logger.silly('Starting DFS from ' + (this.name))
        run(this, 0);
        return [...visited];
    }
}