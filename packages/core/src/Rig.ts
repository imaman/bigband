import {IsolationScope} from './IsolationScope'

export class Rig {
    constructor(public readonly isolationScope: IsolationScope, 
        public readonly region: string, public readonly name: string) {}    

    physicalName() {
        return `${this.isolationScope.name}-${this.name}`;
    }        
}

