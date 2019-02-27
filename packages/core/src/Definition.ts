export class Definition {
    private readonly obj;

    constructor(obj: any = {}) { 
        this.obj = obj;
    }

    mutate(f: (any) => void) {
        f(this.obj);
    }

    overwrite(o: any) {
        const copy = JSON.parse(JSON.stringify(o));
        Object.assign(this.obj, copy);
    }

    get() {
        return this.obj;
    }
}

