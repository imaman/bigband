import { LogSamplerStoreRequest } from "./logSamplerController";


interface Node<T> {
    value: T|null
    prev: Node<T>|null
    next: Node<T>|null
}

function newNode<T>(data: T|null): Node<T> {
    return {prev: null, value: data, next: null};
}

function attach<T>(lhs: Node<T>|null, rhs: Node<T>|null) {
    if (!lhs || !rhs) {
        throw new Error('bad arguments');
    }
    lhs.next = rhs;
    rhs.prev = lhs;
}


class LinkedList<T> {
    private readonly head = newNode<T>(null);
    private readonly tail = newNode<T>(null);
    private count = 0;

    constructor() {
        attach(this.head, this.tail);
    }

    get size() {
        return this.count;
    }

    pushHead(data: T): Node<T> {
        if (!data) {
            throw new Error('cannot insert falsy data');
        }
        const n = newNode(data);
        attach(n, this.head.next);
        attach(this.head, n);
        this.count += 1;
        
        return n;
    }

    remove(n: Node<T>) {
        if (!n.next || !n.prev) {
            throw new Error('bad node');
        }

        attach(n.prev, n.next);
        n.prev = null;
        n.next = null;
        this.count -= 1;
    }

    removeTail(): T {
        const ret = this.tail.prev;
        if (ret === this.head) {
            throw new Error('Empty!');
        }

        if (!ret) {
            throw new Error('ret is falsy');
        }

        this.remove(ret);
        return ret.value as T;
    }
}


export interface Item {
    key: string
    logData: any
}

export class LogSamplerModel {
    private readonly map = new Map<string, Node<LogSamplerStoreRequest>>(); 
    private readonly fifo = new LinkedList<LogSamplerStoreRequest>();
    constructor(private readonly limit: number) {}

    get size() {
        return this.fifo.size;
    }
 
    store(request: Item) {
        if (!request.key) {
            throw new Error('key cannot be falsy');
        }

        if (request.logData === undefined) {
            throw new Error('data cannot be undefined');
        }

        const node = this.map.get(request.key);
        if (node) {
            this.fifo.remove(node);
        }
        while (this.fifo.size >= this.limit) {
            const dropMe = this.fifo.removeTail();
            if (!dropMe) {
                throw new Error('dropMe is falsy');
            }
            this.map.delete(dropMe.key);
        }

        const newNode = this.fifo.pushHead(request);
        this.map.set(request.key, newNode);
    }

    fetch(key: string) {
        const item = this.map.get(key);
        if (!item) {
            return undefined;
        }

        if (!item.value) {
            throw new Error('item.data should not be null');
        }
        return item.value.data;
    }
}
